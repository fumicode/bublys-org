'use client';

/**
 * WorldLineInspectorView — 世界線の中身を覗くための表示（プレゼンテーショナル）
 *
 * 世界線は「参照（グラフ）」と「値（CAS）」が別々に生きている。
 * グラフは消えないが、値はメモリ上の CAS から追い出されて IndexedDB にだけ残る。
 * この2つのズレが不具合の温床なので、**参照ごとに値がどこにあるか**を必ず出す。
 */
import { FC, useEffect, useRef } from 'react';
import { LOCATION_MARK, LOCATION_ORDER, type RefLocation } from './refLocation.js';

export type { RefLocation };

export type InspectorRefRow = {
  type: string;
  id: string;
  hash: string;
  location: RefLocation;
  /** 値のプレビュー（メモリにあるとき、または引いてきたとき） */
  preview?: string;
};

export type InspectorNodeRow = {
  id: string;
  parentId: string | null;
  timestamp: number;
  label?: string;
  intentLabel?: string;
  worldLineId: string;
  isApex: boolean;
  isRoot: boolean;
  /** root からの深さ（表示のインデント用） */
  depth: number;
  changed: InspectorRefRow[];
};

export type InspectorScopeRow = {
  scopeId: string;
  nodeCount: number;
  inMemory: boolean;
  inIdb: boolean;
  apexNodeId: string | null;
  /** いまの世界に載っている型ごとの件数 */
  typeCounts: { type: string; count: number }[];
};

export type WorldLineInspectorViewProps = {
  memoryScopeCount: number;
  memoryCasCount: number;
  casLimit: number;
  /** null = まだ読んでいない */
  idbScopeCount: number | null;
  idbStateCount: number | null;
  scopes: InspectorScopeRow[];
  selectedScopeId: string | null;
  onSelectScope: (scopeId: string) => void;
  nodes: InspectorNodeRow[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  /** 選択ノード時点の「世界の全体状態」（root からの畳み込み） */
  stateAtNode: InspectorRefRow[];
  onReload: () => void;
  /** その値を IndexedDB から引いてくる */
  onLoadValue: (hash: string) => void;
  loading: boolean;
};

const short = (s: string | null | undefined, n = 8) =>
  !s ? '—' : s.length <= n ? s : `${s.slice(0, n)}…`;

const S = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    background: '#0d1117',
    color: '#c9d1d9',
    font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
    overflow: 'hidden',
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '8px 12px',
    borderBottom: '1px solid #30363d',
    flexWrap: 'wrap' as const,
  },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  left: {
    width: 260,
    flexShrink: 0,
    borderRight: '1px solid #30363d',
    overflowY: 'auto' as const,
  },
  right: { flex: 1, display: 'flex', flexDirection: 'column' as const, minWidth: 0 },
  pane: { flex: 1, overflow: 'auto' as const, minHeight: 0 },
  h: {
    padding: '6px 12px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    color: '#8b949e',
    position: 'sticky' as const,
    top: 0,
  },
  td: {
    padding: '3px 8px',
    borderBottom: '1px solid #21262d',
    verticalAlign: 'top' as const,
    whiteSpace: 'nowrap' as const,
  },
  // 長い値は1行に省略して出す。折り返すと1行が数十行になって表が読めなくなる
  ellipsis: {
    maxWidth: 520,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  table: { borderCollapse: 'collapse' as const, width: 'max-content', minWidth: '100%' },
  btn: {
    background: '#21262d',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    borderRadius: 4,
    padding: '3px 10px',
    cursor: 'pointer',
    font: 'inherit',
  },
};

const Locations: FC<{ rows: InspectorRefRow[] }> = ({ rows }) => {
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.location] = (acc[r.location] ?? 0) + 1;
    return acc;
  }, {});
  return (
    <>
      {LOCATION_ORDER.filter((k) => counts[k])
        .map((k) => (
          <span key={k} style={{ color: LOCATION_MARK[k].color, marginRight: 8 }}>
            {LOCATION_MARK[k].mark}
            {counts[k]}
          </span>
        ))}
    </>
  );
};

/** 選択中のスコープ行。既定選択が一覧の下の方にあると気づけないので、見える位置へ送る */
const ScopeRow: FC<{
  scope: InspectorScopeRow;
  selected: boolean;
  onSelect: () => void;
}> = ({ scope: s, selected, onSelect }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        padding: '6px 10px',
        cursor: 'pointer',
        borderBottom: '1px solid #21262d',
        background: selected ? '#1f6feb33' : undefined,
        borderLeft: selected ? '3px solid #58a6ff' : '3px solid transparent',
      }}
    >
      <div style={{ color: '#e6edf3', wordBreak: 'break-all' }}>{s.scopeId}</div>
      <div style={{ color: '#8b949e' }}>
        {s.nodeCount} ノード
        {!s.inMemory && <span style={{ color: '#d29922' }}> ・永続のみ</span>}
        {!s.inIdb && s.inMemory && <span style={{ color: '#d29922' }}> ・未永続</span>}
      </div>
      <div style={{ color: '#6e7681' }}>
        {s.typeCounts.map((t) => `${t.type}×${t.count}`).join(' ') || '(空)'}
      </div>
    </div>
  );
};

