// 案A（00-core）と案B（06-layout-apart）の「書く量」を、同じ数え方で数え直す。
// 数え方（06 の冒頭の「注」と同じ）
//   - add は「場面 1」から勤務表の最後の add まで
//   - 行数は 空行・コメントだけの行 を除く。表を使える形にする包みの行は込み
//   - 「中身だけ」は const 表 = { と }; の間の行（コメント行は除く）
//   node docs/bubble-space-prototype/v3/_check/06-count.mjs
import fs from "node:fs";
import path from "node:path";
import { V3 } from "./lab.mjs";

const read = (f) => fs.readFileSync(path.join(V3, f), "utf8").split("\n");
/** 空行・行コメント・ブロックコメントの中の行を落として、コード行だけ数える */
function codeLines(lines, startInComment = false) {
  let inC = startInComment;
  const out = [];
  for (const l of lines) {
    let t = l;
    if (inC) { const e = t.indexOf("*/"); if (e < 0) continue; t = t.slice(e + 2); inC = false; }
    for (;;) { const a = t.indexOf("/*"); if (a < 0) break;
      const e = t.indexOf("*/", a + 2);
      if (e < 0) { t = t.slice(0, a); inC = true; break; }
      t = t.slice(0, a) + t.slice(e + 2); }
    t = t.replace(/\/\/.*$/, "").trim();
    if (t !== "") out.push(l);
  }
  return out;
}
const isCode = (l) => codeLines([l]).length > 0;
const countCode = (lines) => codeLines(lines).length;

/** 行 from（含む）から to（含む）までを取る。from/to は最初に当たった行の番号（0 始まり） */
function slice(lines, fromRe, toRe, fromIdx = 0) {
  const a = lines.findIndex((l, i) => i >= fromIdx && fromRe.test(l));
  const b = lines.findIndex((l, i) => i > a && toRe.test(l));
  if (a < 0 || b < 0) throw new Error(`見つからない: ${fromRe} / ${toRe}`);
  return lines.slice(a, b + 1);
}
/** const 名 = { … }; の中身（中括弧の中）だけ */
function tableBody(lines, name) {
  const a = lines.findIndex((l) => new RegExp(`^const ${name} = \\{`).test(l));
  const b = lines.findIndex((l, i) => i > a && /^\};/.test(l));
  return lines.slice(a + 1, b);
}
const scriptOf = (lines) => {
  const a = lines.findIndex((l) => /^<script>/.test(l));
  const b = lines.findIndex((l) => /^<\/script>/.test(l));
  return lines.slice(a + 1, b);
};

const out = [];
for (const [name, file] of [["A（00-core）", "00-core.html"], ["B（06-layout-apart）", "06-layout-apart.html"]]) {
  const lines = read(file);
  const script = scriptOf(lines);
  const r = { name };

  // 6場面の add
  const addFrom = lines.findIndex((l) => /場面 1\./.test(l));
  const addTo = lines.findIndex((l, i) => i > addFrom && /^  add\(\{ id: "d" \+ i/.test(l));
  r.add = countCode(lines.slice(addFrom, addTo + 2));    // 最後の add は2行に折り返している

  // 型の定義（包みの行も込み）
  if (file === "00-core.html") {
    r.types = countCode(slice(lines, /^const AX = /, /^const viewFromPreset = /));
    r.typesBody = countCode(tableBody(lines, "PRESETS"));
    r.typeCount = tableBody(lines, "PRESETS").filter(isCode).length;
  } else {
    const wrap = [
      ...lines.filter((l) => /^const AXIS_WORD = /.test(l)),
      ...slice(lines, /^const CAMERAS = \{/, /^\};/),
      ...slice(lines, /^const WHEEL_WORD = /, /^const camOf = /),
      ...slice(lines, /^const zFree = /, /^const lenOn = /),
      ...slice(lines, /^const LAYOUTS = \{/, /^\};/),
      ...slice(lines, /^const VERBS = \{/, /^\};/),
      ...slice(lines, /^const specOf = /, /^const nameOf = /),
    ];
    r.types = countCode(wrap);
    r.typesBody = countCode(tableBody(lines, "LAYOUTS")) + countCode(tableBody(lines, "CAMERAS")) + countCode(tableBody(lines, "VERBS"));
    r.typeCount = tableBody(lines, "LAYOUTS").filter((l) => /^  \w+: \{/.test(l)).length;
  }

  // スクリプト全体
  r.script = countCode(script);

  // 触った泡は最前面へ（raise）にかかる行
  const raiseFrom = script.findIndex((l) => /^function raise\(/.test(l));
  if (raiseFrom >= 0) {
    const raiseTo = script.findIndex((l, i) => i > raiseFrom && /^\}/.test(l));
    r.raise = countCode(script.slice(raiseFrom, raiseTo + 1));
    r.raiseCalls = script.filter((l) => /(^|[^a-zA-Z])raise\(/.test(l) && !/^function raise/.test(l)).length;
  } else { r.raise = 0; r.raiseCalls = 0; }

  // 「置いた順」（View の外の状態）がまだ残っているか
  r.stack = codeLines(script).filter((l) => /\bSTACK\b|\.stack\b|^\s*stack: 0/.test(l)).length;

  out.push(r);
}

console.log("項目".padEnd(34), "A（00-core）".padEnd(16), "B（06-layout-apart）");
const row = (k, f) => console.log(k.padEnd(36), String(f(out[0])).padEnd(18), String(f(out[1])));
row("6場面の add", (r) => `${r.add} 行`);
row("場面が名前で呼ぶ型の定義", (r) => `${r.types} 行（中身 ${r.typesBody}）`);
row("型の数", (r) => r.typeCount);
row("スクリプト全体（コード行）", (r) => `${r.script} 行`);
row("raise（触ると最前面へ）", (r) => `${r.raise} 行 ＋ 呼ぶ所 ${r.raiseCalls}`);
row("置いた順（View の外の状態）", (r) => `${r.stack} 行`);
