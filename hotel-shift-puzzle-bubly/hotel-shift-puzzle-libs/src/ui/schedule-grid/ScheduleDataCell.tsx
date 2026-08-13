import { FC, useContext } from "react";
import {
  ObjectView,
  urlProps,
  BubblesContext,
  CurrentBubbleContext,
} from "@bublys-org/bubbles-ui";
import type { WorkShift, ConstraintViolation, ShiftCell } from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";
import { wishText, type WishEntry } from "./wishSummary.js";
import { DAY_OFF_WISH, workWishKey } from "../shiftWishOptions.js";

type ScheduleDataCellProps = {
  /** セルの状態（出勤・休み・未定） */
  cell: ShiftCell;
  /** 出勤のとき解決済みの勤務帯（未解決/休み/未定なら undefined） */
  shift?: WorkShift;
  /** 未割当セルに薄く出す希望ヒント */
  wishEntries: WishEntry[];
  /** 範囲違反（連勤など複数日）。下端の赤帯で表す */
  rangeViolation?: ConstraintViolation;
  /** 単日違反（希望の食い違い）。希望の円をオレンジにして表す（旧: 右上の ⊿） */
  pointViolation?: ConstraintViolation;
  /** セルを一意に指すキー（"staffId:dayKey"）。候補ドロップダウンのアンカー特定に使う */
  cellKey: string;
  /** キーボード操作でフォーカス中のセルか */
  selected?: boolean;
  /** 入力中バッファ（このセルで打ち込み中の文字列）。null なら非表示 */
  inputBuffer?: string | null;
  /** シングルクリックでこのセルを選択する */
  onSelect: () => void;
  /** ダブルクリックで候補ドロップダウンを開く（マウス操作用） */
  onOpenEditor: () => void;
  /**
   * 違反バブルの URL を作る。違反マーカー（赤帯・⊿）を ObjectView で包んで渡し、
   * ダブルクリックで違反バブルを開く。ObjectView が data-url も埋めるので、
   * origin-side で開いたバブルがそのマーカーの近くに出る。
   */
  violationUrl?: (violation: ConstraintViolation) => string;
  /** 行の強調/減光用に付ける追加クラス（選択モード時の is-focused / is-dimmed）。 */
  cellClassName?: string;
};


/**
 * 勤務表の 1 セル（スタッフ×日）の純粋表示。
 * 出勤＝開始時刻の「時」だけ（勤務帯は背景色で区別）、休み＝「休」、未定＝希望 or「·」。
 *
 * シフト希望は、実際の割当と同じ1文字（休 / 7 …）を「文字色と同じ色の円」で囲んで出す。
 *   - まだ何も入っていないセル … 希望の候補すべてを円で横に並べる（中央・通常サイズ）
 *   - 実際の値が入ったセル       … 円は1つだけに絞り、小さくなって左上の角へ退避
 *                                 （角から少しはみ出す）。残すのは「その割当に対応する希望」
 *                                 ＝叶ったシフトの色の円
 *   - 希望と違う勤務帯になった   … 円をオレンジにする（＝旧・右上の ⊿ の代わり。
 *                                   ダブルクリックで違反バブルを開けるのも円が引き継ぐ）
 * 範囲違反（連勤など）は従来どおり下端の赤帯。
 * シングルクリックで選択、ダブルクリックで候補ドロップダウン（キーボード操作と共通）。
 */
