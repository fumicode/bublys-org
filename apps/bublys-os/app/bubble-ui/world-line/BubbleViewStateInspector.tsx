"use client";
import { FC, useMemo, useState } from "react";
import { Box, IconButton } from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import CloseIcon from "@mui/icons-material/Close";
import { useAppSelector } from "@bublys-org/state-management";
import { selectBubbleViewState } from "@bublys-org/bubbles-ui";
import {
  WorldLineGraph,
  type WorldLineGraphJson,
} from "@bublys-org/world-line-graph";
import { BUBBLE_VIEW_SCOPE } from "./bubbleViewDomain";

type WlState = {
  worldLineGraph?: {
    graphs?: Record<string, WorldLineGraphJson>;
    cas?: Record<string, unknown>;
  };
};

const short = (s: string | null | undefined, n = 7) =>
  s ? s.slice(0, n) : "—";

const panelSx = {
  width: 320,
  maxHeight: "45vh",
  display: "flex",
  flexDirection: "column" as const,
  backgroundColor: "rgba(20,22,30,0.92)",
  color: "rgba(220,230,255,0.92)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 1.5,
  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  backdropFilter: "blur(2px)",
};

const headerSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 1,
  py: 0.5,
  fontSize: 12,
  opacity: 0.8,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
};

const preSx = {
  m: 0,
  p: 1,
  overflow: "auto",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 11,
  lineHeight: 1.45,
  whiteSpace: "pre" as const,
};

/**
 * 左下の開発用インスペクタ。
 * 左: 現在の表示状態(arrangement)の JSON
 * 右: world-line（DAG / apex / 現在の StateRef）の情報
 *
 * world-line は Redux から read-only で読むだけ（同期ロジックは走らせない）。
 */
export const BubbleViewStateInspector: FC = () => {
  const [open, setOpen] = useState(true);

  const view = useAppSelector(selectBubbleViewState);
  const viewJson = JSON.stringify(view, null, 2);

  // 生 JSON を選び、useMemo で WorldLineGraph を再構築（毎レンダーの再生成を防ぐ）
  const graphJson = useAppSelector(
    (s: WlState) => s.worldLineGraph?.graphs?.[BUBBLE_VIEW_SCOPE]
  );
  const graph = useMemo(
    () => (graphJson ? WorldLineGraph.fromJSON(graphJson) : WorldLineGraph.empty()),
    [graphJson]
  );

  const worldLineText = useMemo(() => {
    const apex = graph.getApex();
    const nodeCount = Object.keys(graph.state.nodes).length;
    const currentRefs = graph.getCurrentStateRefs();
    const path = apex ? graph.getPathToNode(apex.id) : [];

    const lines: string[] = [];
    lines.push(`apex     : ${short(graph.state.apexNodeId)}`);
    lines.push(`root     : ${short(graph.state.rootNodeId)}`);
    lines.push(`nodes    : ${nodeCount}`);
    lines.push(`canUndo  : ${!!apex?.parentId}`);
    lines.push("");
    lines.push("current refs:");
    if (currentRefs.length === 0) {
      lines.push("  (none)");
    } else {
      for (const ref of currentRefs) {
        lines.push(`  ${ref.type}:${ref.id} @${short(ref.hash)}`);
      }
    }
    lines.push("");
    lines.push(`path (root→apex): ${path.length} nodes`);
    for (const node of path) {
      const changed = node.changedRefs.map((r) => short(r.hash)).join(",");
      lines.push(`  ${short(node.id)}  [${changed || "—"}]`);
    }
    return lines.join("\n");
  }, [graph]);

  if (!open) {
    return (
      <IconButton
        size="small"
        onClick={() => setOpen(true)}
        sx={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: "rgba(30,30,40,0.8)",
          color: "rgba(255,255,255,0.7)",
          "&:hover": { backgroundColor: "rgba(30,30,40,0.95)" },
        }}
      >
        <DataObjectIcon fontSize="small" />
      </IconButton>
    );
  }

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        zIndex: 1000,
        display: "flex",
        gap: 1,
        alignItems: "flex-end",
      }}
    >
      {/* 左: view 状態 */}
      <Box sx={panelSx}>
        <Box sx={{ ...headerSx, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <DataObjectIcon fontSize="inherit" />
            view state
          </Box>
          <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "inherit" }}>
            <CloseIcon fontSize="inherit" />
          </IconButton>
        </Box>
        <Box component="pre" sx={preSx}>
          {viewJson}
        </Box>
      </Box>

      {/* 右: world-line */}
      <Box sx={panelSx}>
        <Box sx={headerSx}>world line ({BUBBLE_VIEW_SCOPE})</Box>
        <Box component="pre" sx={preSx}>
          {worldLineText}
        </Box>
      </Box>
    </Box>
  );
};
