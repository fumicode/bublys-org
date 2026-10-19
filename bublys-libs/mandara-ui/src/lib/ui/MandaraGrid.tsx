/**
 * **仕切りを描く。** それだけ。
 *
 * ★ 何本引くかは `mandaraOf` が決めている ── ここは受け取った線を出すだけで、
 *   どの向きに泡が居るかを知らない（ui は domain にしか依らない）。
 */
import type { CSSProperties, FC } from 'react';
import type { Mandara } from '../domain/mandara.js';

export interface MandaraGridProps {
  readonly mandara: Mandara;
  readonly color?: string;
  readonly thickness?: number;
}

export const MandaraGrid: FC<MandaraGridProps> = ({
  mandara,
  color = 'rgba(255, 255, 255, 0.18)',
  thickness = 1,
}) => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
    {mandara.lines.map((l) => {
      const style: CSSProperties =
        l.axis === 'v'
          ? { position: 'absolute', top: 0, bottom: 0, left: l.at, width: thickness, background: color }
          : { position: 'absolute', left: 0, right: 0, top: l.at, height: thickness, background: color };
      return <div key={`${l.axis}${l.at}`} style={style} />;
    })}
  </div>
);
