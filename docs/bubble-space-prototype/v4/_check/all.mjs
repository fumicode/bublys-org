// v4 の確かめを全部まとめて走らせる
//   node docs/bubble-space-prototype/v4/_check/all.mjs
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = ["smoke.mjs", "rule1.mjs", "rule2.mjs", "rule3.mjs", "rule4.mjs", "rule5.mjs", "snap.mjs", "screen.mjs"];
const bad = [];
for (const f of FILES) {
  console.log(`\n═══ ${f} ${"═".repeat(Math.max(0, 60 - f.length))}`);
  const r = spawnSync(process.execPath, [path.join(HERE, f)], { stdio: "inherit" });
  if (r.status !== 0) bad.push(f);
}
console.log(bad.length ? `\n★ NG: ${bad.join(" ")}` : `\n★ 全部 OK（${FILES.length} 本）`);
process.exit(bad.length ? 1 : 0);
