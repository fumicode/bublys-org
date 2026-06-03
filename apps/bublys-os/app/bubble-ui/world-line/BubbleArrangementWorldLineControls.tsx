"use client";
import { FC, useCallback, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { WorldLineView } from "@bublys-org/world-line-graph";
import { useRootArrangementWorldLine } from "./useRootArrangementWorldLine";

/**
 * bubble-ui の表示状態を world-line に同期し、undo/redo と
 * （ドラッグで動かせる）世界線グラフ表示を提供する。
 */
export const BubbleArrangementWorldLineControls: FC = () => {
  const { moveBack, moveForward, moveTo, canUndo, canRedo, graph, summarizeNode } =
    useRootArrangementWorldLine();
  const [showGraph, setShowGraph] = useState(false);

  // --- ドラッグで移動できるパネル ---
  const panelRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 76, y: 64 });
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);

  const onMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !panelRef.current) return;
    const x = dragRef.current.px + (e.clientX - dragRef.current.mx);
    const y = dragRef.current.py + (e.clientY - dragRef.current.my);
    panelRef.current.style.left = `${x}px`;
    panelRef.current.style.top = `${y}px`;
  }, []);

  const onUp = useCallback((e: MouseEvent) => {
    if (dragRef.current) {
      posRef.current = {
        x: dragRef.current.px + (e.clientX - dragRef.current.mx),
        y: dragRef.current.py + (e.clientY - dragRef.current.my),
      };
    }
    dragRef.current = null;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }, [onMove]);

  const onHeaderMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = {
        mx: e.clientX,
        my: e.clientY,
        px: posRef.current.x,
        py: posRef.current.y,
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [onMove, onUp]
  );

  return (
    <>
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
          <IconButton
            size="small"
            onClick={() => setShowGraph((v) => !v)}
            color={showGraph ? "primary" : "default"}
          >
            <AccountTreeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {showGraph && (
        <Box
          ref={panelRef}
          sx={{
            position: "fixed",
            left: `${posRef.current.x}px`,
            top: `${posRef.current.y}px`,
            zIndex: 1000,
            width: 360,
            maxHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(20,22,30,0.94)",
            color: "rgba(220,230,255,0.92)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 1.5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            backdropFilter: "blur(2px)",
          }}
        >
          <Box
            onMouseDown={onHeaderMouseDown}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: 0.5,
              fontSize: 12,
              opacity: 0.85,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              cursor: "move",
              userSelect: "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <DragIndicatorIcon fontSize="inherit" />
              世界線グラフ
            </Box>
            <IconButton
              size="small"
              onClick={() => setShowGraph(false)}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{ color: "inherit" }}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
          <Box sx={{ overflow: "auto" }}>
            <WorldLineView
              graph={graph}
              onSelectNode={moveTo}
              renderNodeSummary={summarizeNode}
            />
          </Box>
        </Box>
      )}
    </>
  );
};
