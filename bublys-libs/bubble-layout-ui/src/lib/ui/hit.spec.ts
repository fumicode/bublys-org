/**
 * **掴めるのは枠 ── 枠は「中身の箱の外側」。**（`hit.ts` の `inContent`）
 *
 * `inContent` が false ＝ 枠（掴める）、true ＝ 中身（掴めない・触るだけ）。
 * 枠の広さは**その泡が着ている装い**（`CHROME`）が決める ── 自分で数を作らない。
 *
 * ★ 2026-09-26 まで、上だけ装いで、左右と下は**自作の 12px**を内側に取っていた。
 *   模型が装いの数を持っているのに別の数を作ったのが誤りで、2 つ害が出ていた:
 *     普通の泡（7/27/7/7）… 7〜12px が中身の上に食い込み、カーソルは中身のまま
 *     窓（上 24 だけ）  … 帯より下はまるごと中の海なのに、四周 12px を取り上げていた
 *   装いに従えば「**枠が見えている所 ＝ 掴める所**」で、カーソルも自動で合う。
 */
import { inContent, onHandle } from './hit.js';
import type { Placement } from '@bublys-org/bubble-layout';

/** 当たり判定が見るのは矩形・倍率・implicit だけなので、そこだけ作る */
const place = (o: { x: number; y: number; w: number; h: number; scale?: number; implicit?: boolean }): Placement =>
  ({
    id: 'b', space: 'root', x: o.x, y: o.y, w: o.w, h: o.h,
    scale: o.scale ?? 1, alpha: 1, vis: 1, depth: 1, local: 1, m: 1,
    bend: { x: 1, y: 1 }, pos: { x: 0, y: 0, z: 0 }, box: { w: o.w, h: o.h },
    b: { id: 'b', state: { implicit: !!o.implicit } },
  } as unknown as Placement);

const hasBody = () => true;
/** 海に浮かぶ普通の泡（`CHROME.plain`） */
const plain = () => ({ left: 7, top: 27, right: 7, bottom: 7 });
/** 窓（`CHROME.bar`）── 帯だけ。側面は中の海のもの */
const bar = () => ({ left: 0, top: 24, right: 0, bottom: 0 });

describe('掴めるのは枠 ── 枠は中身の箱の外側', () => {
  const p = place({ x: 100, y: 200, w: 400, h: 300 });
  const mid = { x: 300, y: 350 };

  it('普通の泡（装い 7/27/7/7）は、四辺とも枠 ＝ 掴める', () => {
    expect(inContent(p, 300, 200 + 26, hasBody, plain)).toBe(false);        // 上の帯
    expect(inContent(p, 100 + 6, mid.y, hasBody, plain)).toBe(false);       // 左の縁
    expect(inContent(p, 100 + 400 - 6, mid.y, hasBody, plain)).toBe(false); // 右の縁
    expect(inContent(p, 300, 200 + 300 - 6, hasBody, plain)).toBe(false);   // 下の縁
    // 装いの内側からは中身（＝ 掴めない。中身のものだから）
    expect(inContent(p, 100 + 8, mid.y, hasBody, plain)).toBe(true);
    expect(inContent(p, 100 + 400 - 8, mid.y, hasBody, plain)).toBe(true);
    expect(inContent(p, 300, 200 + 300 - 8, hasBody, plain)).toBe(true);
    expect(inContent(p, 300, 200 + 28, hasBody, plain)).toBe(true);
    expect(inContent(p, mid.x, mid.y, hasBody, plain)).toBe(true);
  });

  /**
   * ★ **窓の側面は中の海のもの。** 帯より下はまるごと中の海なので、そこを枠にすると
   *   中の海を掴めなくなる（実測：窓の縁から 6px を掴むと、中の海ではなく窓が動いた）。
   */
  it('窓（装いは帯だけ）は、帯だけが枠 ── 側面は中の海に残す', () => {
    expect(inContent(p, 300, 200 + 20, hasBody, bar)).toBe(false);          // 帯
    expect(inContent(p, 100 + 1, mid.y, hasBody, bar)).toBe(true);          // 左の縁 ＝ 中の海
    expect(inContent(p, 100 + 400 - 1, mid.y, hasBody, bar)).toBe(true);
    expect(inContent(p, 300, 200 + 300 - 1, hasBody, bar)).toBe(true);
  });

  it('枠はその泡の尺で測る（縮んだ泡では枠も縮む）', () => {
    const small = place({ x: 0, y: 0, w: 200, h: 150, scale: 0.5 });
    expect(inContent(small, 3, 75, hasBody, plain)).toBe(false);   // 7 × 0.5 ＝ 3.5 の内側
    expect(inContent(small, 4, 75, hasBody, plain)).toBe(true);    // その外は中身
  });

  it('中身は必ず残る（箱 ＝ 中身 ＋ 装い なので、手当ては要らない）', () => {
    // 一覧の札くらい小さくても（装い `quiet` 7/7/7/7）、真ん中は中身のまま
    const card = place({ x: 0, y: 0, w: 120, h: 86 });
    const quiet = () => ({ left: 7, top: 7, right: 7, bottom: 7 });
    expect(inContent(card, 60, 43, hasBody, quiet)).toBe(true);
    expect(inContent(card, 3, 43, hasBody, quiet)).toBe(false);
  });

  it('本文を持たない泡・見えない親は、今までどおりどこでも掴める', () => {
    expect(inContent(p, 300, 350, () => false, plain)).toBe(false);
    expect(inContent(place({ x: 100, y: 200, w: 400, h: 300, implicit: true }), 300, 350, hasBody, plain)).toBe(false);
  });

  it('右下の角（大きさを変える）は、下の縁・右の縁と同じ点に当たる（優先は pickAt が決める）', () => {
    const corner = { x: 100 + 400 - 6, y: 200 + 300 - 6 };
    expect(onHandle(p, corner.x, corner.y)).toBe(true);
    expect(inContent(p, corner.x, corner.y, hasBody, plain)).toBe(false);
  });
});