export const ScheduleDataCell: FC<ScheduleDataCellProps> = ({
  cell,
  shift,
  wishEntries,
  rangeViolation,
  pointViolation,
  cellKey,
  selected = false,
  inputBuffer = null,
  onSelect,
  onOpenEditor,
  violationUrl,
  cellClassName,
}) => {
  // 希望の円から違反バブルを開くため（ObjectView で包むと円が remount してアニメが消えるので、
  // 円自身にダブルクリックを持たせる。data-url は urlProps で付けて link bubble の起点にする）
  const { openBubble } = useContext(BubblesContext);
  const currentBubbleId = useContext(CurrentBubbleContext);

  let className = "e-cell";
  if (cellClassName) className += ` ${cellClassName}`;
  let style: React.CSSProperties | undefined;
  let content: React.ReactNode;
  let title: string | undefined;

  if (cell.kind === "work") {
    const id = cell.shiftId;
    className += " e-work";
    style = { background: SHIFT_BG[id] ?? "#eee", color: SHIFT_FG[id] ?? "#333" };
    // 勤務帯は背景色で区別できるので、セルは開始時刻の「時」だけを大きく出す。
    // 勤務帯名・開始時刻はホバーで分かるよう title に入れる。
    content = <span className="e-shift-hour">{shift ? shift.startHour : id}</span>;
    if (shift) title = `${shift.name}（${shift.startTimeLabel}）`;
  } else if (cell.kind === "day-off") {
    className += " e-off";
    content = "休";
  } else {
    // 未割当: 希望があれば円で表示（下で描く）。無ければ "·"
    className += " e-undecided";
    content = wishEntries.length > 0 ? null : "·";
    if (wishEntries.length > 0) className += " has-wish-hint";
  }

  if (pointViolation || rangeViolation) className += " is-violation";
  if (selected) className += " is-selected";

  // 実際の値（出勤/休み）が入っているか。入っていれば希望の円は小さくして左上へ退避する。
  const hasValue = cell.kind === "work" || cell.kind === "day-off";
  // 希望と違う勤務帯になったか。判定は宣言的な制約（希望違反）から導く（表示側で再実装しない）。
  const wishMismatch = !!pointViolation;

  // 値が入ったセルの左上に残す円は1つだけ。「その割当に対応する希望」＝叶ったシフトの円を残す。
  // 割当が決まった後に希望の候補を全部並べても読めないし、どれが叶ったのか分からないため。
  // 叶っていないとき（希望違反）は、破った × 希望 → 叶わなかった ○ 希望 の順に代表を1つ選び、
  // 警告色（is-mismatch）の円として残す＝違反バブルへの導線も1つに集まる。
  const assignedWishKey =
    cell.kind === "day-off"
      ? DAY_OFF_WISH
      : cell.kind === "work"
        ? workWishKey(shift?.name ?? cell.shiftId)
        : undefined;
  const cornerWishEntry =
    wishEntries.find((e) => e.key === assignedWishKey) ??
    wishEntries.find((e) => e.pref === "want") ??
    wishEntries[0];
  const shownWishEntries: WishEntry[] =
    hasValue && cornerWishEntry ? [cornerWishEntry] : wishEntries;

  // 違反マーカー（赤帯・⊿）。ObjectView がダブルクリックでの違反バブル展開と data-url
  // （origin-side でマーカーの近くに出す）を担う。セルは単クリック=選択 / ダブルクリック=候補なので、
  // マーカー上の操作はセルへ伝播させない（ラッパで stopPropagation）。
  const violationMarker = (violation: ConstraintViolation, markerClass: string) => {
    const marker = (
      <span
        className={markerClass}
        title={`${violation.message}（ダブルクリックで詳細）`}
      />
    );
    if (!violationUrl) return marker;
    return (
      <span
        style={{ display: "contents" }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <ObjectView
          url={violationUrl(violation)}
          openingPosition="origin-side"
          draggable={false}
        >
          {marker}
        </ObjectView>
      </span>
    );
  };

  // 希望が叶わなかったとき、円から違反バブルを開くための URL（旧・右上の ⊿ の役割）。
  const wishViolationUrl =
    wishMismatch && pointViolation && violationUrl
      ? violationUrl(pointViolation)
      : undefined;

  // 希望の円（1文字＋文字色と同じ線色）。
  //
  // 重要: 円は「常に同じ素の <span>」として描く。叶わないときだけ ObjectView で包むと、
  // .is-corner が付くのと同時に DOM ノードが作り直され（remount）、最初から角の位置で
  // マウントされてしまい左上へ移動する transition が走らない。そのため違反バブルへの導線は
  // ラッパではなく、この span 自身の data-url + ダブルクリック（openBubble）で持たせる。
  const wishMarks = wishEntries.length > 0 && (
    <span className={`e-wish-marks${hasValue ? " is-corner" : ""}`}>
      {shownWishEntries.map((e, i) => {
        // 見た目（背景・線幅・不透明度）は状態ごとに CSS 側で決める。ここは色と位置だけ渡す。
        const style = {
          // 希望の色（勤務帯色 / 休みはグレー）。文字色・線色に使う
          ["--wish-color" as string]: e.color,
          // 複数希望を横に並べるための位置（CSS 側で calc に使う）
          ["--i" as string]: i,
          ["--n" as string]: shownWishEntries.length,
        } as React.CSSProperties;
        return (
          <span
            key={e.key}
            className={`e-wish-badge${e.pref === "avoid" ? " is-avoid" : ""}${
              wishMismatch ? " is-mismatch" : ""
            }`}
            style={style}
            title={
              wishMismatch && pointViolation
                ? `${pointViolation.message}（ダブルクリックで詳細）`
                : `希望: ${wishText(e)}`
            }
            {...(wishViolationUrl ? urlProps(wishViolationUrl) : {})}
            // セルの単クリック=選択 / ダブルクリック=候補 とぶつからないよう伝播を止める
            onClick={wishViolationUrl ? (ev) => ev.stopPropagation() : undefined}
            onDoubleClick={
              wishViolationUrl
                ? (ev) => {
                    ev.stopPropagation();
                    openBubble(wishViolationUrl, currentBubbleId, "origin-side");
                  }
                : undefined
            }
          >
            {/* 円と文字は別要素。値が入ると円は角へ、文字は見える側へと独立に動く */}
            <span className="e-wish-char">{e.char}</span>
          </span>
        );
      })}
    </span>
  );

  return (
    <div
      className={className}
      style={style}
      role="button"
      title={title}
      data-cell-key={cellKey}
      onClick={onSelect}
      onDoubleClick={onOpenEditor}
    >
      {content}
      {wishMarks}
      {inputBuffer !== null && <span className="e-input">{inputBuffer}</span>}
      {rangeViolation && violationMarker(rangeViolation, "e-violation-bar")}
    </div>
  );
};
