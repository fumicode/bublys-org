// 実験B：Z の「詰める」の帯の幅を step にした写しで、旧の layers がそのまま出るか。
//   開く＝「いちばん手前より小さい値を書く」だけ。閉じる＝消すだけ。★ 焦点は1回も書かない。
import { Bubble, emptyWorld, presetView, resolveWorld, screenToAxis } from './.tmp/bl-copy/index.ts';
import type { BubbleWorld, View } from './.tmp/bl-copy/index.ts';

const VP = { w: 1440, h: 809.5 };
const STEP = (1 / 0.9 - 1) / 0.26;
const base = presetView('free');
const VIEW: View = { ...base, z: { dim: 'free.z', arrange: 'pack', lens: 'perspective', step: STEP } };

const show = (tag: string, w: BubbleWorld) => {
  const L = resolveWorld(w, VP);
  console.log('\n# ' + tag + '   焦点z=' + w.focusOf('root').z);
  for (const p of [...L.order].sort((a, b) => a.x - b.x))
    console.log('  ' + p.id.padEnd(8), 'x', p.x.toFixed(1).padStart(7), '…', (p.x + p.w).toFixed(1).padStart(7), ' 倍率', p.scale.toFixed(4), ' 値z', p.b.state.free.z);
  return L;
};
const mk = (id: string, w: number, h: number, x: number, y: number, z: number) =>
  Bubble.create({ id, title: id, hue: 200, w, h, parent: null, order: 0, free: { x, y, z } });

/** 開く（別の種類）＝ いちばん手前より小さい値を書く。元の泡の「下がった後の右辺」に接して置く */
function openChild(w: BubbleWorld, openerId: string, id: string, size: { w: number; h: number }): BubbleWorld {
  const z = Math.min(...w.kidsOf('root').map((b) => b.state.free.z)) - 1;
  // 仮に置いて解き、元の泡が下がった後の右辺を読む → 焦点の面（m=1）の座標へ戻す
  const probe = w.add(mk(id, size.w, size.h, 0, 0, z));
  const L = resolveWorld(probe, VP); const S = L.spaces.get('root')!; const po = L.byId.get(openerId)!;
  const x = screenToAxis(S, 'x', po.x + po.w, 1) + size.w / 2;
  const y = screenToAxis(S, 'y', po.y, 1) + size.h / 2;
  return w.add(mk(id, size.w, size.h, x, y, z));
}
function openSibling(w: BubbleWorld, mateId: string, id: string, size: { w: number; h: number }): BubbleWorld {
  const m = w.bubble(mateId)!.state;
  return w.add(mk(id, size.w, size.h, m.free.x + m.size.w / 2 + size.w / 2, m.free.y, m.free.z));
}

let w = emptyWorld(VIEW);
w = w.add(mk('groups', 183, 230, -470, -190, 0)).add(mk('list', 245, 720, -100, 40, 0));
show('0 はじめ', w);
w = openChild(w, 'list', 'd1', { w: 300, h: 300 });  const L1 = show('1 詳細1を開く', w);
{ const l = L1.byId.get('list')!, d = L1.byId.get('d1')!; console.log('  ★ 一覧の右辺 と 詳細1の左辺 の隙間', (d.x - (l.x + l.w)).toFixed(4), 'px'); }
w = openSibling(w, 'd1', 'd2', { w: 300, h: 300 });
w = openSibling(w, 'd2', 'd3', { w: 300, h: 300 });  show('3 詳細を3つ', w);
w = openChild(w, 'd3', 'e1', { w: 320, h: 240 });    show('4 詳細3からさらに開く（3段目）', w);
// ★ 旧で出せなかった場面：真ん中の面だけ空にする
let mid = w.without('d1').without('d2').without('d3'); show('5 真ん中の面（詳細3つ）だけ閉じる ── 空の段は詰むか', mid);
w = w.without('e1');                                  show('6 3段目を閉じる', w);
w = w.without('d3').without('d2').without('d1');      show('7 全部閉じる', w);
