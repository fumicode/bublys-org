/**
 * **世界線**（hash 版）── 状態への指し札（`StateSnapshot`）を並べた履歴と、いまの居場所。
 *
 * ここで押さえるのは 2 つだけ:
 *   1. **書くと節が 1 つ増え、いまの世界が入れ替わる**
 *   2. **戻っても消えない** ── 戻るのは居場所が動くだけで、先はそのまま残る
 *
 * ★ 節の id と時刻はその場で作られるので、**値そのものは見ない**
 *   （見ると走らせるたびに違う答えになる）。見るのは数と順番と居場所。
 */
import { HashWorldLine } from './HashWorldLine.js';
import { createStateSnapshot } from './StateSnapshot.js';
import { normalizeJson } from './hashUtils.js';

/** 同じ数え札の、時刻違い（＝別のバージョン） */
const 札 = (t: number) => createStateSnapshot('counter', 'c1', t);

describe('HashWorldLine', () => {
  test('できたては、何も無い', () => {
    const w = HashWorldLine.create('wl-1', '試し');
    expect(w.getHistory()).toHaveLength(0);
    expect(w.getCurrentHistoryIndex()).toBe(-1);
    expect(w.getCurrentState().getSnapshot('counter', 'c1')).toBeUndefined();
  });

  test('書くと節が 1 つ増えて、いまの世界が入れ替わる', () => {
    const w = HashWorldLine.create('wl-1', '試し').updateObjectState(札(100));
    expect(w.getHistory()).toHaveLength(1);
    expect(w.getCurrentHistoryIndex()).toBe(0);
    expect(w.getCurrentState().getSnapshot('counter', 'c1')?.timestamp).toBe(100);
    expect(w.isAtLatest()).toBe(true);
    expect(w.hasFuture()).toBe(false);
  });

  test('元の世界線は 1 文字も変わらない', () => {
    const 元 = HashWorldLine.create('wl-1', '試し');
    const 後 = 元.updateObjectState(札(100));
    expect(後).not.toBe(元);
    expect(元.getHistory()).toHaveLength(0);
  });

  describe('2 回書いてから戻る', () => {
    const 二回 = () =>
      HashWorldLine.create('wl-1', '試し').updateObjectState(札(100)).updateObjectState(札(200));

    test('戻ると、居場所が 1 つ前になる（先は消えない）', () => {
      const 戻った = 二回().moveBack();
      expect(戻った).toBeDefined();
      expect(戻った?.getCurrentHistoryIndex()).toBe(0);
      expect(戻った?.getHistory()).toHaveLength(2);   // 先はそのまま
      expect(戻った?.hasFuture()).toBe(true);
      expect(戻った?.isAtLatest()).toBe(false);
    });

    test('戻った先の世界は、そのときの姿', () => {
      expect(二回().moveBack()?.getCurrentState().getSnapshot('counter', 'c1')?.timestamp).toBe(100);
    });

    test('戻って進めば、また最新', () => {
      const 進んだ = 二回().moveBack()?.moveForward();
      expect(進んだ?.getCurrentHistoryIndex()).toBe(1);
      expect(進んだ?.isAtLatest()).toBe(true);
    });

    test('端では戻れない・進めない（undefined が返る）', () => {
      expect(二回().moveForward()).toBeUndefined();          // もう最新
      expect(二回().moveBack()?.moveBack()).toBeUndefined();  // もう最初
    });
  });
});

describe('normalizeJson', () => {
  test('鍵の並び順が違っても、同じ文字列になる', () => {
    expect(normalizeJson({ b: 1, a: 2 })).toBe(normalizeJson({ a: 2, b: 1 }));
    expect(normalizeJson({ a: 2, b: 1 })).toBe('{"a":2,"b":1}');
  });

  test('中に入れ子があっても揃える', () => {
    expect(normalizeJson({ x: { d: 1, c: 2 } })).toBe('{"x":{"c":2,"d":1}}');
  });

  test('並びの順番は意味なので、揃えない', () => {
    expect(normalizeJson([2, 1])).toBe('[2,1]');
    expect(normalizeJson([1, 2])).not.toBe(normalizeJson([2, 1]));
  });
});
