// v5-dom を ひととおり。file:// で開いて、本物のマウスで触る。
//   node docs/bubble-space-prototype/v5-dom/_check/all.mjs
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIST = [
  ["smoke", "file:// で開いて泡が出る・DOM と配置が合う・コンソールエラー 0"],
  ["vs-v4", "canvas 版 v4 と配置・倍率・描く順がそろう"],
  ["hit",   "当たり判定（elementFromPoint が「描いた順の逆」を満たすか・見えない泡・縁・角）"],
  ["drag",  "掴んで動かす（掴んだ点のずれ・並べ替え・マス移動・視点・大きさ・出入り）"],
  ["flat",  "なぜ1枚の層の兄弟か（中の泡が親の兄弟より手前に出られる）"],
  ["perf",  "書き方（毎フレーム transform だけ・切り抜き無し・will-change 無し）"],
  ["ui",    "ツールバー（軸セレクタ・プリセット・継ぐ・焦点・ヒント行）"],
  ["rule1", "① 親の View で決まる"],
  ["rule2", "② 操作は軸と掴んだもの"],
  ["rule3", "③ 見えない親は体を持たない"],
  ["rule4", "④ 並べる＝帯"],
  ["rule5", "⑤ 触っていない泡は動かない"],
  ["snap",  "③ くっつける（縁へ寄せる）"],
  ["stack", "手前の泡スタック（消えた泡を右端に積む・押すとカメラが戻る）"],
  ["drawmin","描く下限（小さすぎる泡は描かない・掴めない。★ 数とスタックは未決）"],
  ["screen","画面の約束（ヒント行・一覧・選択・カーソル脇・印・配色）"],
];

let ng = 0;
for (const [name, what] of LIST) {
  console.log(`\n=============== ${name} ── ${what}`);
  const r = spawnSync(process.execPath, [path.join(HERE, `${name}.mjs`)], { stdio: "inherit" });
  const lines = r.status;
  if (lines !== 0) { ng++; console.log(`  ！ ${name} が落ちた（status ${lines}）`); }
}
console.log(ng ? `\n落ちた本 ${ng}` : `\n${LIST.length} 本ぜんぶ通った`);
process.exit(ng ? 1 : 0);
