"use client";
import { FC } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import { useBubbleViewWorldLine } from "./useBubbleViewWorldLine";

/**
 * bubble-ui の表示状態を world-line に同期し、undo/redo を提供する。
 * （最小ループの動作確認用。最終的には世界線グラフUIや URL 連携に発展させる）
 */
export const BubbleViewWorldLineControls: FC = () => {
  const { moveBack, moveForward, canUndo, canRedo } = useBubbleViewWorldLine();

  return (
    <Box
      sx={{
        position: "fixed",
        top: 20,
        left: 76,
        zIndex: 1000,
        display: "flex",
        gap: 0.5,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 1,
        p: 0.5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <Tooltip title="戻る（世界線）" arrow>
        <span>
          <IconButton size="small" onClick={moveBack} disabled={!canUndo}>
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="進む（世界線）" arrow>
        <span>
          <IconButton size="small" onClick={moveForward} disabled={!canRedo}>
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};
