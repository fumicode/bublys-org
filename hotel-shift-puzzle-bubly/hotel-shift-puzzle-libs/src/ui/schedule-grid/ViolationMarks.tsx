import type { CSSProperties, FC } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { ConstraintViolation } from "../../domain/index.js";
import type { ViolationMark } from "./violationMarkPlacement.js";

type ViolationMarksProps = {
  /** このセルに置く印（violationMarksOf の結果のうち、anchorDay がこのセルの日のもの）。 */
  marks: readonly ViolationMark[];
  /** 違反バブルの URL を作る。無ければ印だけを出す（開けない）。 */
  violationUrl?: (violation: ConstraintViolation) => string;
};

/**
 * セルに重ねる違反の印（連勤の赤帯・勤務間インターバルの境目の印）。
 *
 * 違反1件につき印は1つ。違反が覆う範囲の末尾のセルに置き、そこから左へ伸ばす
 * （置き場所の決め方は violationMarkPlacement.ts）。帯の長さは --span（覆う列の数）から CSS で出す。
 *
 * ObjectView がダブルクリックでの違反バブル展開と data-url（origin-side で印の近くに出す）を担う。
 * 印は末尾のセルの子なので、印の上の操作はセルへ伝播させない（押しても末尾のセルが選択されたり、
 * ダブルクリックで候補ドロップダウンが開いたりしない）。
 *
 * ★ 位置を持つ枠（position:absolute）と ObjectView を分ける。ObjectView は膜のために
 *   position:relative を持つので、枠を ObjectView で包むと枠の基準が幅0の ObjectView になり、
 *   帯が潰れて見えなくなる（#158）。ObjectView は枠の内側に置き、枠いっぱいに広げて当たり判定にする。
 */
export const ViolationMarks: FC<ViolationMarksProps> = ({
  marks,
  violationUrl,
}) => (
  <>
    {marks.map(({ kind, violation, span }) => {
      // 境目の丸は帯からはみ出すので、当たり判定（ObjectView）の子として描く。
      // 枠の ::after で描くと丸の上の操作が ObjectView に届かず、丸からバブルを開けない。
      const dot =
        kind === "interval" ? <span className="e-interval-dot" /> : null;
      return (
        <span
          key={violation.key}
          className={kind === "interval" ? "e-interval-bar" : "e-violation-bar"}
          style={{ ["--span" as string]: span } as CSSProperties}
          title={`${violation.message}（ダブルクリックで詳細）`}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {violationUrl ? (
            <ObjectView
              url={violationUrl(violation)}
              openingPosition="origin-side"
              draggable={false}
              fullWidth
              className="e-violation-hit"
            >
              {dot}
            </ObjectView>
          ) : (
            dot
          )}
        </span>
      );
    })}
  </>
);