export const WorldLineInspectorView: FC<WorldLineInspectorViewProps> = ({
  memoryScopeCount,
  memoryCasCount,
  casLimit,
  idbScopeCount,
  idbStateCount,
  scopes,
  selectedScopeId,
  onSelectScope,
  nodes,
  selectedNodeId,
  onSelectNode,
  stateAtNode,
  onReload,
  onLoadValue,
  loading,
}) => (
  <div style={S.root}>
    <div style={S.bar}>
      <strong style={{ color: '#58a6ff' }}>世界線インスペクタ</strong>
      <span>
        メモリ: スコープ {memoryScopeCount} / 状態 {memoryCasCount}
        <span style={{ color: memoryCasCount >= casLimit ? '#f85149' : '#8b949e' }}>
          {' '}
          (上限 {casLimit})
        </span>
      </span>
      <span>
        IndexedDB: グラフ {idbScopeCount ?? '…'} / 状態 {idbStateCount ?? '…'}
      </span>
      <span style={{ color: '#8b949e' }}>
        {LOCATION_ORDER.map((k) => `${LOCATION_MARK[k].mark}${LOCATION_MARK[k].label}`).join('  ')}
      </span>
      <button type="button" style={S.btn} onClick={onReload} disabled={loading}>
        {loading ? '読み込み中…' : '再読込'}
      </button>
    </div>

    <div style={S.body}>
      <div style={S.left}>
        <div style={S.h}>スコープ ({scopes.length})</div>
        {scopes.map((s) => (
          <ScopeRow
            key={s.scopeId}
            scope={s}
            selected={s.scopeId === selectedScopeId}
            onSelect={() => onSelectScope(s.scopeId)}
          />
        ))}
      </div>

      <div style={S.right}>
        <div style={S.pane}>
          <div style={S.h}>
            ノード ({nodes.length}) — このノードで「変わったもの」だけが載る（差分）
          </div>
          <table style={S.table}>
            <tbody>
              {nodes.map((n) => (
                <tr
                  key={n.id}
                  onClick={() => onSelectNode(n.id)}
                  style={{
                    cursor: 'pointer',
                    background: n.id === selectedNodeId ? '#1f6feb33' : undefined,
                  }}
                >
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#6e7681' }}>{'│ '.repeat(n.depth)}</span>
                    {n.isApex && <span style={{ color: '#58a6ff' }}>▶ </span>}
                    {n.isRoot && <span style={{ color: '#7ee787' }}>⌂ </span>}
                    <span style={{ color: '#e6edf3' }}>{short(n.id, 10)}</span>
                  </td>
                  <td style={{ ...S.td, color: '#d2a8ff' }}>{n.label ?? ''}</td>
                  <td style={{ ...S.td, color: '#8b949e' }}>{n.intentLabel ?? ''}</td>
                  <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                    <Locations rows={n.changed} />
                  </td>
                  <td
                    style={{ ...S.td, ...S.ellipsis, color: '#8b949e' }}
                    title={n.changed.map((r) => `${r.type}:${r.id}`).join('\n')}
                  >
                    {n.changed
                      .slice(0, 6)
                      .map((r) => `${r.type}:${short(r.id, 8)}`)
                      .join(' ')}
                    {n.changed.length > 6 && (
                      <span style={{ color: '#6e7681' }}> …他{n.changed.length - 6}件</span>
                    )}
                  </td>
                  <td style={{ ...S.td, color: '#6e7681', whiteSpace: 'nowrap' }}>
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ ...S.pane, borderTop: '1px solid #30363d' }}>
          <div style={S.h}>
            このノード時点の世界の全体状態 ({stateAtNode.length}) —
            root からの差分を畳み込んだ結果
          </div>
          <table style={S.table}>
            <tbody>
              {stateAtNode.map((r) => {
                const loc = LOCATION_MARK[r.location];
                return (
                  <tr key={`${r.type}:${r.id}`}>
                    <td style={{ ...S.td, color: loc.color, whiteSpace: 'nowrap' }}>
                      {loc.mark} {loc.label}
                    </td>
                    <td style={{ ...S.td, color: '#79c0ff', whiteSpace: 'nowrap' }}>
                      {r.type}
                    </td>
                    <td style={{ ...S.td, color: '#e6edf3' }}>{r.id}</td>
                    <td style={{ ...S.td, color: '#6e7681', whiteSpace: 'nowrap' }}>
                      {short(r.hash, 8)}
                    </td>
                    <td
                      style={{ ...S.td, ...S.ellipsis, color: '#8b949e' }}
                      title={r.preview ?? ''}
                    >
                      {r.preview ?? (
                        <button
                          type="button"
                          style={S.btn}
                          onClick={() => onLoadValue(r.hash)}
                          disabled={r.location === 'lost' || r.location === 'tombstone'}
                        >
                          値を引く
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);
