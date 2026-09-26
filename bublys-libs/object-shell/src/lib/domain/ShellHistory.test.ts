/**
 * **殻の履歴** ── 1 本に繋がった鎖。新しいものが先頭で、`previous` で前へ辿る。
 *
 * ここで押さえるのは、辿り方の当たり前:
 *   - 足した順に並び、長さが数えられる
 *   - 配列にすると**新しいものが先頭**
 *   - n 個前が引ける（行き過ぎたら null）
 *   - 種類で絞れる
 *
 * ★ 時刻（`Date.now()`）は鎖を作るときに入るので、ここでは**時刻の値そのものは見ない**
 *   ── 見ると走らせるたびに違う答えになる。
 */
import { ShellHistory, type ShellHistoryNode } from './ShellHistory.js';

/** 3 回動かした鎖を作る（古い → 新しい） */
const 三つの鎖 = (): ShellHistoryNode<number> => {
  const a = ShellHistory.createNode<number>(null, { type: 'counter/countUp' }, 1);
  const b = ShellHistory.createNode<number>(a, { type: 'counter/countUp' }, 2);
  return ShellHistory.createNode<number>(b, { type: 'counter/countDown' }, 1);
};

describe('ShellHistory', () => {
  test('足した数だけ長さが伸びる（何も無ければ 0）', () => {
    expect(ShellHistory.getLength(null)).toBe(0);
    expect(ShellHistory.getLength(三つの鎖())).toBe(3);
  });

  test('配列にすると、新しいものが先頭', () => {
    const 並び = ShellHistory.getAsArray(三つの鎖());
    expect(並び.map((n) => n.snapshot)).toEqual([1, 2, 1]);
    expect(並び[0].action.type).toBe('counter/countDown');
  });

  test('n 個前が引ける。行き過ぎたら null', () => {
    const 鎖 = 三つの鎖();
    expect(ShellHistory.getNthPrevious(鎖, 0)?.snapshot).toBe(1);   // 自分
    expect(ShellHistory.getNthPrevious(鎖, 1)?.snapshot).toBe(2);
    expect(ShellHistory.getNthPrevious(鎖, 2)?.snapshot).toBe(1);
    expect(ShellHistory.getNthPrevious(鎖, 3)).toBeNull();
  });

  test('種類で絞れる', () => {
    const 上げただけ = ShellHistory.findByActionType(三つの鎖(), 'counter/countUp');
    expect(上げただけ).toHaveLength(2);
    expect(上げただけ.every((n) => n.action.type === 'counter/countUp')).toBe(true);
  });

  test('前を持たない節が、鎖の端', () => {
    const 端 = ShellHistory.getNthPrevious(三つの鎖(), 2);
    expect(端?.previous).toBeNull();
  });
});
