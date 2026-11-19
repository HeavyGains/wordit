// Bump the ?v= cache-buster on the page's CSS and JS so phones fetch the new
// files after each release instead of mixing old and new. Also rewrites the
// service worker's VERSION and file list so installed copies update and the
// offline cache matches. Run: npm run bump
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const jsFiles = readdirSync('js').filter((f) => f.endsWith('.js')).sort().map((f) => `js/${f}`);
const files = ['index.html', ...jsFiles];
const v = Date.now().toString(36);
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  const out = s
    .replace(/(href="css\/style\.css)(\?v=[\w]+)?"/g, `$1?v=${v}"`)
    .replace(/(src="js\/app\.js)(\?v=[\w]+)?"/g, `$1?v=${v}"`)
    .replace(/(from '\.\/[\w]+\.js)(\?v=[\w]+)?'/g, `$1?v=${v}'`);
  if (out !== s) writeFileSync(f, out);
}

const icons = readdirSync('icons').filter((f) => f.endsWith('.png')).sort().map((f) => `icons/${f}`);
const assets = ['./', 'index.html', 'manifest.webmanifest', ...icons, `css/style.css?v=${v}`, ...jsFiles.map((f) => `${f}?v=${v}`)];
const sw = readFileSync('sw.js', 'utf8')
  .replace(/const VERSION = '[\w]*';/, `const VERSION = '${v}';`)
  .replace(/const ASSETS = \[.*\];/, `const ASSETS = ${JSON.stringify(assets)};`);
writeFileSync('sw.js', sw);
console.log('version', v);
