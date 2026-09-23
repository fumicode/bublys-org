/**
 * 実験 C/D を、触れる形で。──「Z を使わない」で旧の文型と重なりが出るか。
 *
 * 見るのは 2 つ:
 *   ① 重なり ── 魚眼だけでは重ならない（レンズは単調）。**重ねるのは並べ方**。
 *      同じあたりに置けば重なり、**焦点に近い＝大きいほうが手前**になる
 *   ② 触ると入れ替わる ── 泡をクリックすると焦点が寄り、前後が入れ替わる。
 *      **泡の値は 1 バイトも書かない**（規則②）
 *
 * ライブラリは 1 行も変えていない。上のボタンは View（軸ごとの 次元・並べ方・レンズ）を
 * 差し替えているだけ。
 */
import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bubble, emptyWorld, focusOn, presetView, resolveWorld } from '@bublys-org/bubble-layout';
import type { BubbleId, BubbleWorld, View } from '@bublys-org/bubble-layout';
import { BubbleField, DRAW_MIN, FIELD_CSS, MARKS_CSS, useBubbleInput } from '@bublys-org/bubble-layout-ui';

const VP = { w: 1280, h: 620 };

/** Z を使わない：X＝自由X・そのまま・魚眼／Z＝なし・平ら */
const viewNoZ = (): View => {
  const v = presetView('free');
  return { x: { ...v.x, lens: 'fisheye' }, y: { ...v.y }, z: { ...v.z, dim: 'none', lens: 'flat' } };
};
/** Z を使う：旧の面に当たる（自由Z・詰める・透視） */
const viewZ = (): View => {
  const v = presetView('free');
  return { x: { ...v.x }, y: { ...v.y }, z: { ...v.z, arrange: 'pack', step: (1 / 0.9 - 1) / 0.26 } };
};

type Mode = 'noz' | 'z';

/** 一覧 1 枚 ＋ 詳細 3 枚。詳細は**重なるように**置く（並べ方が重なりを作る） */
function scene(mode: Mode): BubbleWorld {
  let w = emptyWorld(mode === 'noz' ? viewNoZ() : viewZ());
  w = w.add(Bubble.create({ id: '一覧', title: '一覧', hue: 230, w: 260, h: 420, parent: null, order: 0,
    free: { x: -380, y: 0, z: 0 } }));
  // 詳細は少しずつずらして重ねる。Z ありのときだけ z を 1 段ずつ手前に
  const STEP = (1 / 0.9 - 1) / 0.26;
  ['詳細1', '詳細2', '詳細3'].forEach((id, i) => {
    w = w.add(Bubble.create({ id, title: id, hue: 120 + i * 40, w: 320, h: 300, parent: null, order: i + 1,
      free: { x: 40 + i * 120, y: -40 + i * 60, z: mode === 'z' ? -STEP * (i + 1) : 0 } }));
  });
  return w.withFocus('root', { x: 40, y: 0, z: mode === 'z' ? -STEP * 3 : 0 });
}

function Demo() {
  const [mode, setMode] = useState<Mode>('noz');
  const [world, setWorld] = useState<BubbleWorld>(() => scene('noz'));
  const [selectedId, setSelectedId] = useState<BubbleId | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);

  const base = resolveWorld(world, VP);
  const input = useBubbleInput({
    world, setWorld, layout: base, viewport: VP,
    selectedId, setSelectedId, drawMin: DRAW_MIN, layerRef,
  });
  const layout = input.layout;
  const rows = layout.order.map((p) => ({ id: p.id, scale: p.scale }));

  const switchTo = (m: Mode) => { setMode(m); setWorld(scene(m)); setSelectedId(null); };

  return (
    <>
      <style>{FIELD_CSS + MARKS_CSS}</style>
      <div id="bar">
        <b>Z は要るか ── 同じ場面を2通りで</b>
        <span className="sep" />
        <button className={mode === 'noz' ? 'on' : ''} onClick={() => switchTo('noz')}>Z なし（X 魚眼）</button>
        <button className={mode === 'z' ? 'on' : ''} onClick={() => switchTo('z')}>Z あり（面＝旧の layers）</button>
        <span className="sep" />
        <span className="hint">泡をクリック → 焦点が寄る（値は書かない）／ ヘッダで掴む／ 背景ドラッグで視点</span>
      </div>
      <div id="read">
        {rows.map((r) => (
          <span key={r.id} className="chip">{r.id} <b>{r.scale.toFixed(3)}</b></span>
        ))}
        <span className="chip dim">後ろ → 手前の順</span>
      </div>
      <div id="stage" style={{ position: 'absolute', left: 0, top: 78, width: VP.w, height: VP.h, overflow: 'hidden', touchAction: 'none', background: 'radial-gradient(circle 900px at 50% 50%,#141a2b 0%,#080a11 100%)' }}>
        <BubbleField
          world={world} layout={layout} viewport={VP} drawMin={DRAW_MIN}
          selectedId={selectedId} skipGrab={input.skipGrab} marks={input.marks}
          layerRef={layerRef} {...input.handlers}
        />
      </div>
    </>
  );
}

const host = document.getElementById('root');
if (host) createRoot(host).render(<Demo />);
