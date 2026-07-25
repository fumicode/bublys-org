import { FC, RefObject, useLayoutEffect, useState } from "react";

type Props = {
  /** グリッド本体（.e-grid）。セル座標の測定基準にする（ConstraintHoverOverlay と同じ流儀）。 */
  gridRef: RefObject<HTMLDivElement | null>;
  /**
   * ヒントを出す起点セルの data-cell-key（例: "staffId:dayKey" のスタッフ×日セル、
   * "demand:shiftId:dayKey" の人数不足セルなど）。呼び出し側のキー形式には依存しない。
   */
  cellKey: string;
  /** 解消案の説明（例: 「早番にすると解消できそうです」）。 */
  summary: string;
  onApply: () => void;
};

type Pos = { left: number; top: number };

/**
 * 制約エラー・人数不足が出ているセルをホバーしたときだけ、ふわっと出てくる解消案のヒント。
 * バブルを開く/世界線に分岐を作るような重い操作は挟まず、その場でクリックして適用するだけ。
 * data-cell-key を自身にも持たせ、カード上へマウスを移してもホバー中セル判定が外れないようにする。
 * 見た目は schedule-grid/styles.ts の e-constraint-fix-hint 系クラスに任せる。
 */
export const ConstraintFixHint: FC<Props> = ({
  gridRef,
  cellKey,
  summary,
  onApply,
}) => {
  const [pos, setPos] = useState<Pos | null>(null);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    const el = grid?.querySelector<HTMLElement>(`[data-cell-key="${cellKey}"]`);
    if (!el) {
      setPos(null);
      return;
    }
    setPos({
      left: el.offsetLeft + el.offsetWidth / 2,
      top: el.offsetTop + el.offsetHeight,
    });
  }, [gridRef, cellKey]);

  if (!pos) return null;

  return (
    <div
      className="e-constraint-fix-hint"
      data-cell-key={cellKey}
      style={{ left: pos.left, top: pos.top }}
    >
      <p>{summary}</p>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onApply}
      >
        この案を適用
      </button>
    </div>
  );
};
