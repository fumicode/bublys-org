'use client';

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { WorldLineGraph } from '../domain/WorldLineGraph.js';
import { computeTreeLayout } from './treeLayout.js';
import { computeOrganicTree, OrganicEdge } from './organicTree.js';

// ============================================================================
// Types
// ============================================================================

export type WorldLineTreeViewProps = {
  graph: WorldLineGraph;
  /** ノードID → ユーザーがつけた名前（ラベル）。あればノード上に描く。 */
  getNodeLabel?: (nodeId: string) => string;
  /**
   * ノードクリック時のハンドラ。読み取り専用ビューなので状態は復元しない —
   * 呼び出し側でローカルに「選択中ノード」を保持して詳細表示する用途を想定。
   */
  onSelectNode?: (nodeId: string) => void;
};

// ============================================================================
// 定数
// ============================================================================

const PADDING = 28;
const NODE_RADIUS = 6;
const APEX_GLOW_RADIUS = 16;
const FADE_MS = 380;

const edgeKey = (from: string, to: string) => `${from}->${to}`;
const leafKey = (nodeId: string) => `leaf:${nodeId}`;
const nodeKey = (nodeId: string) => `node:${nodeId}`;

// ============================================================================
// WorldLineTreeView — 成果木（有機的な木のビジュアル・SVG・読み取り専用）
// ============================================================================

/**
 * world-line グラフを「根が下、世代が進むほど上に伸びる木」として SVG に描く、
 * 完成した世界線の全体像を眺めて達成感を味わうための読み取り専用ビュー（UI上は「成果木」）。
 *
 * 分岐構造の可読性より情緒的な見た目を優先し、computeOrganicTree で生成した
 * ジッター・テーパー付きの枝と葉の花/実の装飾を、開いたときに root 側から
 * timestamp 順で伸びるアニメーションとともに描く。ジッターはノード/エッジIDから
 * 決定的にシードされるため、同じグラフ状態なら再レンダリングしても同じ見た目になる。
 *
 * 開いている間に編集が進んで新しい枝/葉が増えた場合は、その場でアニメーションを
 * 巻き戻さず即座にフル表示にする（「開いた瞬間の履歴だけが育つ演出の対象」というルール）。
 */
