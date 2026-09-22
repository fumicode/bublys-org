// 一覧ページ index.html を本物のブラウザで開いて確かめる。
//   node docs/bubble-space-prototype/v3/_check/index-check.mjs
//   - コンソールエラー 0 / ネットワーク要求 0
//   - サムネイル 7枚が実際に描かれている（naturalWidth > 0）
//   - リンクが実在のファイルを指している
//   - 1440×900 で横スクロールが出ない（狭い窓 400×900 でも）
import { openLab, V3, SHOT_DIR } from "./lab.mjs";
import path from "node:path";
import fs from "node:fs";

const FILE = path.join(V3, "index.html");
let ng = 0;
const ok = (cond, msg) => { console.log(`${cond ? "  OK " : "  NG "} ${msg}`); if (!cond) ng++; };

// index.html には __lab は無いので waitLab: false
const lab = await openLab(FILE, { waitLab: false });
const page = lab.page;
await page.waitForTimeout(400);

/* ── 画像 ── */
const imgs = await page.$$eval("img", els => els.map(e => ({
  src: e.getAttribute("src"), nw: e.naturalWidth, nh: e.naturalHeight,
})));
console.log(`\n【サムネイル】 ${imgs.length} 枚`);
ok(imgs.length === 7, `img が 7 枚（実際 ${imgs.length}）`);
for (const im of imgs) ok(im.nw > 0 && im.nh > 0, `描けている ${im.src}（${im.nw}×${im.nh}）`);
const want = ["00-core","01-snap-is-parent","02-lens-per-axis","03-pack-or-equal",
              "04-ops-follow-axes","05-kinmuhyo","06-layout-apart"];
for (const w of want) ok(imgs.some(i => i.src === `thumbs/${w}.jpg`), `thumbs/${w}.jpg を指している`);

/* ── リンク ── */
const hrefs = await page.$$eval("a[href]", els => els.map(e => e.getAttribute("href")));
const protoLinks = hrefs.filter(h => /^0\d.*\.html$/.test(h));
const uniqProto = [...new Set(protoLinks)];
console.log(`\n【リンク】 全 ${hrefs.length} 本 ／ プロトタイプ ${protoLinks.length} 本（重複を除くと ${uniqProto.length}）`);
ok(uniqProto.length === 7, `7案そろっている（実際 ${uniqProto.length}）`);
for (const h of [...new Set(hrefs)]) {
  ok(fs.existsSync(path.join(V3, h)), `実在する ${h}`);
}

/* ── 横スクロール ── */
for (const [w, h] of [[1440, 900], [1280, 800], [400, 900]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(150);
  const over = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  ok(over.doc <= 0 && over.body <= 0, `${w}×${h} で横スクロールが出ない（doc ${over.doc} / body ${over.body}）`);
}

/* ── 中身（見出し・ルール5つ・カード7枚・宿題） ── */
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(150);
const counts = await page.evaluate(() => ({
  rules: document.querySelectorAll(".rule").length,
  back: document.querySelectorAll(".rule.back").length,
  cards: document.querySelectorAll(".card").length,
  cant: document.querySelectorAll(".cant").length,
  found: [...document.querySelectorAll(".found")].map(u => u.children.length),
  items: document.querySelectorAll(".opens .item").length,
}));
console.log(`\n【中身】`);
ok(counts.rules === 5, `いまのルールが 5 つ（実際 ${counts.rules}）`);
ok(counts.back === 1, `逆向き（見え → 値）は 1 つだけ（実際 ${counts.back}）`);
ok(counts.cards === 7, `カードが 7 枚（実際 ${counts.cards}）`);
ok(counts.cant === 7, `「直せなかった」が 7 枚とも（実際 ${counts.cant}）`);
ok(counts.found.every(n => n >= 1 && n <= 3), `分かったことは 3 つまで（実際 ${counts.found.join(",")}）`);
ok(counts.items >= 3, `まだ決まっていないこと ${counts.items} 件`);

/* ── スクショ ── */
const shot = path.join(SHOT_DIR, "index.png");
await page.screenshot({ path: shot, fullPage: true });
const shotTop = path.join(SHOT_DIR, "index-1440x900.png");
await page.screenshot({ path: shotTop });

/* ── エラー・ネットワーク ── */
const errs = lab.errors();
console.log(`\n【エラー】 ${errs.length}`);
for (const e of errs) console.log("   " + e);
ok(errs.length === 0, `コンソールエラー 0・ネットワーク要求 0`);

await lab.close();
console.log(`\nスクショ: ${shot}\n        ${shotTop}`);
console.log(ng ? `\n NG ${ng} 件` : `\n 全部 OK`);
process.exit(ng ? 1 : 0);
