import { FC } from "react";
import { Popper, Paper, MenuList, MenuItem, ListItemText } from "@mui/material";
import type { ShiftSuggestion } from "../../domain/index.js";

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
};

/**
 * 勤務割当の入力補助ドロップダウン（純粋表示）。
 * キーボード入力・ダブルクリック用。AIの未来分岐提案とは別系統。
 * グリッドのキーボードフォーカスを奪わないよう、Menu ではなく Popper を使う。
 */
export const ShiftSuggestionDropdown: FC<ShiftSuggestionDropdownProps> = ({
  open,
  anchorEl,
  suggestions,
  activeIndex,
  onPick,
}) => (
  <Popper
    open={open && !!anchorEl && suggestions.length > 0}
    anchorEl={anchorEl}
    placement="bottom-start"
    style={{ zIndex: 1300 }}
  >
    <Paper elevation={4} sx={{ mt: 0.5, minWidth: 120, maxHeight: 240, overflowY: "auto" }}>
      <MenuList dense disablePadding>
        {suggestions.map((s, i) => (
          <MenuItem
            key={s.kind === "work" ? s.shift.id : s.kind}
            selected={i === activeIndex}
            // クリックでグリッドの blur → 確定前に消えるのを防ぎ、確実に適用する
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(s)}
          >
            {s.kind === "work" ? (
              <ListItemText primary={s.shift.name} secondary={s.shift.startTimeLabel} />
            ) : s.kind === "day-off" ? (
              <ListItemText primary="休み" />
            ) : (
              <ListItemText primary="未定（クリア）" />
            )}
          </MenuItem>
        ))}
      </MenuList>
    </Paper>
  </Popper>
);
