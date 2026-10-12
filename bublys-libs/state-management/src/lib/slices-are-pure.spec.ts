/**
 * **スライスの reducer は純粋であること**（CLAUDE.md 規則6の土台）。
 *
 * > **同じ操作をやり直したら、同じ結果になる。**
 *
 * このプロジェクトは**世界線（やり直し）が土台**なので、reducer が時計や賽子を読むと
 * 再生のたびに違う値になり、記録と食い違う。実際に踏んだ:
 *
 *   `task-slice`        ステータス変更のたびに `new Date()`
 *   `csv-importer`      セル編集・行追加で `new Date()` と `crypto.randomUUID()`
 *   `gakkai-shift`      ステータス変更で `new Date()`
 *   `shift-plan`        **世界線から戻す**ときに `updatedAt` を「いま」で上書き（記録と違う姿になる）
 *   `apps.slice`        `addApp` の id が `Date.now()`（やり直すと別の id）
 *
 * ★ 時計や賽子が要るときは **`prepare`**（配るときに 1 回だけ走り、値は action に載る）か、
 *   feature 層（集約を呼ぶ所）で。どちらも「同じ action を再生すれば同じ結果」を壊さない。
 * ★ 逃げ口は、その行かすぐ上に `prepare` と書いてあるときだけ ── **断りが見えることが条件**。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** 時計と賽子 */
const IMPURE = /new Date\(|Date\.now\(|Math\.random\(|randomUUID\(/;
/** 断りが書いてある行（かその 1 つ上）だけ許す ── 逃げ口は**見えること**が条件 */
const ALLOWED = 'prepare';

const root = (() => {
  let dir = __dirname;
  for (let i = 0; i < 12; i++) {
    try {
      statSync(join(dir, 'nx.json'));
      return dir;
    } catch {
      dir = join(dir, '..');
    }
  }
  throw new Error('nx.json が見つからない');
})();

const slices = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'out-tsc' || name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) slices(full, out);
    else if (/slice.*\.ts$/.test(name) && !/\.spec\.ts$/.test(name)) out.push(full);
  }
  return out;
};

describe('スライスは純粋', () => {
  it('★ reducer の中に時計も賽子も無い（断りのある prepare だけ別）', () => {
    const files = slices(root);
    expect(files.length).toBeGreaterThan(8);          // 見張る相手が居ることを押さえる
    const found: string[] = [];
    for (const file of files) {
      const body = readFileSync(file, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')             // 註（ブロック）は見ない
        .split('\n')
        .map((line) => line.replace(/\/\/.*$/, (c) => (c.includes(ALLOWED) ? c : '')));
      body.forEach((line, i) => {
        if (IMPURE.test(line) && !line.includes(ALLOWED) && !body[i]?.includes(ALLOWED)) {
          const prev = body[i - 1] ?? '';
          if (!prev.includes(ALLOWED)) found.push(`${file.slice(root.length + 1)}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(found).toEqual([]);
    // リポジトリ中のスライスのファイルを全部読むので重い（単独で 1 秒前後）。
    // 既定の 5 秒では、他のプロジェクトと並列で流したときに時間切れになる
  }, 30_000);
});
