import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const v = html.match(/js\/app\.js\?v=(\w+)/)[1];

test('service worker version matches the page (run npm run bump)', () => {
  assert.match(sw, new RegExp(`const VERSION = '${v}';`));
});

test('service worker caches every JS file at the current version', () => {
  const assets = JSON.parse(sw.match(/const ASSETS = (\[.*\]);/)[1].replace(/'/g, '"'));
  for (const f of readdirSync('js').filter((f) => f.endsWith('.js'))) {
    assert.ok(assets.includes(`js/${f}?v=${v}`), `missing js/${f}`);
  }
  assert.ok(assets.includes(`css/style.css?v=${v}`));
  for (const a of assets) if (!a.includes('?') && a !== './') assert.ok(existsSync(a), `missing file ${a}`);
});

test('manifest has the icons phones need', () => {
  const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(m.display, 'standalone');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const i of m.icons) assert.ok(existsSync(i.src));
  assert.match(html, /rel="manifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
});
