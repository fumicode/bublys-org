import { FC } from "react";
import styled from "styled-components";
import { Popper } from "@mui/material";
import type {
  ConstraintViolation,
  ShiftCell,
  ShiftSuggestion,
  WorkShift,
} from "../../domain/index.js";
import { CellFace } from "./CellFace.js";
import { cellFaceStyles } from "./cellFaceStyles.js";
import { PROPOSAL_BORDER, VIOLATION_STRONG } from "./cellSymbols.js";
import type { ViolationMark } from "./violationMarkPlacement.js";
import type { WishEntry } from "./wishSummary.js";

/**
 * 選択肢1つの「入れたときのセルの姿」。描くのは CellFace（勤務表のセルと同じ部品）。
 */
export type ShiftOptionFace = {
  /** その選択肢を入れたときのセルの値 */
  cell: ShiftCell;
  /** 出勤なら解決済みの勤務帯 */
  shift?: WorkShift;
  /** そのセルの希望（勤務表のセルと同じ円で描く） */
  wishEntries: WishEntry[];
  /** 入れたあとのセルにかかる違反の印（勤務表と同じ形） */
  marks: ViolationMark[];
  /** 入れたあとに希望と食い違うなら、その違反（円を赤くする） */
  wishViolation?: ConstraintViolation;
  /** 添える違反の短い要約（違反の summary。重複なし）。選択肢に並べる */
  labels: string[];
  /** 違反の文（ホバーで読む詳しい内容） */
  messages: string[];
  /** 候補集合がこの値1つに絞られた（唯一の提案）。勤務表のセルの破線と同じ意味 */
  proposed: boolean;
};

type ShiftSuggestionDropdownProps = {
  open: boolean;
  /** アンカー（選択セルの DOM）。 */
  anchorEl: HTMLElement | null;
  /** 表示する候補。 */
  suggestions: ShiftSuggestion[];
  /** ハイライト中の候補インデックス。 */
  activeIndex: number;
  /** 候補を選んだとき（クリック）。 */
  onPick: (s: ShiftSuggestion) => void;
  /** 選択肢の「入れたときのセルの姿」。 */
  faceOf: (s: ShiftSuggestion) => ShiftOptionFace;
};

/**
 * 勤務割当の入力補助ドロップダウン（純粋表示）。
 * キーボード入力・ダブルクリック用。AIの未来分岐提案とは別系統。
 * グリッドのキーボードフォーカスを奪わないよう、Menu ではなく Popper を使う。
 *
 * ルール: **選択肢は「それを入れたときのセルの姿」で描く。** 勤務表のセルと同じ部品（CellFace）・
 * 同じスタイル（cellFaceStyles）なので、色・形の意味は勤務表と1対1で対応する。
 *   - 値＝勤務帯色＋開始時刻の「時」／休、希望＝円（叶わなければ赤い円）、
 *     違反＝勤務表と同じ印（連勤は下端の帯・1セルは右上の三角・勤務間インターバルは境目）
 *   - 破線の枠＝唯一の提案（候補集合がその値1つに絞られた）。勤務表のセルの破線と同じ意味で、
 *     候補が2つ以上残っているときや確定済みのセルでは使わない
 * 違反が出る選択肢も消さず・押せなくもしない（入れたら違反として出る、がルール。#216）。
 * 並び順もハイライトの初期位置（先頭）も変えない。
 */
export const ShiftSuggestionDropdown: FC<ShiftSuggestionDropdownProps> = ({
  open,
  anchorEl,
  suggestions,
  activeIndex,
  onPick,
  faceOf,
}) => (
  <Popper
    open={open && !!anchorEl && suggestions.length > 0}
    anchorEl={anchorEl}
    placement="bottom-start"
    style={{ zIndex: 1300 }}
  >
    <StyledList>
      {suggestions.map((s, i) => (
        <ShiftOptionRow
          key={s.kind === "work" ? s.shift.id : s.kind}
          suggestion={s}
          face={faceOf(s)}
          active={i === activeIndex}
          onPick={() => onPick(s)}
        />
      ))}
    </StyledList>
  </Popper>
);

