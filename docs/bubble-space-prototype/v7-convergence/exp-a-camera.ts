// 実験：旧の文型を、いまの規則（Z＝自由Z·そのまま·透視）だけで書けるか。規則もライブラリも1行も変えない。
import { Bubble, emptyWorld, presetView, resolveWorld, axisToScreen, screenToAxis } from '../../../bublys-libs/bubble-layout/src/index.ts';
import type { BubbleWorld } from '../../../bublys-libs/bubble-layout/src/index.ts';

const VP = { w: 1440, h: 809.5 };
const STEP = (1 / 0.9 - 1) / 0.26;          // 1段で 0.90 になる dz（= 0.4274）
const show = (tag: string, w: BubbleWorld) => {
  const L = resolveWorld(w, VP);
  console.log('\n# ' + tag + '   焦点z=' + w.focusOf('root').z.toFixed(4));
  for (const p of [...L.order].sort((a, b) => a.x - b.x))
    console.log('  ' + p.id.padEnd(8), 'x', p.x.toFixed(1).padStart(7), '…', (p.x + p.w).toFixed(1).padStart(7),
      ' 倍率', p.scale.toFixed(4), ' alpha', p.alpha, ' vis', p.vis);
  return L;
};

/** 開く（別の種類）＝ いちばん手前より1段手前に置き、Z の焦点をそこへ送る。元の泡の「下がった後の右辺」に接して置く */
function openChild(w: BubbleWorld, openerId: string, id: string, size: { w: number; h: number }): BubbleWorld {
  const opener = w.bubble(openerId)!;
  const frontZ = Math.min(...w.kidsOf('root').map((b) => b.state.free.z)) - STEP;
  // 先に焦点を送った世界で、元の泡の右辺が画面のどこに来るかを読む（＝旧の toLayerBelow().toGlobal()）
  const moved = w.withFocus('root', { z: frontZ });
  const L = resolveWorld(moved, VP);
  const po = L.byId.get(openerId)!;
  const S = L.spaces.get('root')!;
  const leftOnScreen = po.x + po.w;                         // 元の泡の、下がった後の右辺（画面）
  const xLeft = screenToAxis(S, 'x', leftOnScreen, 1);      // それを「焦点の面（m=1）」の座標へ戻す
  const topOnScreen = po.y;
  const yTop = screenToAxis(S, 'y', topOnScreen, 1);
  return moved.add(Bubble.create({ id, title: id, hue: 120, w: size.w, h: size.h, parent: null, order: 0,
    free: { x: xLeft + size.w / 2, y: yTop + size.h / 2, z: frontZ } }));
}
/** 開く（同じ種類）＝ 兄弟と同じ面に、その右へ接して置く。焦点は動かない */
function openSibling(w: BubbleWorld, mateId: string, id: string, size: { w: number; h: number }): BubbleWorld {
  const m = w.bubble(mateId)!;
  return w.add(Bubble.create({ id, title: id, hue: 40, w: size.w, h: size.h, parent: null, order: 0,
    free: { x: m.state.free.x + m.state.size.w / 2 + size.w / 2, y: m.state.free.y, z: m.state.free.z } }));
}
/** 閉じる ＝ 消す。焦点は「残った中でいちばん手前」へ（面が空いたら、後ろが上がってくる） */
function close(w: BubbleWorld, id: string): BubbleWorld {
  const n = w.without(id);
  const front = Math.min(...n.kidsOf('root').map((b) => b.state.free.z));
  return n.withFocus('root', { z: front });
}

let w = emptyWorld(presetView('free'));
w = w.add(Bubble.create({ id: 'groups', title: 'groups', hue: 280, w: 183, h: 230, parent: null, order: 0, free: { x: -470, y: -190, z: 0 } }));
w = w.add(Bubble.create({ id: 'list', title: 'list', hue: 230, w: 245, h: 720, parent: null, order: 0, free: { x: -100, y: 40, z: 0 } }));
show('0 はじめ（旧：groups 1.0 / list 0.9 だが、ここは同じ面に置いた）', w);
w = openChild(w, 'list', 'd1', { w: 300, h: 300 });   const L1 = show('1 詳細1を開く', w);
w = openSibling(w, 'd1', 'd2', { w: 300, h: 300 });   show('2 詳細2（同じ種類）', w);
w = openSibling(w, 'd2', 'd3', { w: 300, h: 300 });   show('3 詳細3（同じ種類）', w);
{ const l = L1.byId.get('list')!, d = L1.byId.get('d1')!; console.log('\n  ★ 一覧の右辺 と 詳細1の左辺 の隙間', (d.x - (l.x + l.w)).toFixed(4), 'px'); }
w = openChild(w, 'd3', 'e1', { w: 320, h: 240 });     show('4 詳細3からさらに開く（3段目）', w);
w = close(w, 'e1');                                    show('5 それを閉じる', w);
w = close(w, 'd3'); w = close(w, 'd2');                show('6 詳細を2つ閉じる（兄弟は動かないか）', w);
w = close(w, 'd1');                                    show('7 全部閉じる（一覧が上がってくるか）', w);
