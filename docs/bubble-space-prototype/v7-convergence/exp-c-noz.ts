/**
 * 実験 C ── 「Z を使わない」で、旧の文型（一覧 → 詳細を続けて開く）を書けるか。
 *
 * masa さんの問い：この規則の上でも Z は要らないのでは。
 *
 * ここで確かめるのは 2 つ：
 *   C1 … X＝自由X·そのまま·**魚眼**、Z＝なし·平ら。開くたびに **X の焦点を新しい泡へ送る**。
 *        見えない親に**まとめない**（v6 が 0.755 に落ちたのは、まとめた並びの幅に罰が出たから）
 *   C2 … 同じ並びを、まとめた場合（v6 と同じ形）。C1 との差が「まとめ」の寄与
 *
 * 規則もライブラリも 1 行も変えない。見るのは倍率と、関心の順（詳細 ＞ 一覧）。
 */
import { Bubble, emptyWorld, presetView, resolveWorld, screenToAxis } from '../../../bublys-libs/bubble-layout/src/index.ts';
import type { BubbleWorld } from '../../../bublys-libs/bubble-layout/src/index.ts';

const VP = { w: 1440, h: 809.5 };

/** X＝自由X·そのまま·魚眼／Y＝自由Y·そのまま·平行／Z＝なし·平ら（＝ Z を使わない） */
const viewNoZ = () => {
  const v = presetView('free');
  return { x: { ...v.x, lens: 'fisheye' as const }, y: { ...v.y }, z: { ...v.z, dim: 'none' as const, lens: 'flat' as const } };
};

const show = (tag: string, w: BubbleWorld) => {
  const L = resolveWorld(w, VP);
  const f = w.focusOf('root');
  console.log('\n# ' + tag + '   焦点x=' + f.x.toFixed(1));
  for (const p of [...L.order].sort((a, b) => a.x - b.x))
    console.log('  ' + p.id.padEnd(8), 'x', p.x.toFixed(1).padStart(8), '…', (p.x + p.w).toFixed(1).padStart(8), ' 倍率', p.scale.toFixed(4));
  return L;
};

/** 開く ＝ 元の泡の右辺に接して置き、X の焦点を新しい泡へ送る（まとめない） */
function openBeside(w: BubbleWorld, fromId: string, id: string, size: { w: number; h: number }, hue = 120): BubbleWorld {
  const from = w.bubble(fromId)!;
  const x = from.state.free.x + from.state.size.w / 2 + size.w / 2;
  const y = from.state.free.y - from.state.size.h / 2 + size.h / 2;
  const next = w.add(Bubble.create({ id, title: id, hue, w: size.w, h: size.h, parent: null, order: 0, free: { x, y, z: 0 } }));
  // ② 触る ＝ 焦点が寄る。開いたものを見たいので、そこへ寄せる
  return next.withFocus('root', { x, y: 0 });
}

/** 閉じる ＝ 消して、残った中でいちばん新しいものへ焦点を送る */
function close(w: BubbleWorld, id: string, focusOn: string | null): BubbleWorld {
  const n = w.without(id);
  const b = focusOn ? n.bubble(focusOn) : null;
  return b ? n.withFocus('root', { x: b.state.free.x, y: 0 }) : n;
}

const startWorld = () => {
  let w = emptyWorld(viewNoZ());
  w = w.add(Bubble.create({ id: 'groups', title: 'groups', hue: 280, w: 183, h: 230, parent: null, order: 0, free: { x: -470, y: -190, z: 0 } }));
  w = w.add(Bubble.create({ id: 'list', title: 'list', hue: 230, w: 245, h: 720, parent: null, order: 0, free: { x: -100, y: 40, z: 0 } }));
  return w.withFocus('root', { x: -100, y: 0 });
};

console.log('═══ C1 ── Z を使わない（X 魚眼・まとめない）═══');
let w = startWorld();
show('0 はじめ（焦点は一覧）', w);
w = openBeside(w, 'list', 'd1', { w: 300, h: 300 });  const A1 = show('1 詳細1を開く', w);
w = openBeside(w, 'd1', 'd2', { w: 300, h: 300 });    show('2 詳細2', w);
w = openBeside(w, 'd2', 'd3', { w: 300, h: 300 });    const A3 = show('3 詳細3', w);

const at = (L: ReturnType<typeof resolveWorld>, id: string) => L.byId.get(id)!;
console.log('\n── 詳細3つを開いた時点 ──');
for (const id of ['groups', 'list', 'd1', 'd2', 'd3']) console.log('  ' + id.padEnd(7), '倍率', at(A3, id).scale.toFixed(4));
console.log('  関心の順（いま見ている d3 ＞ 一覧）:', at(A3, 'd3').scale > at(A3, 'list').scale ? '保たれる' : '★ 逆転');
console.log('  一覧の右辺 と 詳細1の左辺 の隙間:', (at(A1, 'd1').x - (at(A1, 'list').x + at(A1, 'list').w)).toFixed(4), 'px');

// 兄弟を1つ閉じたとき、残りが画面の上で動くか（⑤）
const beforeClose = { d1: at(A3, 'd1').x, d2: at(A3, 'd2').x };
const w2 = close(w, 'd3', 'd2');
const A4 = resolveWorld(w2, VP);
console.log('  詳細3を閉じたとき d1 が動いた量:', Math.abs(A4.byId.get('d1')!.x - beforeClose.d1).toFixed(2), 'px',
            '／ d2:', Math.abs(A4.byId.get('d2')!.x - beforeClose.d2).toFixed(2), 'px');

console.log('\n═══ C2 ── 同じ並びを「まとめた」場合（v6 と同じ形）═══');
{
  let w = startWorld();
  w = openBeside(w, 'list', 'd1', { w: 300, h: 300 });
  // まとめる ＝ d1 の中に入れて横に並べる（見えない親の代わりに、親を1つ作って row で並べる）
  w = w.withView('d1', presetView('row'));
  w = w.add(Bubble.create({ id: 'd2', title: 'd2', hue: 120, w: 300, h: 300, parent: 'd1', order: 1, free: { x: 0, y: 0, z: 0 } }));
  w = w.add(Bubble.create({ id: 'd3', title: 'd3', hue: 120, w: 300, h: 300, parent: 'd1', order: 2, free: { x: 0, y: 0, z: 0 } }));
  const L = show('3 詳細3つ（まとめた）', w);
  for (const id of ['list', 'd1', 'd2', 'd3']) console.log('  ' + id.padEnd(7), '倍率', L.byId.get(id)!.scale.toFixed(4));
  console.log('  関心の順:', L.byId.get('d3')!.scale > L.byId.get('list')!.scale ? '保たれる' : '★ 逆転');
}
