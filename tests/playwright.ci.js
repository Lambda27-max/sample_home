/**
 * CI向けのPlaywrightスモークテスト。
 * ローカル（Codex環境）ではPlaywrightの依存取得が403になるため、
 * npm test は tests/smoke.test.js（標準モジュールのみ）を実行してください。
 *
 * 使い方 (CIなどPlaywrightが利用できる環境):
 *   npm install --save-dev playwright
 *   npm run test:ci
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

let chromium;
try {
  // CIでのみ利用。インストールされていない場合は明示的にエラーを出す。
  ({ chromium } = require('playwright'));
} catch (error) {
  console.error('Playwright (chromium) が見つかりません。CIで実行する際は `npm install --save-dev playwright` を先に行ってください。');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const PORT = 8080;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function createServer(root, port) {
  const server = http.createServer((req, res) => {
    const safePath = decodeURIComponent(req.url.split('?')[0]);
    const requested = safePath === '/' ? '/index.html' : safePath;
    const targetPath = path.normalize(path.join(root, requested));

    if (!targetPath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(targetPath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', getContentType(targetPath));
      fs.createReadStream(targetPath).pipe(res);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function run() {
  let server;
  let browser;

  try {
    server = await createServer(ROOT, PORT);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

    const consoleMessages = [];
    page.on('console', (msg) => consoleMessages.push(`${msg.type()}:${msg.text()}`));
    page.on('pageerror', (err) => consoleMessages.push(`pageerror:${err.message}`));

    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });

    const heading = await page.textContent('header h1');
    assert.strictEqual(heading.trim(), '家具配置プランナー', 'ページタイトルが表示されていません');

    const canvas = await page.$('#layout-canvas');
    assert.ok(canvas, 'キャンバス要素が見つかりません');

    const errors = consoleMessages.filter((msg) => msg.startsWith('error') || msg.startsWith('pageerror'));
    assert.deepStrictEqual(errors, [], `Console errors detected: ${errors.join('; ')}`);

    console.log('Playwright UI smoke test passed');
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
