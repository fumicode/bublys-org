// 「型ごとの分岐」を A（00-core）と B（06-layout-apart）で同じ物差しで数える。
//
// ★ 前の表（06 の冒頭）は手で挙げた一覧で数えていたが、その道具（/tmp の v3check/）は消えている。
//   そこで数え方を機械で書き直した。物差しが前と違うので、絶対の数は前の表と揃わない。
//   比べられるのは「A と B を同じ物差しで測った値」と「機能を1つ足す前と後の差」。
//
// 数え方
//   - <script> の中だけ。コメント・文字列は落とす
//   - 分岐 ＝ if( / else if( / case / 三項の ? / ??
//   - そのうち「型を読む」ものだけ数える（A＝軸に刺さった 次元・並べ方・レンズ とそこから出る動詞、
//     B＝レイアウトの型・カメラの型・verb）。軸だけを見るもの（axis==="x"・dir・bend）は当たらない
//   - 継承・セレクタ（ツールバー）・__lab の節は数えない
//   node docs/bubble-space-prototype/v3/_check/06-branches.mjs
import fs from "node:fs";
import path from "node:path";
import { V3 } from "./lab.mjs";

/** コメントと文字列の中身を落とす（行数は保つ） */
function strip(src) {
  const out = [];
  let inBlock = false;
  for (const raw of src.split("\n")) {
    let l = raw, r = "";
    if (inBlock) { const e = l.indexOf("*/"); if (e < 0) { out.push(""); continue; } l = l.slice(e + 2); inBlock = false; }
    for (let i = 0; i < l.length; i++) {
      const two = l.slice(i, i + 2);
      if (two === "//") break;
      if (two === "/*") { const e = l.indexOf("*/", i + 2); if (e < 0) { inBlock = true; break; } i = e + 1; continue; }
      const c = l[i];
      if (c === '"' || c === "'" || c === "`") {           // 文字列は中身を消す（日本語の中の ? を分岐に数えないため）
        const q = c; let j = i + 1;
        while (j < l.length && !(l[j] === q && l[j - 1] !== "\\")) j++;
        r += q + q + l.slice(i, j + 1).replace(/[^\x20-\x7e]/g, "");   // 中身は ASCII だけ残す（"reorder" などの型の名前を読むため）
        i = j; continue;
      }
      r += c;
    }
    out.push(r);
  }
  return out;
}

const TOKENS = {
  "00-core.html": /verbOf\(|DIMS\[|LENS_XY\[|LENS_Z\[|ARRANGES\[|\.dim\b|\.arrange\b|\.lens\b|\bverb\b|\bmoves\b|\blift\b|\bfollow\b|dimId|"(coord|reorder|cell|focus|none|order|col|row|as-is|equal|pack|parallel|fisheye|perspective|flat|free\.[xyz]|history\.)/,
  "06-layout-apart.html": /LAYOUTS\[|CAMERAS\[|VERBS\[|\.lay\b|\blay\.|\.type\b|\bverb\b|\bmoves\b|\blift\b|\bownZ\b|\bcells\b|specOf\(|camOf\(|"(move|reorder|cell|view|none|free|stack|grid|line|genBranch|ageStack|parallel|fisheye|perspective)"/,
};
/** 数えない所：継承の関数・ツールバー（セレクタ）・__lab。関数は「その行から最初の `}` 行まで」 */
const SKIP_FN = {
  "00-core.html": [/^function viewOf\(/, /^function setAxis\(/, /^function applyPreset\(/, /^function inheritView\(/],
  "06-layout-apart.html": [/^function setupOf\(/, /^function ownSetup\(/, /^function inheritSetup\(/],
};
const SKIP_TO_END = { "00-core.html": /^\/\* ── ツールバー/, "06-layout-apart.html": /^\/\* ── ツールバー/ };
/** 章立て（この行から次の見出しまでが、その章） */
const SECTIONS = {
  "00-core.html": [[/^   §1 語彙/, "並べる・写す"], [/^   §2 並べ方/, "並べる・写す"], [/^   §2 解く順番/, "並べる・写す"],
                   [/^   描画/, "描画"], [/^   §3 操作/, "操作"], [/^   §5 画面の約束/, "画面の言葉"], [/^   ループ$/, "－"]],
  "06-layout-apart.html": [[/^   レンズの式/, "並べる・写す"], [/^   カメラ：/, "並べる・写す"], [/^   並べる部品/, "並べる・写す"],
                   [/^   レイアウトの型/, "並べる・写す"], [/^   解く順番/, "並べる・写す"],
                   [/^   描画/, "描画"], [/^   操作 ——/, "操作"], [/^   画面の約束/, "画面の言葉"], [/^   ループ$/, "－"]],
};

for (const file of ["00-core.html", "06-layout-apart.html"]) {
  const raw = fs.readFileSync(path.join(V3, file), "utf8");
  const rawLines = raw.split("\n");
  const lines = strip(raw);
  const tok = TOKENS[file];

  // 節ごとの範囲
  const marks = [];
  for (const [re, name] of SECTIONS[file]) { const i = rawLines.findIndex((l) => re.test(l)); if (i >= 0) marks.push([i, name]); }
  marks.sort((a, b) => a[0] - b[0]);
  const sectionOf = (i) => { let n = "－"; for (const [at, name] of marks) if (i >= at) n = name; return n; };
  const skip = SKIP_FN[file].map((re) => {
    const i = rawLines.findIndex((l) => re.test(l));
    const j = /\}\s*$/.test(rawLines[i]) ? i : rawLines.findIndex((l, k) => k > i && /^\}/.test(l));
    return [i, j < 0 ? i : j];
  });
  skip.push([rawLines.findIndex((l) => SKIP_TO_END[file].test(l)), rawLines.length]);
  const skipped = (i) => skip.some(([a, b]) => i >= a && i <= b);

  // raise / freeCellNear（今回足した所）の行範囲
  const newSpans = [];
  for (const re of [/^function raise\(/, /^function freeCellNear\(/]) {
    const a = rawLines.findIndex((l) => re.test(l));
    if (a < 0) continue;
    const b = rawLines.findIndex((l, i) => i > a && /^\}/.test(l));
    newSpans.push([a, b]);
  }
  const isNew = (i) => newSpans.some(([a, b]) => i >= a && i <= b) || /raise\(/.test(rawLines[i] ?? "");

  const found = [];
  lines.forEach((l, i) => {
    if (skipped(i)) return;
    const hits = (l.match(/\bif\s*\(|\bcase\s|\?\?|\?/g) || []).length;
    if (!hits || !tok.test(l)) return;
    // 1行に複数の分岐が書いてあることがあるので、その数だけ数える
    found.push({ i, n: hits, sec: sectionOf(i), neu: isNew(i), text: rawLines[i].trim().slice(0, 108) });
  });

  const total = found.reduce((s, f) => s + f.n, 0);
  const neu = found.filter((f) => f.neu).reduce((s, f) => s + f.n, 0);
  const bySec = {};
  for (const f of found) bySec[f.sec] = (bySec[f.sec] ?? 0) + f.n;
  console.log(`\n=== ${file} ===`);
  console.log(`  型を読む分岐 ${total} か所（節ごと：${Object.entries(bySec).map(([k, v]) => `${k} ${v}`).join("・")}）`);
  console.log(`  うち「触ると最前面へ」で増えた分 ${neu} か所 → 足す前 ${total - neu}`);
  if (process.argv.includes("-v")) for (const f of found) console.log(`   ${String(f.i + 1).padStart(4)} ${f.sec.padEnd(6)} ${f.neu ? "新" : "  "} ${f.n} | ${f.text}`);
}
