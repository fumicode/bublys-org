/**
 * **依存の向きを守る**（CLAUDE.md「コンポーネント構成（ドメイン駆動設計）」）。
 *
 * ```
 * domain（依存なし） ← ui（domain に依存） ← feature（domain + ui + Redux に依存）
 * ```
 *
 * ここで見るのは、いちばん外側の約束 1 つだけ ──
 * **`domain/` は React も Redux も、ほかの層も知らない**。
 *
 * ★ 守られていなかった所（2026-09-26 に直した）:
 *   `apps/bublys-os/.../BubblesUI/domain/bubbleRoutes.tsx`
 *      中身は url → 画面部品の対応表で、React 部品を 20 個 import していた
 *      → `registration/` へ（ほかのバブリと同じ置き場所）。`domain/` は空になって消えた
 *   `apps/bublys-os/.../WorldLine/domain/WorldLineContext.ts`
 *      `createContext` は React のもの → `ui/` へ
 *      （消費するのは ui、配るのは feature。feature に置くと ui → feature の逆流になる）
 *
 * ★ 名前が嘘になるのがいちばんの害。「domain」と書いてあるのに画面を知っていると、
 *   **どこから読んでよいか誰にも分からなくなる**。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** domain が知っていてはいけないもの */
const OUTSIDE = /from ['"](react|react-dom|@reduxjs\/|react-redux|@mui\/|next\/)|from ['"]\.\.\/(ui|feature)\//;

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

/** `domain/` の下にある .ts / .tsx を集める */
const domainFiles = (dir: string, inDomain = false, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'out-tsc' || name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) domainFiles(full, inDomain || name === 'domain', out);
    else if (inDomain && /\.tsx?$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
};

describe('層の向き', () => {
  it('★ domain は React も Redux も、ui も feature も知らない', () => {
    const files = domainFiles(root);
    expect(files.length).toBeGreaterThan(20);        // 見張る相手が居ることを押さえる
    const found: string[] = [];
    for (const file of files) {
      const body = readFileSync(file, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');
      body.split('\n').forEach((line, i) => {
        if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;
        if (OUTSIDE.test(line)) found.push(`${file.slice(root.length + 1)}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(found).toEqual([]);
  });
});
