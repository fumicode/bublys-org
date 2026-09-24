/**
 * 並べ方のアイコン ── **7 個をバラバラに描かない**。
 *
 * > **形が「並べる向き」（縦・横・格子）。大きさの付け方が「レンズ」。**
 *
 * - 平行 … どれも同じ大きさ
 * - 魚眼 … **同じ配置のまま、真ん中だけ大きい**（端は細く）
 * - 透視 … 1 つだけ語彙が違う。ずれながら小さくなり、**奥ほど薄い**
 *   （泡の描き方と同じ ── 奥行きは「真ん中が大きい」では言えない）
 *
 * 枠は 14×14。色は `currentColor`（× やロックと同じ扱い）。
 */
import type { FC } from 'react';
import type { PresetId } from '@bublys-org/bubble-layout';

const Svg: FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
    {children}
  </svg>
);

/** 縦リスト ── 同じ横棒が縦に 3 本 */
const ColumnIcon: FC = () => (
  <Svg>
    <rect x="1" y="1.6" width="12" height="2.6" rx="1" />
    <rect x="1" y="5.7" width="12" height="2.6" rx="1" />
    <rect x="1" y="9.8" width="12" height="2.6" rx="1" />
  </Svg>
);

/** 横リスト ── 同じ縦棒が横に 3 本 */
const RowIcon: FC = () => (
  <Svg>
    <rect x="1.6" y="1" width="2.6" height="12" rx="1" />
    <rect x="5.7" y="1" width="2.6" height="12" rx="1" />
    <rect x="9.8" y="1" width="2.6" height="12" rx="1" />
  </Svg>
);

/** 格子 ── 同じ四角が 2×2 */
const GridIcon: FC = () => (
  <Svg>
    <rect x="1" y="1" width="5.4" height="5.4" rx="1" />
    <rect x="7.6" y="1" width="5.4" height="5.4" rx="1" />
    <rect x="1" y="7.6" width="5.4" height="5.4" rx="1" />
    <rect x="7.6" y="7.6" width="5.4" height="5.4" rx="1" />
  </Svg>
);

/** 縦の魚眼 ── 縦リストのまま、真ん中の横棒だけ太く長い */
const CoverflowYIcon: FC = () => (
  <Svg>
    <rect x="2.5" y="1.5" width="9" height="2" rx="1" />
    <rect x="1" y="5.3" width="12" height="3.4" rx="1.2" />
    <rect x="2.5" y="10.5" width="9" height="2" rx="1" />
  </Svg>
);

/** 横の魚眼 ── 横リストのまま、真ん中の縦棒だけ太く高い */
const CoverflowIcon: FC = () => (
  <Svg>
    <rect x="1.5" y="2.5" width="2" height="9" rx="1" />
    <rect x="5.3" y="1" width="3.4" height="12" rx="1.2" />
    <rect x="10.5" y="2.5" width="2" height="9" rx="1" />
  </Svg>
);

/** 格子の魚眼 ── 3×3。中心がいちばん大きく、端へ行くほど小さい */
const CoverflowGridIcon: FC = () => {
  const at = [3, 7, 11];
  const size = (i: number, j: number) => {
    const d = Math.abs(i - 1) + Math.abs(j - 1);
    return d === 0 ? 4.6 : d === 1 ? 3.2 : 2.2;
  };
  return (
    <Svg>
      {at.map((cx, i) =>
        at.map((cy, j) => {
          const s = size(i, j);
          return <rect key={`${i}-${j}`} x={cx - s / 2} y={cy - s / 2} width={s} height={s} rx={s / 4} />;
        }),
      )}
    </Svg>
  );
};

/**
 * 透視ビュー ── 右上へ逃げながら小さくなる 3 枚。
 * **奥ほど薄い**（泡と同じ）。ここだけ「真ん中が大きい」の語彙を使わない。
 */
const StackDepthIcon: FC = () => (
  <Svg>
    <rect x="7.4" y="1.2" width="5.4" height="5.4" rx="1.2" opacity="0.4" />
    <rect x="4.2" y="3.8" width="6.4" height="6.4" rx="1.3" opacity="0.68" />
    <rect x="1" y="6.6" width="7.4" height="7.4" rx="1.4" />
  </Svg>
);

/**
 * **箱も広げる** ── 中身が増えたら窓の大きさも変わる。枠と、外へ開く矢印。
 */
export const GrowIcon: FC = () => (
  <Svg>
    <rect x="4.2" y="3.4" width="5.6" height="7.2" rx="1.2" />
    <path d="M3.1 4.4 L0.6 7 L3.1 9.6 Z" />
    <path d="M10.9 4.4 L13.4 7 L10.9 9.6 Z" />
  </Svg>
);

/**
 * **箱はそのまま** ── 入らないぶんは見切れる（動かして見に行く）。
 * 枠は動かず、中身が右へはみ出して切れている。
 */
export const FixedIcon: FC = () => (
  <Svg>
    <rect
      x="1.2"
      y="2.6"
      width="8.2"
      height="8.8"
      rx="1.3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <rect x="3" y="4.6" width="10.6" height="1.6" rx="0.8" />
    <rect x="3" y="7.8" width="10.6" height="1.6" rx="0.8" />
  </Svg>
);

/** 並べ方の口に出す 7 つ。平行 3 → 魚眼 3 → 透視 の順に並べる */
export const VIEW_CHOICES: readonly {
  readonly id: PresetId;
  readonly label: string;
  readonly Icon: FC;
  /** この前で少し隙間を空ける（語彙のかたまりが見えるように） */
  readonly gapBefore?: boolean;
}[] = [
  { id: 'column', label: '縦に並べる', Icon: ColumnIcon },
  { id: 'row', label: '横に並べる', Icon: RowIcon },
  { id: 'grid', label: '格子に並べる', Icon: GridIcon },
  { id: 'coverflowY', label: '縦の魚眼（真ん中が原寸）', Icon: CoverflowYIcon, gapBefore: true },
  { id: 'coverflow', label: '横の魚眼（真ん中が原寸）', Icon: CoverflowIcon },
  { id: 'coverflowGrid', label: '折り返す魚眼（中心が原寸）', Icon: CoverflowGridIcon },
  { id: 'stackDepth', label: '奥行きに重ねる', Icon: StackDepthIcon, gapBefore: true },
];
