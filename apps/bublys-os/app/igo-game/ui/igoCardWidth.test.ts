/**
 * 札の幅 ── 理想 12 文字、下限 7 文字、12 超えは「長い名前 ＋ 余地」のときだけ。
 */
import { IDEAL_CHARS, MIN_CHARS, igoCardWidth, widthOfChars } from './igoCardWidth';

/** 余地がいくらでもある箱 */
const WIDE = 4000;

describe('対局の札の幅', () => {
  it('ふつうは理想の 12 文字ぶん', () => {
    expect(igoCardWidth(0, WIDE)).toBe(widthOfChars(IDEAL_CHARS));   // 名前なし
    expect(igoCardWidth(5, WIDE)).toBe(widthOfChars(IDEAL_CHARS));   // 短い名前でも細くしない
    expect(igoCardWidth(12, WIDE)).toBe(widthOfChars(IDEAL_CHARS));
  });

  it('12 文字より長い名前があり、箱に余地があれば、そのぶん広げる', () => {
    expect(igoCardWidth(15, WIDE)).toBe(widthOfChars(15));
  });

  it('長い名前があっても、箱に余地が無ければ広げない', () => {
    const room = widthOfChars(IDEAL_CHARS);          // ちょうど 12 文字ぶんしかない
    expect(igoCardWidth(30, room)).toBe(widthOfChars(IDEAL_CHARS));
  });

  it('箱が足りなければ譲る ── ただし 7 文字まで', () => {
    expect(igoCardWidth(12, widthOfChars(9))).toBe(widthOfChars(9));
    expect(igoCardWidth(12, widthOfChars(7))).toBe(widthOfChars(7));
    // 7 文字ぶんも無い箱では、7 文字のまま見切れさせる（縮め続けない）
    expect(igoCardWidth(12, widthOfChars(3))).toBe(widthOfChars(MIN_CHARS));
    expect(igoCardWidth(12, 0)).toBe(widthOfChars(MIN_CHARS));
  });

  it('12 文字ぶんが 308px（中身の数）', () => {
    expect(widthOfChars(IDEAL_CHARS)).toBe(308);
    expect(widthOfChars(MIN_CHARS)).toBe(243);
  });
});
