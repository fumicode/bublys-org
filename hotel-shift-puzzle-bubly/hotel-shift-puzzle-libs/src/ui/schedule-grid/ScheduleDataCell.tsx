import { FC } from "react";
import { ObjectView } from "@bublys-org/bubbles-ui";
import type { WorkShift, ConstraintViolation, ShiftCell } from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";
import { wishText, type WishEntry } from "./wishSummary.js";

type ScheduleDataCellProps = {
  /** セルの状態（出勤・休み・未定） */
  cell: ShiftCell;
  /** 出勤のとき解決済みの勤務帯（未解決/休み/未定なら undefined） */
  shift?: WorkShift;
  /** 未割当セルに薄く出す希望ヒント */
  wishEntries: WishEntry[];
  /** 範囲違反（連勤など複数日）。下端の赤帯で表す */
  rangeViolation?: ConstraintViolation;
  /** 単日違反（希望の食い違いなど）。右上の ⊿ で表す */
  pointViolation?: ConstraintViolation;
  /**
   * まだ決まっていないセルに入れられる値（候補集合）の説明文。ホバーで内容が見えるよう
   * title に添える。確定済みセル・候補集合が無いときは undefined。
   */
  candidateHint?: string;
  /**
   * 候補が1つに絞られた＝制約から一意に決まる値（確定提案）。渡すと、確定済みセルと
   * 同じ形を薄く描いて「承認すればこうなる」を示す。承認前なので勤務表には入っていない。
   */
  forcedCandidate?: ShiftCell;
  /** forcedCandidate が出勤のとき解決済みの勤務帯（色と開始時刻を確定済みセルと揃える） */
  forcedShift?: WorkShift;
  /**
   * 詰み（候補が1つも無い＝何を入れても制約に反する）セルか。
   * 違反マーカー（赤帯・⊿）は「今ある割当が違反している」印だが、これは「この先どうやっても
   * 埋められない」印なので、セルの地の描き方そのものを変えて言い分ける。
   */
  dead?: boolean;
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
 * 出勤＝開始時刻の「時」だけ（勤務帯は背景色で区別）、休み＝「休」、未定＝希望ヒント or「·」。
 * 違反は範囲（下端の赤帯）と単日（右上の ⊿）の 2 種に描き分ける。
 * シングルクリックで選択、ダブルクリックで候補ドロップダウン（キーボード操作と共通）。
 */
export const ScheduleDataCell: FC<ScheduleDataCellProps> = ({
  cell,
  shift,
  wishEntries,
  rangeViolation,
  pointViolation,
  candidateHint,
  forcedCandidate,
  forcedShift,
  dead = false,
  cellKey,
  selected = false,
  inputBuffer = null,
  onSelect,
  onOpenEditor,
  violationUrl,
  cellClassName,
}) => {
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
  } else if (dead) {
    // 詰み: 何を入れてもどれかの制約に反する。承認できる手が無いので値は描かず、
    // 「ここは埋まらない」ことだけを示す（理由は candidateHint が title に添える）。
    className += " e-undecided e-dead";
    content = <span className="e-dead-mark">×</span>;
  } else if (forcedCandidate) {
    // 未割当だが制約から一意に決まる: 確定済みと同じ形（勤務帯色＋開始時刻の「時」/「休」）を
    // 薄く破線で描く。承認すればこうなる、が一目で分かり、確定済みとは見間違えない。
    // 希望ヒントより強い情報なのでこちらを優先し、希望は title に残す。
    className += " e-undecided e-forced";
    const forcedLabel =
      forcedCandidate.kind === "work"
        ? (forcedShift?.startHour ?? forcedCandidate.shiftId)
        : "休";
    const forcedStyle =
      forcedCandidate.kind === "work"
        ? {
            background: SHIFT_BG[forcedCandidate.shiftId] ?? "#eee",
            color: SHIFT_FG[forcedCandidate.shiftId] ?? "#333",
          }
        : undefined;
    content = (
      <span className="e-forced-value" style={forcedStyle}>
        {forcedLabel}
      </span>
    );
  } else {
    // 未割当: 希望があれば薄く表示（書き込むと隠れる）。無ければ "·"
    className += " e-undecided";
    content = wishEntries.length > 0 ? wishEntries.map(wishText).join(" ") : "·";
    if (wishEntries.length > 0) className += " has-wish-hint";
  }

  // 確定提案を出したセルでは希望ヒントが隠れるので、希望も title 側に残す。
  if (forcedCandidate && wishEntries.length > 0) {
    title = `希望: ${wishEntries.map(wishText).join(" ")}`;
  }
  if (candidateHint) title = title ? `${title}\n${candidateHint}` : candidateHint;

  if (pointViolation || rangeViolation) className += " is-violation";
  if (selected) className += " is-selected";

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
      {inputBuffer !== null && <span className="e-input">{inputBuffer}</span>}
      {pointViolation && violationMarker(pointViolation, "e-wish-flag")}
      {rangeViolation && violationMarker(rangeViolation, "e-violation-bar")}
    </div>
  );
};
