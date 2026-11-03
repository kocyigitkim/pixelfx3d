// usage: node tools/sheet.mjs out.png img1.png img2.png ...   (glob-expanded by the shell) -> labelled contact sheet
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [out, ...files] = process.argv.slice(2); const cols = Math.min(3, files.length || 1);
const items = files.map((f) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${path.basename(f, '.png')}</figcaption></figure>`).join('');
const html = `<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},480px);gap:2px"><style>figure{margin:0;position:relative}img{width:480px;display:block}figcaption{position:absolute;left:4px;top:2px;font:11px monospace;color:#fff;background:#0008;padding:1px 4px}</style>${items}`;
const b = await chromium.launch({ args: ['--no-sandbox'] }); const pg = await b.newPage({ viewport: { width: cols * 482, height: 300 } });
await pg.setContent(html); await pg.waitForTimeout(300); await pg.screenshot({ path: out, fullPage: true }); await b.close(); console.log('wrote', out);
