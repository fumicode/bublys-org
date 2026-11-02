import { FC } from "react";
import styled from "styled-components";
import { Popper } from "@mui/material";
import {
  ALLOWED_SHIFT_CONSTRAINT,
  type ConstraintViolation,
  type ShiftSuggestion,
} from "../../domain/index.js";
import { SHIFT_BG, SHIFT_FG } from "./constants.js";

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
  /**
   * その候補に替えたら新しく出る違反（勤務表に反映している制約から）。
   * 渡さなければ違反は描かない。
   */
  violationsOf?: (s: ShiftSuggestion) => ConstraintViolation[];
};

/**
 * 勤務割当の入力補助ドロップダウン（純粋表示）。
 * キーボード入力・ダブルクリック用。AIの未来分岐提案とは別系統。
 * グリッドのキーボードフォーカスを奪わないよう、Menu ではなく Popper を使う。
 *
 * 選択肢は「それを入れたときのセルの姿」で描く:
 *   - 左のチップはセルと同じ形（勤務帯色＋開始時刻の「時」/「休」）
 *   - 入れたら新しく違反が出る選択肢は、チップの右上にセルと同じ赤い三角を付け、違反の文を添える
 *   - 可能勤務帯の外は、チップを斜線にする（制約バーの「可能勤務帯」アイコンと同じ描き方）
 * 違反が出る選択肢も消さず・押せなくもしない（入れたら違反として出る、がルール。#216）。
 * 並び順も変えない（打ち込みで絞ったときの順と、↑↓のハイライト位置をぶらさない）。
 */
export const ShiftSuggestionDropdown: FC<ShiftSuggestionDropdownProps> = ({
  open,
  anchorEl,
  suggestions,
  activeIndex,
  onPick,
  violationsOf,
}) => (
  <Popper
    open={open && !!anchorEl && suggestions.length > 0}
    anchorEl={anchorEl}
    placement="bottom-start"
    style={{ zIndex: 1300 }}
  >
    <StyledList>
      {suggestions.map((s, i) => {
        const violations = violationsOf?.(s) ?? [];
        return (
          <ShiftOptionRow
            key={s.kind === "work" ? s.shift.id : s.kind}
            suggestion={s}
            active={i === activeIndex}
            violations={violations}
            onPick={() => onPick(s)}
          />
        );
      })}
    </StyledList>
  </Popper>
);

type ShiftOptionRowProps = {
  suggestion: ShiftSuggestion;
  active: boolean;
  violations: ConstraintViolation[];
  onPick: () => void;
};

/** 選択肢1行（チップ・名前・違反の文） */
const ShiftOptionRow: FC<ShiftOptionRowProps> = ({ suggestion: s, active, violations, onPick }) => {
  const outsideAllowed = violations.some((v) => v.constraintType === ALLOWED_SHIFT_CONSTRAINT);

  let chip: string;
  let chipStyle: React.CSSProperties | undefined;
  let name: string;
  let sub: string | undefined;
  if (s.kind === "work") {
    chip = String(s.shift.startHour);
    chipStyle = {
      background: SHIFT_BG[s.shift.id] ?? "#eee",
      color: SHIFT_FG[s.shift.id] ?? "#333",
    };
    name = s.shift.name;
    sub = s.shift.startTimeLabel;
  } else if (s.kind === "day-off") {
    chip = "休";
    name = "休み";
  } else {
    chip = "·";
    name = "未定（クリア）";
  }

  let className = "e-option";
  if (active) className += " is-active";
  if (violations.length > 0) className += " has-violation";
  if (s.kind === "undecided") className += " is-clear";

  return (
    <div
      className={className}
      role="option"
      aria-selected={active}
      title={violations.length > 0 ? violations.map((v) => v.message).join("\n") : undefined}
      // クリックでグリッドの blur → 確定前に消えるのを防ぎ、確実に適用する
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      <span className={`e-chip${outsideAllowed ? " is-outside-allowed" : ""}`} style={chipStyle}>
        {chip}
      </span>
      <span className="e-text">
        <span className="e-name">
          {name}
          {sub && <span className="e-sub">{sub}</span>}
        </span>
        {violations.map((v, i) => (
          <span key={i} className="e-violation">
            {v.message}
          </span>
        ))}
      </span>
    </div>
  );
};

const StyledList = styled.div`
  margin-top: 4px;
  min-width: 140px;
  max-width: 260px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.12);
  font-size: 13px;

  .e-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 6px;
    border-radius: 6px;
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
    border-radius: 0 0 6px 6px;
    color: #757575;
  }

  /* セルと同じ形のチップ。勤務帯色は style で渡す（休み・未定はグレー） */
  .e-chip {
    position: relative;
    flex: none;
    width: 28px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: #f0f0f0;
    color: #555;
    font-weight: 600;
  }
  /* 入れたら新しく違反が出る: セルの1セル違反と同じ、右上の赤い三角 */
  .e-option.has-violation .e-chip::after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background: #e53935;
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    border-top-right-radius: 4px;
  }
  /* 可能勤務帯の外: 斜線（制約バーの「可能勤務帯」アイコンの、入れない帯と同じ描き方） */
  .e-chip.is-outside-allowed {
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(0, 0, 0, 0.14) 0 1.5px,
      transparent 1.5px 4px
    ) !important;
    opacity: 0.75;
  }

  .e-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 24px;
  }
  .e-name {
    white-space: nowrap;
  }
  .e-sub {
    margin-left: 6px;
    color: #9e9e9e;
    font-size: 12px;
  }
  .e-violation {
    color: #c62828;
    font-size: 11px;
    line-height: 1.4;
  }
`;
