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
      // → 子に移動（同じ世界線を優先）
      if (e.key === "ArrowRight") {
        e.preventDefault();
        const children = childrenMap[apexNodeId] ?? [];
        if (children.length > 0) {
          const sameLine = children.find((id) => nodes[id]?.worldLineId === apex.worldLineId);
          onSelectNode(sameLine ?? children[0]);
        }
        return;
      }
      // ↑ 親に移動（←と同じ）
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (apex.parentId) onSelectNode(apex.parentId);
        return;
      }
      // ↓ 分岐点では→と同じ（子に進む）、分岐直後では兄弟間を循環
      if (e.key === "ArrowDown") {
        e.preventDefault();
        // 分岐直後（親が複数の子を持つ）→ 兄弟間を循環
        if (apex.parentId) {
          const siblings = childrenMap[apex.parentId] ?? [];
          if (siblings.length > 1) {
            const myIdx = siblings.indexOf(apexNodeId);
            const nextIdx = (myIdx + 1) % siblings.length;
            onSelectNode(siblings[nextIdx]);
            return;
          }
        }
        // 分岐点（自分が複数の子を持つ）→ →と同じ動作
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

  /** ノードのボタン高さ（接続線の中心位置計算用） */
  const NODE_H = 26;
  const GUTTER_W = 24;

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node: WorldNode = nodes[nodeId];
    const children = childrenMap[nodeId] ?? [];
    const isApex = nodeId === apexNodeId;
    const color = worldLineColors[node.worldLineId] ?? "#aaa";
    const summary = renderNodeSummary ? renderNodeSummary(nodeId) : "";
    const changedLabel = node.changedRefs.map((r) => r.id).join(", ");
    const isFork = children.length > 1;

    return (
      <div key={nodeId}>
        <button
          onClick={() => onSelectNode(nodeId)}
          onDoubleClick={() => onSelectNodeAndClose?.(nodeId)}
          style={{
            ...styles.dagNode,
            borderColor: color,
            backgroundColor: isApex ? color : "#fff",
            color: isApex ? "#fff" : "#333",
            fontWeight: isApex ? "bold" : "normal",
          }}
          title={`Node: ${nodeId.slice(0, 8)}...\nWorldLine: ${node.worldLineId.slice(0, 12)}...\nChanged: ${changedLabel}`}
        >
          <span style={{ ...styles.dagNodeDot, color }}>{"\u25CF"}</span>
          <span style={styles.dagNodeId}>{nodeId.slice(0, 6)}</span>
          {summary && <span style={styles.dagNodeSummary}>[{summary}]</span>}
          {isApex && <span style={styles.apexBadge}>現在</span>}
        </button>

        {/* 分岐表示: CSS border で接続線を描画 */}
        {isFork ? (
          <div style={{ marginLeft: 10, marginTop: 2 }}>
            {children.map((childId, i) => {
              const childColor = worldLineColors[nodes[childId]?.worldLineId] ?? "#aaa";
              const isLast = i === children.length - 1;
              return (
                <div key={childId} style={{ display: "flex" }}>
                  {/* ガター: 縦線 + 横線 + 矢印（白地 + 色アウトライン） */}
                  <div
                    style={{
                      width: GUTTER_W,
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    {/* 縦線 */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 3,
                        height: isLast ? NODE_H / 2 + 1 : "100%",
                        background: childColor,
                        borderRadius: 1,
                      }}
                    />
                    {/* 横線 */}
                    <div
                      style={{
                        position: "absolute",
                        top: NODE_H / 2 - 1,
                        left: 2,
                        width: GUTTER_W - 8,
                        height: 3,
                        background: childColor,
                        borderRadius: 1,
                      }}
                    />
                    {/* 矢印 */}
                    <div
                      style={{
                        position: "absolute",
                        top: NODE_H / 2 - 6,
                        right: 2,
                        fontSize: 10,
                        lineHeight: "12px",
                        color: childColor,
                      }}
                    >
                      {"\u25B6"}
                    </div>
                  </div>
                  {/* ノード本体 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {renderNode(childId, depth + 1)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          children.map((childId) => (
            <div key={childId} style={{ marginLeft: 16, marginTop: 2 }}>
              {renderNode(childId, depth + 1)}
            </div>
          ))
        )}
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
    gap: 2,
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