export const WorldLineTreeView: FC<WorldLineTreeViewProps> = ({
  graph,
  getNodeLabel,
  onSelectNode,
}) => {
  const layout = useMemo(() => computeTreeLayout(graph), [graph.state]);
  const apexNodeId = graph.state.apexNodeId;
  const labelize = getNodeLabel ?? (() => '');

  const nodeTimestamps = useMemo(
    () => new Map(Object.values(graph.state.nodes).map((n) => [n.id, n.timestamp])),
    [graph.state]
  );
  const organic = useMemo(
    () => computeOrganicTree(layout, apexNodeId, nodeTimestamps),
    [layout, apexNodeId, nodeTimestamps]
  );

  const [started, setStarted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // マウント後に最初に育っていた枝/葉/ノードだけをアニメーション対象として記録する。
  // それ以降に増えたものは delay 無しでその場にフル表示にする。
  const initialKeysRef = useRef<Set<string> | null>(null);
  if (initialKeysRef.current === null && layout.nodes.size > 0) {
    const keys = new Set<string>();
    for (const edge of organic.edges) keys.add(edgeKey(edge.from, edge.to));
    for (const leaf of organic.leaves) keys.add(leafKey(leaf.nodeId));
    for (const id of layout.nodes.keys()) keys.add(nodeKey(id));
    initialKeysRef.current = keys;
  }
  const isAnimated = (key: string) => initialKeysRef.current?.has(key) ?? false;

  const edgeCompletionByTo = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of organic.edges) map.set(edge.to, edge.delayMs + edge.durationMs);
    return map;
  }, [organic.edges]);
  const leafByNodeId = useMemo(
    () => new Map(organic.leaves.map((leaf) => [leaf.nodeId, leaf])),
    [organic.leaves]
  );

  if (layout.nodes.size === 0) {
    return <div style={styles.root}><div style={styles.emptyText}>履歴がありません。編集すると記録されます。</div></div>;
  }

  const viewBox = `${layout.minX - PADDING} ${-PADDING} ${
    layout.maxX - layout.minX + PADDING * 2
  } ${layout.maxY + PADDING * 2}`;

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes bublys-achievement-tree-apex-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={styles.svg}>
        {organic.edges.map((edge) => {
          const animated = isAnimated(edgeKey(edge.from, edge.to));
          return <OrganicEdgeView key={edgeKey(edge.from, edge.to)} edge={edge} started={started} animated={animated} />;
        })}

        {Array.from(layout.nodes.entries()).map(([id, node]) => {
          const isApex = id === apexNodeId;
          const label = labelize(id);
          const title = label || id.slice(-6);
          const revealAtMs = edgeCompletionByTo.get(id) ?? 0;
          const animated = isAnimated(nodeKey(id));
          const fadeStyle: React.CSSProperties = {
            opacity: started ? 1 : 0,
            transition: animated ? `opacity ${FADE_MS}ms ease-out ${revealAtMs}ms` : 'none',
          };
          const leaf = node.isLeaf ? leafByNodeId.get(id) : undefined;

          return (
            <g
              key={id}
              onClick={onSelectNode ? () => onSelectNode(id) : undefined}
              style={onSelectNode ? styles.clickable : undefined}
            >
              <title>{title}</title>

              {isApex && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={APEX_GLOW_RADIUS}
                  fill={node.color}
                  style={{
                    ...fadeStyle,
                    filter: 'blur(4px)',
                    animation: started ? 'bublys-achievement-tree-apex-pulse 2.4s ease-in-out infinite' : undefined,
                    animationDelay: `${revealAtMs}ms`,
                  }}
                />
              )}

              {leaf ? (
                <g style={fadeStyle}>
                  {leaf.petals.map((petal, i) => (
                    <circle
                      key={i}
                      cx={node.x + petal.dx}
                      cy={node.y + petal.dy}
                      r={petal.r}
                      fill={leaf.color}
                      fillOpacity={0.85}
                    />
                  ))}
                </g>
              ) : (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={NODE_RADIUS * 0.6}
                  fill="rgba(20,22,30,0.85)"
                  stroke={node.color}
                  strokeWidth={isApex ? 1.5 : 1}
                  style={fadeStyle}
                />
              )}

              {/* クリック当たり判定（装飾の見た目に関わらず一定サイズを確保） */}
              <circle cx={node.x} cy={node.y} r={NODE_RADIUS + 4} fill="transparent" style={{ pointerEvents: 'all' }} />

              {label && (
                <text x={node.x} y={node.y - NODE_RADIUS - 4} textAnchor="middle" style={{ ...styles.labelText, ...fadeStyle }}>
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ============================================================================
// 枝1本の描画（中心線が伸びるアニメーション → テーパー付き輪郭のフェードイン）
// ============================================================================

const OrganicEdgeView: FC<{ edge: OrganicEdge; started: boolean; animated: boolean }> = ({
  edge,
  started,
  animated,
}) => {
  const centerlineStyle: React.CSSProperties = {
    strokeDashoffset: started ? 0 : edge.approxLength,
    transition: animated ? `stroke-dashoffset ${edge.durationMs}ms ease-out ${edge.delayMs}ms` : 'none',
  };
  const outlineStyle: React.CSSProperties = {
    opacity: started ? 1 : 0,
    transition: animated ? `opacity ${edge.durationMs}ms ease-out ${edge.delayMs + edge.durationMs}ms` : 'none',
  };

  return (
    <>
      <path
        d={edge.centerlinePath}
        fill="none"
        stroke={edge.barkColor}
        strokeWidth={Math.max(1, edge.widthTo * 0.6)}
        strokeLinecap="round"
        strokeDasharray={edge.approxLength}
        style={centerlineStyle}
      />
      <path d={edge.outlinePath} fill={edge.barkColor} style={outlineStyle} />
    </>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    // ビューポート基準の上限（vhは祖先の高さ解決の曖昧さに左右されない）。
    // 通常のバブルはコンテンツのfit-contentサイズで開くため、祖先チェーンの
    // 高さが不定だと SVG の height:100% が意図せず大きく解決されスクロールが
    // 発生しうる。ここで確実な上限を与えて防ぐ。
    maxHeight: '60vh',
    overflow: 'hidden',
  },
  svg: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  emptyText: {
    padding: 24,
    color: '#666',
    fontStyle: 'italic',
  },
  clickable: {
    cursor: 'pointer',
  },
  labelText: {
    fontSize: 9,
    fill: 'rgba(230,235,255,0.92)',
    fontFamily: 'ui-sans-serif, -apple-system, sans-serif',
  },
};
