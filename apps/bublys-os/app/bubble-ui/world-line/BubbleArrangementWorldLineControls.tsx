"use client";
import { FC, useContext } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useRootArrangementWorldLine } from "./useRootArrangementWorldLine";

/**
 * bubble-ui の表示状態を world-line に同期し、undo/redo + 世界線グラフ起動
 * ボタンを提供する。グラフ自体は `world-lines` URL のバブルとして開かれるので、
 * 自由にドラッグ・リサイズ・閉じることができる（旧: 固定 overlay）。
 */
export const BubbleArrangementWorldLineControls: FC = () => {
  const { moveBack, moveForward, canUndo, canRedo } = useRootArrangementWorldLine();
  const { openBubble } = useContext(BubblesContext);

  const openWorldLines = () => {
    openBubble("world-lines", "root");
  };

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
      <Tooltip title="世界線グラフ" arrow>
        <IconButton size="small" onClick={openWorldLines}>
          <AccountTreeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
