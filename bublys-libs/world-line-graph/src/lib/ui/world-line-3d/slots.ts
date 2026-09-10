/**
 * 席割り（slot）— どのオブジェクトが板のどこに座るかを**1回だけ**決める。
 *
 * 同じ `type:id` は、どのノードでも・どのスコープでも同じ席に居続ける。
 * これが3Dで時間を見比べるための前提。席が動くと、変化していないものまで
 * 動いて見えて「何が変わったのか」が読めなくなる。
 *
 * 並び順は (型の初出順, キーの初出順)。型ごとに行を折り返すので**席は歯抜けになる**。
 * だから席番号から key を引く逆引き表（byCell）を持つ。
 * `order[row * cols + col]` のような式で引くと必ずずれる。
 */
import type { Slot } from './types.js';

export type SlotMap = {
  /** key → 席 */
  readonly of: (key: string) => Slot | undefined;
  /** 席 → key（歯抜けは undefined） */
  readonly at: (col: number, row: number) => string | undefined;
  readonly cols: number;
  readonly rows: number;
  readonly keys: readonly string[];
};

/**
 * 席を配る。
 *
 * @param typedKeys 出現順に並んだ `{ type, key }`。呼び出し側が全スコープ・全ノードの
 *   changedRefs を走査して渡す（和集合。順序は決定的であること）
 * @param cols 1行あたりの席数
 */
export function buildSlotMap(
  typedKeys: readonly { readonly type: string; readonly key: string }[],
  cols: number
): SlotMap {
  if (cols < 1) throw new Error(`buildSlotMap: cols は1以上（${cols}）`);

  // 型の初出順 → その型の中でのキーの初出順
  const byType = new Map<string, string[]>();
  for (const { type, key } of typedKeys) {
    const list = byType.get(type);
    if (list) {
      if (!list.includes(key)) list.push(key);
    } else {
      byType.set(type, [key]);
    }
  }

  const of = new Map<string, Slot>();
  const at = new Map<string, string>();
  const keys: string[] = [];
  let row = 0;
  for (const [, list] of byType) {
    // 型が変わったら行を折り返す（型のかたまりが目で読めるように）
    let col = 0;
    for (const key of list) {
      if (col >= cols) {
        col = 0;
        row++;
      }
      of.set(key, { col, row });
      at.set(`${col},${row}`, key);
      keys.push(key);
      col++;
    }
    row++;
  }

  const rows = Math.max(row, 1);
  return {
    of: (key) => of.get(key),
    at: (c, r) => at.get(`${c},${r}`),
    cols,
    rows,
    keys,
  };
}
