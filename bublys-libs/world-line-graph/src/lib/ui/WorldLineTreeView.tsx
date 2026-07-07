'use client';

import React, { FC, useMemo } from 'react';
import { WorldLineGraph } from '../domain/WorldLineGraph.js';
import { computeTreeLayout } from './treeLayout.js';

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
const APEX_RING_GAP = 2.5;
const EDGE_BASE_WIDTH = 1.2;

// ============================================================================
// WorldLineTreeView — 木のビジュアル化（SVG・静的/軽インタラクティブ）
// ============================================================================

/**
 * world-line グラフを「根が下、世代が進むほど上に伸びる木」として SVG に描く、
 * 完成した世界線の全体像を眺めて特徴を掴むための読み取り専用ビュー。
 *
 * {@link WorldLinesCanvasView}（bubbles-ui、編集中の操作用）とは目的が異なる:
 * こちらは apex 追従の魚眼カメラを持たず、木全体を一目で見せることを優先する。
 * SVG の viewBox + preserveAspectRatio="xMidYMid meet" により、木の高さ
 * （treeLayout の既定 TREE_HEIGHT）は与えられたバブルの実際の描画サイズに
 * 収まるよう自動的に縮小表示される——バブルのサイズ自体をこの component が
 * 決めようとはしない（バブルの既定サイズはバブル側の関心事）。
 */
export const WorldLineTreeView: FC<WorldLineTreeViewProps> = ({
  graph,
  getNodeLabel,
  onSelectNode,
}) => {
  const layout = useMemo(() => computeTreeLayout(graph), [graph.state]);
  const apexNodeId = graph.state.apexNodeId;

  const labelize = getNodeLabel ?? (() => '');

  if (layout.nodes.size === 0) {
    return <div style={styles.root}><div style={styles.emptyText}>履歴がありません。編集すると記録されます。</div></div>;
  }

  const viewBox = `${layout.minX - PADDING} ${-PADDING} ${
    layout.maxX - layout.minX + PADDING * 2
  } ${layout.maxY + PADDING * 2}`;

  return (
    <div style={styles.root}>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={styles.svg}>
        {layout.edges.map((edge) => {
          const from = layout.nodes.get(edge.from);
          const to = layout.nodes.get(edge.to);
          if (!from || !to) return null;
          const cpx = from.x + (to.x - from.x) * 0.15;
          const cpy = from.y + (to.y - from.y) * 0.75;
          // 分岐の広がり（subtreeWidth）だけでなく、この枝1本に畳み込まれた元の
          // 編集回数（editCount）でも太くする——分岐が無くても、同じ一本道で
          // 何度も編集を重ねた枝は幹らしく太く見える。
          const widthFactor =
            1 +
            Math.log2(1 + to.subtreeWidth) * 0.8 +
            Math.log2(1 + edge.editCount) * 0.6;
          return (
            <path
              key={`${edge.from}->${edge.to}`}
              d={`M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`}
              fill="none"
              stroke={to.color}
              strokeOpacity={0.65}
              strokeWidth={EDGE_BASE_WIDTH * widthFactor}
              strokeLinecap="round"
            />
          );
        })}

        {Array.from(layout.nodes.entries()).map(([id, node]) => {
          const isApex = id === apexNodeId;
          const label = labelize(id);
          const title = label || id.slice(-6);

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
                  r={NODE_RADIUS + APEX_RING_GAP}
                  fill="none"
                  stroke={node.color}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.isLeaf ? NODE_RADIUS * 0.75 : NODE_RADIUS}
                fill={isApex ? node.color : node.isLeaf ? 'rgba(126,231,135,0.35)' : 'rgba(20,22,30,0.85)'}
                stroke={node.color}
                strokeWidth={isApex ? 1.5 : 1}
              />
              {label && (
                <text
                  x={node.x}
                  y={node.y - NODE_RADIUS - 4}
                  textAnchor="middle"
                  style={styles.labelText}
                >
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
