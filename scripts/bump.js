// Bump the ?v= cache-buster on the page's CSS and JS so phones fetch the new
// files after each release instead of mixing old and new. Run: npm run bump
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const files = ['index.html', ...readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
const v = Date.now().toString(36);
for (const f of files) {
  const s = readFileSync(f, 'utf8');
  const out = s
    .replace(/(href="css\/style\.css)(\?v=[\w]+)?"/g, `$1?v=${v}"`)
    .replace(/(src="js\/app\.js)(\?v=[\w]+)?"/g, `$1?v=${v}"`)
    .replace(/(from '\.\/[\w]+\.js)(\?v=[\w]+)?'/g, `$1?v=${v}'`);
  if (out !== s) writeFileSync(f, out);
}
console.log('version', v);
