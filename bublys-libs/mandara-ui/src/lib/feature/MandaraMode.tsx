"use client";
/**
 * **曼荼羅に入っているかどうか。**
 *
 * > 入れたときだけ仕切りが出て、泡が区画に収まる。切れば、元の海に戻る。
 *
 * ★ モードは**海の状態**であって、泡の値ではない ── 世界には1ミリも書かない
 *   （風・針のモードと同じ扱い）。だから context で持つ。
 */
import { createContext, useContext, type FC } from 'react';
import { useBubbleBox } from '@bublys-org/bubbles-ui';
import { EDGE } from '../domain/mandara.js';

export interface MandaraMode {
  readonly on: boolean;
  readonly toggle: () => void;
}

export const MandaraModeContext = createContext<MandaraMode>({ on: false, toggle: () => undefined });
export const useMandaraMode = (): MandaraMode => useContext(MandaraModeContext);

/**
 * **アイコンだけにする大きさ。**「入／切の札と、押し方の説明が入らないなら、面を出す意味がない」で決める。
 * ポケットと同じく**縦も横も足りないときだけ**畳む（片方に余地があるなら中身を出す）。
 */
const COMPACT = { width: 120, height: 92 };

/**
 * **曼荼羅の印。**
 *
 * 絵は規則そのもの ── 端の帯は `EDGE`（1/6）、中央はその残り。
 * 数を別に持つと、規則を変えたとき絵だけが古くなる。
 */
const Glyph: FC<{ readonly on: boolean; readonly size: number }> = ({ on, size }) => {
  const e = size * EDGE;
  const inner = size - e * 2;
  const line = { stroke: 'currentColor', strokeWidth: 1, opacity: 0.45 };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect x={0.5} y={0.5} width={size - 1} height={size - 1} rx={3} fill="none" {...line} />
      {/* 中央 ── 入っているときだけ塗る */}
      <rect x={e} y={e} width={inner} height={inner} fill="currentColor" opacity={on ? 0.9 : 0.18} />
      {/* 仕切り 4 本 */}
      <line x1={e} y1={0} x2={e} y2={size} {...line} />
      <line x1={size - e} y1={0} x2={size - e} y2={size} {...line} />
      <line x1={0} y1={e} x2={size} y2={e} {...line} />
      <line x1={0} y1={size - e} x2={size} y2={size - e} {...line} />
    </svg>
  );
};

/**
 * **入り切りをする泡の中身。**
 *
 * > **場が測って箱を配る。中身は配られた箱で姿を決める。**
 *
 * 小さい箱を配られたら印だけになり、**その印そのものが入り切りの口**になる
 * （ポケットと同じ作法 ── 専用の開閉ボタンを持たない）。
 */
export const MandaraModeBubble: FC = () => {
  const { on, toggle } = useMandaraMode();
  /** 配られる前（`null`）は広いものとして扱う ── 一瞬アイコンが見えて消える、を避ける */
  const box = useBubbleBox();
  const compact = !!box && box.width < COMPACT.width && box.height < COMPACT.height;

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        title={on ? '曼荼羅：入（押すと切）' : '曼荼羅：切（押すと入）'}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: on ? '#8ad7ff' : '#9aa6bb',
        }}
      >
        <Glyph on={on} size={Math.max(16, Math.min(28, Math.min(box.width, box.height) - 16))} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.2)',
          background: on ? '#16202e' : '#e9edf3',
          color: on ? '#ffffff' : '#16202e',
          cursor: 'pointer',
          font: 'inherit',
        }}
      >
        <Glyph on={on} size={18} />
        {on ? '曼荼羅：入' : '曼荼羅：切'}
      </button>
      <div style={{ fontSize: 11, lineHeight: 1.5, opacity: 0.7 }}>
        7 8 9 / 4 6 / 1 2 3 でその向きへ
        <br />
        5 で中へ、0 で戻る
      </div>
    </div>
  );
};
