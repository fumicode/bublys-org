/**
 * ② 触った泡へ、視点が寄る。
 *
 * > **触るのは「見る」ことであって、「動かす」ことではない。**
 * > **だから触っても値は1つも書かない。その泡へ焦点が寄るだけ。**
 *
 * ★ このファイルは `raise.spec.ts`（触ったとき Z に書く動詞）の置き換え。
 *   古い4本をどうしたかは、下のそれぞれの it に書いた。
 *
 * ★ 下の数は、ラボ（v5-dom/lab.html）を headless Chromium で開いて **本物のマウスでクリックして**
 *   `__lab.focusOf(...)` / `__lab.placements()` から取った値と、8 通り（cf6・cf0・g0・勤務表・中・付箋A・版5・佐藤）
 *   突き合わせてある ── **焦点は差 0、配置は最大 5.7e-14px**（ラボが stage の左上を足して返すぶんの桁落ち）。
 *   ラボ側でも「触っても泡の値は1つも変わらない」（`__lab.bubbles()` が完全一致）を確かめた。
 *
 * ★ v4/RULES.md に焼いてある `0.31 … 0.98 … 0.31` → `0.03 … 0.98` は、下限 0.32 を取り消して
 *   **また出るようになった**（2026-09-19。DECISIONS.md「端での下限 ── 入れたが、翌日に取り消した」）。
 */
import { focusOn, bringToCenter } from './focus.js';
import { fitFocus } from './project.js';
import { resolveWorld } from './resolve.js';
import { withPreset } from './view.js';
import { DEFAULT_RULES } from './rules.js';
import type { BubbleWorld } from './world.js';
import { labScene, placeOf, VIEWPORT } from './lab-scene.js';

const R = DEFAULT_RULES;
const world = labScene();
const layout = resolveWorld(world, VIEWPORT);

/** 泡の「値」── 焦点（＝ その空間がどこを見ているか）だけを外したもの */
const valueOf = (w: BubbleWorld, id: string) => {
  const b = w.bubble(id);
  if (!b) throw new Error('泡が無い: ' + id);
  const rest: Record<string, unknown> = { ...b.state };
  delete rest['focus'];
  return rest;
};
const allValues = (w: BubbleWorld) => w.bubbles.map((b) => valueOf(w, b.id));
/** coverflow 7枚の倍率 */
const cover = (w: BubbleWorld) => {
  const l = resolveWorld(w, VIEWPORT);
  return [...Array(7)].map((_, i) => placeOf(l, 'cf' + i).scale);
};
/** RULES.md に焼いてある実測（小数2桁）と比べるため */
const raw = (ks: readonly number[]) => ks.map((k) => Number(k.toFixed(2)));

