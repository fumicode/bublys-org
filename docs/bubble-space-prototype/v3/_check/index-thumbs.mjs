// 一覧ページ（index.html）のサムネイルを撮り直す。
//   node docs/bubble-space-prototype/v3/_check/index-thumbs.mjs           … 7案ぜんぶ
//   node docs/bubble-space-prototype/v3/_check/index-thumbs.mjs 03 05     … その案だけ
//
// 1440×900 で開いて落ち着かせ、_check/shots/NN-*-index.png に撮り、
// sips で thumbs/NN-*.jpg（横 720px）にする。index.html はこの jpg を相対パスで指している。
import { openLab, listPrototypes, V3, SHOT_DIR } from "./lab.mjs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const THUMB_DIR = path.join(V3, "thumbs");
const THUMB_W = 720;                       // index.html のカードは最大 ~460px。2倍まで耐える
const only = process.argv.slice(2);
const files = listPrototypes().filter(f => only.length === 0 || only.some(o => f.startsWith(o)));

fs.mkdirSync(THUMB_DIR, { recursive: true });
let ng = 0;
for (const f of files) {
  const lab = await openLab(`${V3}/${f}`);
  const base = path.basename(f, ".html");
  try {
    await lab.settle();
    const png = path.join(SHOT_DIR, `${base}-index.png`);
    await lab.page.screenshot({ path: png });
    const jpg = path.join(THUMB_DIR, `${base}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72",
                          "-Z", String(THUMB_W), png, "--out", jpg], { stdio: "ignore" });
    const ps = await lab.placements();
    const errs = lab.errors();
    if (errs.length) ng++;
    const kb = (fs.statSync(jpg).size / 1024).toFixed(0);
    console.log(`${f.padEnd(26)} 泡 ${String(ps.length).padStart(3)}  エラー ${errs.length}  → thumbs/${base}.jpg ${kb}KB`);
  } catch (e) {
    ng++;
    console.log(`${f.padEnd(26)} 例外: ${e.message}`);
  }
  await lab.close();
}
console.log(`\nサムネイル: ${THUMB_DIR}`);
process.exit(ng ? 1 : 0);