type ShiftOptionRowProps = {
  suggestion: ShiftSuggestion;
  face: ShiftOptionFace;
  active: boolean;
  onPick: () => void;
};

/** 選択肢1行（セルの姿・名前・違反の文） */
const ShiftOptionRow: FC<ShiftOptionRowProps> = ({ suggestion: s, face, active, onPick }) => {
  const name =
    s.kind === "work" ? s.shift.name : s.kind === "day-off" ? "休み" : "未定（クリア）";

  let className = "e-option";
  if (active) className += " is-active";
  if (face.proposed) className += " is-proposed";
  if (s.kind === "undecided") className += " is-clear";

  return (
    <div
      className={className}
      title={face.messages.length > 0 ? face.messages.join("\n") : undefined}
      // クリックでグリッドの blur → 確定前に消えるのを防ぎ、確実に適用する
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      <span className="e-face-frame">
        <CellFace
          cell={face.cell}
          shift={face.shift}
          wishEntries={face.wishEntries}
          violationMarks={face.marks}
          wishViolation={face.wishViolation}
          cellClassName="is-option-face"
        />
      </span>
      <span className="e-text">
        <span className="e-name">{name}</span>
        {s.kind === "work" && <span className="e-sub">{s.shift.startTimeLabel}</span>}
        {face.proposed && <span className="e-proposed-label">提案</span>}
        {/* 違反は短い要約だけを添える（詳しい文は行の title でホバー表示） */}
        {face.labels.length > 0 && (
          <span className="e-violation">{face.labels.join("・")}</span>
        )}
      </span>
    </div>
  );
};

const StyledList = styled.div`
  ${cellFaceStyles}

  margin-top: 2px;
  min-width: 150px;
  max-width: 300px;
  max-height: 300px;
  overflow-y: auto;
  padding: 3px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.16), 0 1px 2px rgba(0, 0, 0, 0.12);
  font-size: 12px;

  /* 1行＝1選択肢（セルの姿・名前・時刻・違反の文を横に並べる） */
  .e-option {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 4px;
    border-radius: 4px;
    cursor: pointer;
    &:hover {
      background: #f5f5f5;
    }
    &.is-active {
      background: #e8f0fe;
    }
  }
  .e-option.is-clear {
    margin-top: 2px;
    border-top: 1px solid #eee;
    border-radius: 0 0 4px 4px;
    color: #757575;
  }

  /* セルの姿（CellFace）を縮めて置く。操作は行が受けるので、中の印・円は押せなくする */
  .e-face-frame {
    flex: none;
    display: inline-flex;
    padding: 1px;
    border: 1px solid transparent;
    border-radius: 5px;
  }
  .e-cell.is-option-face {
    width: 26px;
    min-height: 22px;
    height: 22px;
    padding: 0;
    box-sizing: border-box;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    background: #fff;
    font-size: 11px;
    cursor: inherit;
    &,
    * {
      pointer-events: none;
    }
    &:hover {
      box-shadow: none;
    }
    .e-shift-hour {
      font-size: 1.1em;
    }
    /* 縮めたセルに合わせて希望の円・違反の印も詰める */
    .e-wish-badge {
      width: 16px;
      height: 16px;
    }
    .e-violation-corner::before {
      width: 7px;
      height: 7px;
    }
    .e-violation-bar {
      height: 3px;
    }
  }
  .e-cell.is-option-face.e-off {
    background: #f5f5f5;
  }

  /* 唯一の提案: 勤務表のセルの提案（.e-forced-value）と同じ破線で囲む */
  .e-option.is-proposed .e-face-frame {
    border: ${PROPOSAL_BORDER};
  }
  .e-proposed-label {
    flex: none;
    padding: 0 3px;
    border: ${PROPOSAL_BORDER};
    border-radius: 3px;
    color: #616161;
    font-size: 10px;
    line-height: 14px;
  }

  .e-text {
    display: flex;
    align-items: baseline;
    gap: 5px;
    min-width: 0;
    white-space: nowrap;
  }
  .e-name {
    flex: none;
  }
  .e-sub {
    flex: none;
    color: #9e9e9e;
    font-size: 11px;
  }
  .e-violation {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${VIOLATION_STRONG};
    font-size: 11px;
  }
`;
