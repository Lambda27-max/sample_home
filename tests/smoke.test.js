const assert = require('assert');
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf-8');

function expectContains(content, needle, message) {
  assert.ok(
    content.includes(needle),
    `${message} (期待値: "${needle}")`
  );
}

try {
  expectContains(html, '<title>家具配置プランナー</title>', 'タイトル要素が見つかりません');
  expectContains(html, 'id="layout-canvas"', 'キャンバス要素が見つかりません');
  expectContains(html, '<h1>家具配置プランナー</h1>', '画面の見出しが見つかりません');
  console.log('Smoke test (static checks) passed');
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