describe('② 触った泡へ、視点が寄る', () => {
  it('★ 触っても、泡の値は1つも変わらない（変わるのはその空間の焦点だけ）', () => {
    const next = focusOn(world, layout, 'cf0', R);
    // 58 個ぜんぶ：親・順序・自由・マス・履歴・枝・大きさ・View が1つも動かない
    expect(allValues(next)).toEqual(allValues(world));
    // 動いたのは coverflow の焦点だけ（root も、ほかの空間も 0 のまま）
    expect(next.bubble('cover')?.state.focus).toEqual({ x: -204, y: 0, z: 0 });
    expect(next.state.root.focus).toEqual({ x: 0, y: 0, z: 0 });
    const moved = next.bubbles.filter(
      (b) => JSON.stringify(b.state.focus) !== JSON.stringify(world.bubble(b.id)?.state.focus),
    );
    expect(moved.map((b) => b.id)).toEqual(['cover']);
  });

  it('★ 触ると、その泡がその軸の焦点になる（coverflow ＝ 順序·等間隔·魚眼）', () => {
    // cf6 の位置は 等間隔 68 × (6−3) ＝ 204。★ 下限を取り消したので、焦点はそこまで届く
    //   （下限があったときは、端の泡が大きく描かれるぶん約束(2)「中身は箱に収まる」が 67.0721… で止めていた）
    const touched = focusOn(world, layout, 'cf6', R);
    expect(placeOf(layout, 'cf6').pos.x).toBe(204);
    expect(touched.bubble('cover')?.state.focus.x).toBe(204);
    // 倍率だけが入れ替わる（山が中央から右へ寄る）
    expect(cover(world)).toEqual([
      0.3126301311038828, 0.5629659042235501, 0.8443560262794297, 0.9772801709404171,
      0.8443560262794297, 0.5629659042235501, 0.3126301311038828,
    ]);
    expect(cover(touched)).toEqual([
      0.03383925738396272, 0.07362461508349882, 0.1559739262137659, 0.3126301311038828,
      0.5629659042235501, 0.8443560262794297, 0.9772801709404171,
    ]);
    // ★ 触った端の泡は中央で原寸（0.98）、向こうの端は 0.03 まで潰れる ── それでよい
    //   （「奥に行った泡は読めなくてよい。雰囲気だけでも残っていることに意味がある」）
    expect(raw(cover(touched))[6]).toBe(0.98);
    expect(Math.min(...cover(touched))).toBeLessThan(0.04);
    // v4/RULES.md ② に焼いてある実測と、小数2桁で一致する
    expect(raw(cover(world))).toEqual([0.31, 0.56, 0.84, 0.98, 0.84, 0.56, 0.31]);
    expect(raw(cover(touched))).toEqual([0.03, 0.07, 0.16, 0.31, 0.56, 0.84, 0.98]);
    // そして泡の値（順序・自由X）は1つも変わっていない
    expect(allValues(touched)).toEqual(allValues(world));
  });

  it('送れない軸では何も起きない ── 次元が なし（議事録の X・Y）', () => {
    // 旧 raise.spec「Z が 履歴：触っても上がらない」の後身。
    // 守っていた性質（触っても値は動かない）はまだ生きているので、期待値だけ新しい規則へ直した。
    const touched = focusOn(world, layout, 'g0', R);
    expect(allValues(touched)).toEqual(allValues(world));
    // X・Y は なし ＝ 何も起きない。Z（履歴の古さ）だけがその泡の面へ寄る（初稿は古さ 3）
    expect(placeOf(layout, 'g0').pos.z).toBe(3);
    expect(touched.bubble('giji')?.state.focus).toEqual({ x: 0, y: 0, z: 3 });
    // 触った泡は焦点の面なので原寸。手前になった新しい版は透視が消す（RULES.md「消す。止めない」）
    const after = resolveWorld(touched, VIEWPORT);
    expect(placeOf(after, 'g0').scale).toBe(1);
    expect(placeOf(after, 'g0').alpha).toBe(1);
    expect(['g1', 'g2', 'g3'].map((id) => placeOf(after, id).alpha)).toEqual([0, 0, 0]);
  });

  it('送れない軸では何も起きない ── 箱にぴったり（見えない親の中）', () => {
    // 旧 raise.spec「Z が なし：何も起きない」の後身。
    // ③ 見えない親の箱はヘッダ 0・余白 0 で中身ぴったりなので、焦点の約束が 0 へ戻す
    const touched = focusOn(world, layout, 'fA', R);
    expect(allValues(touched)).toEqual(allValues(world));
    // 残るのは約束の二分探索の粒（1e-6）だけ ＝ 画面はどこも動かない
    expect(Math.abs(touched.bubble('snap1')?.state.focus.x ?? 1)).toBeLessThan(1e-5);
    const after = resolveWorld(touched, VIEWPORT);
    for (const id of ['fA', 'fB'])
      expect(Math.abs(placeOf(after, id).x - placeOf(layout, id).x)).toBeLessThan(1e-5);
  });

  it('★ 平行の軸では寄らない ── 触れた＝もう見えている（横に並べる）', () => {
    // 横に並べる の箱は自前 368、中身は 80+14+104+14+128 ＝ 340。余りは 28 ＝ 片側 14。
    // 前は 中 の泡（位置 −24）を触ると焦点が −14 まで寄り、並びごと 14px ずれていた。
    // 平行は倍率が一定なので、寄っても見え方は 1mm も変わらない ── 動くのは中身だけ。だから動かさない。
    const before = world.bubble('row')?.state.focus.x;
    const touched = focusOn(world, layout, 'row1', R);
    expect(placeOf(layout, 'row1').pos.x).toBe(-24);
    expect(touched.bubble('row')?.state.focus.x).toBe(before);
    expect(allValues(touched)).toEqual(allValues(world));
    // 画面の上でも 1px も動かない（⑤ 触っていない泡は画面の上で動かない、を触った泡ごと守る）
    const after = resolveWorld(touched, VIEWPORT);
    for (const id of ['row0', 'row1', 'row2'])
      expect(placeOf(after, id).x - placeOf(layout, id).x).toBeCloseTo(0, 5);
    // ★ 焦点の約束そのものは変えていない ── 送れば今までどおり、箱の余りぶんで止まる
    const L = layout.spaces.get('row');
    expect(L && fitFocus(L, 'x', -24, 0, R)).toBeCloseTo(-14, 5);
  });

  it('★ Z：触った泡の面までカメラが寄る（勤務表 ＝ 自由Z 0.4）。値は書かない', () => {
    // 旧 raise.spec「★ Z が 自由座標：焦点の面まで上がって、そこで止まる」の後身 ── 向きが逆になった。
    // 旧：泡の 自由Z を焦点の面（0.2）へ**書いていた**。新：泡は動かず、焦点が泡の面（0.4）へ行く
    const touched = focusOn(world, layout, 'kinmu', R);
    expect(touched.bubble('kinmu')?.state.free.z).toBe(0.4);      // 値は書かれていない
    // X・Y は平行なので寄らない（触れた＝もう見えている）。動くのは透視の Z だけ
    expect(touched.state.root.focus).toEqual({ x: 0, y: 0, z: 0.4 });
    const after = resolveWorld(touched, VIEWPORT);
    expect(placeOf(after, 'kinmu').scale).toBe(1);                // dz 0 ＝ 原寸
    expect(placeOf(after, 'kinmu').alpha).toBe(1);
    // ★ 奥の泡を触ると、手前にいた泡は消える（RULES.md：消す。止めない。縁に積むのは ui の仕事）
    // 見ているのは「どれが消えたか」── 並びは描く順（焦点に近い順）なので、揃えてから比べる
    //
    // ★ `snap1`（見えない親）が**入った**のは 2026-09-23 の直し。
    //   ③ 見えない親は体を持たない ＝ 自分の奥行きも持たず、**中身と同じ面にいる**ことにした
    //   （ラボは奥行き 0 に置きっぱなしで、中の泡だけが退いて**点線の枠だけ原寸で残っていた**）。
    //   中身 fA・fB が面 0 にいて焦点が 0.4 なので、並びもそこで消える ── 筋が通っている。
    //   画面の見た目は前から変わらない：並びは「見えている子がいるときだけ見える」（resolveWorld の
    //   後処理）で、子が消えた時点で vis 0 ＝ 描かれていなかった。変わったのは alpha の値だけ。
    expect(after.order.filter((p) => p.space === 'root' && p.alpha === 0).map((p) => p.id).sort())
      .toEqual(['memo1', 'memo2', 'memo3', 'row', 'cover', 'fish', 'giji', 'fC', 'snap1'].sort());
  });

  it('★ raise は消えた：Z が 順序 の空間でも、触って並べ替わらない（重ねて置く）', () => {
    // 旧 raise.spec「Z が 順序：最前面（0）へ並べ替えて 0.. に詰め直す」の後身。
    // 守っていた性質（触ると最前面へ並べ替わる）は **規則から消えた** ので、期待値を逆にした。
    // 重なりの上下を変えたいなら掴んでドラッグする（② 書けるなら書く）。触るのは見ることであって動かすことではない
    const stacked = withPreset(labScene(), 'stackZ', 'root');
    const line = (w: BubbleWorld) =>
      w.kidsOf('root').slice().sort((a, b) => a.state.order - b.state.order)
        .map((b) => `${b.id}:${b.state.order}`).join(' ');
    const before = 'memo1:0 memo2:1 memo3:2 row:3 cover:4 fish:5 giji:6 kinmu:7 fC:8 snap1:9';
    expect(line(stacked)).toBe(before);
    let w = focusOn(stacked, resolveWorld(stacked, VIEWPORT), 'memo3', R);
    expect(line(w)).toBe(before);                                  // 並べ替わらない
    expect(w.state.root.focus.z).toBe(0.3);                        // 順序 2 × 間隔 0.15 の面へ寄る
    // 何度触ってもずれない（値を書かないので、そもそも動かしようがない）
    for (let i = 0; i < 5; i++) w = focusOn(w, resolveWorld(w, VIEWPORT), 'memo3', R);
    expect(line(w)).toBe(before);
    expect(w.state.root.focus).toEqual({ x: 0, y: 0, z: 0.3 });   // X・Y は平行なので寄らない
    expect(allValues(w)).toEqual(allValues(stacked));
  });

  it('★ 開いたものは、渡された窓の真ん中へ来る（岸が食い込むときは器が口そのものを渡す）', () => {
    const mid = { x: VIEWPORT.w / 2, y: VIEWPORT.h / 2 };
    const at = (w: BubbleWorld, id: string) => {
      const p = placeOf(resolveWorld(w, VIEWPORT), id);
      return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
    };
    // 窓の真ん中のあたり（透視の Z が挟まるので、当てて解き直しても数 px 残る）
    const centered = at(bringToCenter(world, VIEWPORT, 'kinmu', R), 'kinmu');
    expect(Math.abs(centered.x - mid.x)).toBeLessThan(16);
    expect(Math.abs(centered.y - mid.y)).toBeLessThan(16);
    // 狭い窓を渡せば、その窓の真ん中へ ── 岸が食い込んだときに器がこうする
    const narrow = { w: VIEWPORT.w / 2, h: VIEWPORT.h };
    const inNarrow = placeOf(
      resolveWorld(bringToCenter(world, narrow, 'kinmu', R), narrow), 'kinmu',
    );
    expect(Math.abs(inNarrow.x + inNarrow.w / 2 - narrow.w / 2)).toBeLessThan(16);
    // 値は1つも書かない ── 動くのは焦点だけ
    expect(allValues(bringToCenter(world, VIEWPORT, 'kinmu', R))).toEqual(allValues(world));
  });

  it('無い泡を触っても何も起きない', () => {
    expect(focusOn(world, layout, 'いない', R)).toBe(world);
  });
});
