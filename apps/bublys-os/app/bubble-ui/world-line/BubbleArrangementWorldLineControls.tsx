"use client";
import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { WorldLinesCanvasView } from "@bublys-org/bubbles-ui";
import { useCasScope } from "@bublys-org/world-line-graph";
import { ROOT_UNIVERSE_ID } from "@bublys-org/bubbles-ui";
import { useRootArrangementWorldLine } from "./useRootArrangementWorldLine";

/**
 * bubble-ui の表示状態を world-line に同期し、undo/redo +（ドラッグで動かせる）
 * 世界線グラフ表示を提供する。
 *
 * 世界線 view は **バブルにしない**。バブルにすると自分自身が
 * BubbleArrangement の一要素になり、過去ノードに戻ると view も消える、という
 * 矛盾が起きる。なのでこのチロムは bubble system の外側に position:fixed で
 * 浮かべる。view 中身は {@link WorldLinesCanvasView}（canvas 描画の pure 関数）
 * を使って毎レンダーのコストを抑える。
 */
export const BubbleArrangementWorldLineControls: FC = () => {
  const { moveBack, moveForward, canUndo, canRedo, graph, summarizeNode } =
    useRootArrangementWorldLine();
  const apexId = graph.getApex()?.id ?? null;

  // 世界線 view のクリック → moveTo / キーボードの兄弟移動用に scope を直接持つ
  const rootScope = useCasScope(ROOT_UNIVERSE_ID);

  const [showGraph, setShowGraph] = useState(false);

  // パネル位置（ドラッグで動かせる）
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

  const onUp = useCallback(
    (e: MouseEvent) => {
      if (dragRef.current) {
        posRef.current = {
          x: dragRef.current.px + (e.clientX - dragRef.current.mx),
          y: dragRef.current.py + (e.clientY - dragRef.current.my),
        };
      }
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    },
    [onMove],
  );

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
    [onMove, onUp],
  );

  // キーボード: パネルが open のときだけ window 全体で拾う。
  //  - ← : moveBack（parent へ）
  //  - → : moveForward（同 worldLine の子へ）
  //  - ↑ / ↓ : 同じ親の兄弟を切替（分岐間移動）
  //
  // Cmd/Ctrl+Z はデータ変更の undo に予約されているため、世界線ビューでの
  // ナビゲーションには使わない（矢印キーのみ）。
  useEffect(() => {
    if (!showGraph) return;
    const onKey = (e: KeyboardEvent) => {
      // テキスト入力中は無視
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveBack();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        moveForward();
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const apex = graph.getApex();
        if (!apex || apex.parentId === null) return;
        const siblings = graph.getChildrenMap()[apex.parentId] ?? [];
        const idx = siblings.indexOf(apex.id);
        if (idx < 0) return;
        const next = siblings[idx + (e.key === "ArrowUp" ? -1 : 1)];
        if (!next) return;
        e.preventDefault();
        rootScope.moveTo(next);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [showGraph, moveBack, moveForward, graph, rootScope]);

  // canvas に渡す要約関数は summarize（lib 側で precompute 済み Map 引き）。
  // summarizeNode の参照は useBrowserRootArrangementWorldLine 側で useCallback で
  // 固定済みなのでそのまま渡す。
  const getNodeSummary = useMemo(() => summarizeNode, [summarizeNode]);

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
        <Tooltip title="戻る（世界線 / ←）" arrow>
          <span>
            <IconButton size="small" onClick={moveBack} disabled={!canUndo}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="進む（世界線 / →）" arrow>
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
            width: 480,
            height: 360,
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "rgba(15,18,28,0.92)",
            color: "rgba(220,230,255,0.92)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 1.5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            backdropFilter: "blur(4px)",
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
          <Box sx={{ flex: 1, minHeight: 0 }}>
            <WorldLinesCanvasView
              graph={graph}
              apexNodeId={apexId}
              getNodeSummary={getNodeSummary}
              onSelectNode={rootScope.moveTo}
            />
          </Box>
        </Box>
      )}
    </>
  );
};
