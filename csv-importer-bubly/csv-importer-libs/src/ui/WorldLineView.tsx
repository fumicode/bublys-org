"use client";

import React, { FC, useMemo, useEffect, useCallback } from "react";
import { WorldLineGraph } from "@bublys-org/world-line-graph";
import type { WorldNode } from "@bublys-org/world-line-graph";

// ============================================================================
// Types
// ============================================================================

export type WorldLineViewProps = {
  graph: WorldLineGraph;
  onSelectNode: (nodeId: string) => void;
  /** ダブルクリックでノード選択＋ビューを閉じる */
  onSelectNodeAndClose?: (nodeId: string) => void;
  renderNodeSummary?: (nodeId: string) => string;
};

// ============================================================================
// 色パレット
// ============================================================================

const COLOR_PALETTE = [
  "#4fc3f7", "#81c784", "#ffb74d", "#e57373",
  "#ba68c8", "#4db6ac", "#fff176", "#f06292",
];

const MAX_INDENT = 120;
const INDENT_PER_LEVEL = 16;

// ============================================================================
// WorldLineView — DAGツリー表示
// ============================================================================

export const WorldLineView: FC<WorldLineViewProps> = ({
  graph,
  onSelectNode,
  onSelectNodeAndClose,
  renderNodeSummary,
}) => {
  const { nodes, apexNodeId, rootNodeId } = graph.state;
  const childrenMap = graph.getChildrenMap();

  // worldLineId ごとの色を割り当て
  const worldLineColors = useMemo(() => {
    const ids = new Set<string>();
    for (const node of Object.values(nodes)) {
      ids.add(node.worldLineId);
    }
    const colors: Record<string, string> = {};
    let idx = 0;
    for (const wlId of ids) {
      colors[wlId] = COLOR_PALETTE[idx % COLOR_PALETTE.length];
      idx++;
    }
    return colors;
  }, [nodes]);

  // キーボードナビゲーション
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!apexNodeId) return;
      const apex = nodes[apexNodeId];
      if (!apex) return;

      // Ctrl/Cmd+Z → 親に移動 (undo)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (apex.parentId) onSelectNode(apex.parentId);
        return;
      }
      // Ctrl/Cmd+Shift+Z → 子に移動 (redo)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "Z" || e.key === "z")) {
        e.preventDefault();
        const children = childrenMap[apexNodeId] ?? [];
        if (children.length > 0) {
          const sameLine = children.find((id) => nodes[id]?.worldLineId === apex.worldLineId);
          onSelectNode(sameLine ?? children[0]);
        }
        return;
      }
      // ← 親に移動
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (apex.parentId) onSelectNode(apex.parentId);
        return;
      }
      // → 子に移動
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const children = childrenMap[apexNodeId] ?? [];
        if (children.length > 0) {
          const sameLine = children.find((id) => nodes[id]?.worldLineId === apex.worldLineId);
          onSelectNode(sameLine ?? children[0]);
        }
        return;
      }
    },
    [apexNodeId, nodes, childrenMap, onSelectNode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node: WorldNode = nodes[nodeId];
    const children = childrenMap[nodeId] ?? [];
    const isApex = nodeId === apexNodeId;
    const color = worldLineColors[node.worldLineId] ?? "#aaa";
    const summary = renderNodeSummary ? renderNodeSummary(nodeId) : "";
    const changedLabel = node.changedRefs.map((r) => r.id).join(", ");
    const indent = Math.min(depth * INDENT_PER_LEVEL, MAX_INDENT);

    return (
      <div key={nodeId} style={{ marginLeft: indent }}>
        <button
          onClick={() => onSelectNode(nodeId)}
          onDoubleClick={() => onSelectNodeAndClose?.(nodeId)}
          style={{
            ...styles.dagNode,
            borderColor: color,
            backgroundColor: isApex
              ? color
              : "rgba(255, 255, 255, 0.15)",
            color: isApex ? "#1a1a2e" : color,
            fontWeight: isApex ? "bold" : "normal",
          }}
          title={`Node: ${nodeId.slice(0, 8)}...\nWorldLine: ${node.worldLineId.slice(0, 12)}...\nChanged: ${changedLabel}`}
        >
          <span style={styles.dagNodeDot}>●</span>
          <span style={styles.dagNodeId}>{nodeId.slice(0, 6)}</span>
          {summary && <span style={styles.dagNodeSummary}>[{summary}]</span>}
          {isApex && <span style={styles.apexBadge}>現在</span>}
        </button>
        {children.map((childId) => renderNode(childId, depth + 1))}
      </div>
    );
  }

  if (rootNodeId === null) {
    return <div style={styles.emptyText}>ノードがありません</div>;
  }

  return (
    <div style={styles.dagPanel}>
      <div style={styles.legend}>
        {Object.entries(worldLineColors).map(([wlId, color]) => (
          <span key={wlId} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: color }} />
            {wlId.slice(0, 10)}
          </span>
        ))}
      </div>
      <div style={styles.dagTree}>{renderNode(rootNodeId, 0)}</div>
    </div>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  dagPanel: {
    padding: 16,
    height: "100%",
    overflow: "auto",
    boxSizing: "border-box",
  },
  emptyText: {
    color: "#666",
    fontStyle: "italic",
    padding: 24,
  },
  legend: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#aaa",
    fontFamily: "monospace",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  dagTree: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  dagNode: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "monospace",
    background: "none",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  },
  dagNodeDot: {
    fontSize: 8,
  },
  dagNodeId: {
    fontSize: 11,
  },
  dagNodeSummary: {
    fontSize: 10,
    opacity: 0.7,
  },
  apexBadge: {
    fontSize: 9,
    padding: "1px 5px",
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
    marginLeft: 4,
  },
};
