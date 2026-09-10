'use client';

/**
 * WorldLine3DInspector — 世界線を3Dで覗く（Redux と IndexedDB を読むだけ）。
 *
 * **読み取り専用**。useAppDispatch / useCasScope を import しない。
 * 覗くだけで世界が動いてはいけないので、moveTo すらしない。
 * （時間移動させたいときは onTimeTravel を注入する。既定では出さない）
 *
 * three はここにも現れない。WorldLine3DView が effect 内で動的 import する。
 */
import { useCallback, useEffect, useMemo, useState, type FC } from 'react';
import { useAppSelector } from '@bublys-org/state-management';
import type { RootState } from '@bublys-org/state-management';
import { WorldLineGraph } from '../domain/WorldLineGraph';
import { listGraphScopeIdsFromIDB, listStateHashesFromIDB } from './IndexedDBStore';
import { locateRef, type InspectorSources } from './inspectorModel';
import { LOCATION_MARK } from '../ui/refLocation';
import { ACTION_COLOR, ACTION_LABEL } from '../ui/world-line-3d/index.js';
import {
  WorldLine3DView,
  computeWorldLine3DLayout,
  type Selection3D,
} from '../ui/world-line-3d/index.js';
import type { NestedScopeResolver } from '../ui/world-line-3d/index.js';

export type WorldLine3DInspectorProps = {
  /** 図の起点になるスコープ（アプリ全体スコープを渡す） */
  readonly rootScopeId: string;
  /**
   * 入れ子の導出。省略時は `${type}:${id}` 規約。
   * hotel のように独自の本籍規約があるバブリはここで注入する。
   */
  readonly resolveNestedScopeId?: NestedScopeResolver;
  /** そのスコープが親とアドレス連動しているか（universe だけ true になる想定） */
  readonly isLinked?: (childScopeId: string, parentScopeId: string) => boolean;
};

export const WorldLine3DInspector: FC<WorldLine3DInspectorProps> = ({
  rootScopeId,
  resolveNestedScopeId,
  isLinked,
}) => {
  const graphJsons = useAppSelector((s: RootState) => s.worldLineGraph?.graphs ?? {});
  const cas = useAppSelector((s: RootState) => s.worldLineGraph?.cas ?? {});

  const [idbHashes, setIdbHashes] = useState<Set<string> | null>(null);
  const [idbScopeIds, setIdbScopeIds] = useState<string[] | null>(null);
  const [selection, setSelection] = useState<Selection3D | null>(null);
  /** 畳んでいる入れ子スコープ。空＝全部展開 */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([listGraphScopeIdsFromIDB(), listStateHashesFromIDB()])
      .then(([ids, hashes]) => {
        if (cancelled) return;
        setIdbScopeIds(ids);
        setIdbHashes(new Set(hashes));
      })
      .catch((e) => {
        console.warn('世界線3D: IndexedDB を読めませんでした', e);
        if (!cancelled) {
          setIdbScopeIds([]);
          setIdbHashes(new Set());
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sources: InspectorSources = useMemo(
    () => ({ cas, idbHashes, fetched: {} }),
    [cas, idbHashes]
  );
  const locate = useCallback(
    (hash: string) => locateRef(hash, sources),
    [sources]
  );

  const graphs = useMemo(() => {
    const out: Record<string, WorldLineGraph> = {};
    for (const [scopeId, json] of Object.entries(graphJsons)) {
      out[scopeId] = WorldLineGraph.fromJSON(json);
    }
    return out;
  }, [graphJsons]);

  const layout = useMemo(
    () =>
      computeWorldLine3DLayout({
        rootScopeId,
        graphs,
        locate,
        resolveNestedScopeId,
        isLinked,
        collapsedScopeIds: collapsed,
      }),
    [rootScopeId, graphs, locate, resolveNestedScopeId, isLinked, collapsed]
  );

  const expandAll = useCallback(() => setCollapsed(new Set()), []);

  const toggleNested = useCallback((scopeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(scopeId)) next.delete(scopeId);
      else next.add(scopeId);
      return next;
    });
  }, []);

  const detail = (
    <Detail
      layout={layout}
      selection={selection}
      locate={locate}
      onToggleNested={toggleNested}
      cas={cas}
      idbScopeCount={idbScopeIds?.length ?? null}
    />
  );

  return (
    <WorldLine3DView
      layout={layout}
      locate={locate}
      selection={selection}
      onSelect={setSelection}
      onToggleNested={toggleNested}
      onExpandAll={expandAll}
      detail={detail}
    />
  );
};

// ============================================================================
// 右の詳細パネル（読ませる文字は DOM に出す。3D の中の文字は読めない）
// ============================================================================

const S = {
  wrap: {
    padding: 10,
    color: '#c9d1d9',
    font: '11px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
  } as React.CSSProperties,
  h: { color: '#58a6ff', fontWeight: 700, marginBottom: 6 } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: 6,
    padding: '2px 0',
    borderBottom: '1px solid #21262d',
  } as React.CSSProperties,
};

const Detail: FC<{
  layout: ReturnType<typeof computeWorldLine3DLayout>;
  selection: Selection3D | null;
  locate: (hash: string) => ReturnType<typeof locateRef>;
  onToggleNested?: (scopeId: string) => void;
  cas: Readonly<Record<string, unknown>>;
  idbScopeCount: number | null;
}> = ({ layout, selection, locate, onToggleNested, cas, idbScopeCount }) => {
  if (!selection) {
    return (
      <div style={S.wrap}>
        <div style={S.h}>選択なし</div>
        <div style={{ color: '#8b949e' }}>
          板をクリックするとそのノードの中身が出ます。入れ子を持つセル（右上に点が付いているもの）を
          クリックすると、その世界線を開いたり閉じたりできます。
          点が ● なら開いていて、○ なら畳んでいます。
        </div>
        <div style={{ marginTop: 8, color: '#8b949e' }}>
          メモリ上の状態 {Object.keys(cas).length} 件 / 永続スコープ {idbScopeCount ?? '…'} 件
        </div>
      </div>
    );
  }
  const plate = layout.plates.find(
    (p) => p.scopeId === selection.scopeId && p.nodeId === selection.nodeId
  );
  if (!plate) return <div style={S.wrap}>そのノードは図にありません</div>;

  const preview = (hash: string) => {
    const v = cas[hash];
    if (v === undefined) return '（メモリに無い）';
    const j = JSON.stringify(v);
    return j.length > 160 ? `${j.slice(0, 160)}…` : j;
  };

  return (
    <div style={S.wrap}>
      <div style={S.h}>{plate.scopeId}</div>
      <div style={{ color: '#8b949e', wordBreak: 'break-all' }}>
        ノード {plate.nodeId}
        {plate.isRoot && ' ⌂起点'}
        {plate.isApex && ' ▶現在地'}
      </div>
      {plate.label && <div style={{ color: '#d2a8ff' }}>名前: {plate.label}</div>}
      {plate.intentLabel && (
        <div style={{ color: '#8b949e' }}>意図: {plate.intentLabel}</div>
      )}
      <div style={{ color: '#8b949e' }}>
        編集ステップ {plate.depth} / {new Date(plate.timestamp).toLocaleString()}
      </div>

      <div style={{ ...S.h, marginTop: 10 }}>
        この時点の世界の全体状態 ({plate.cells.length})
      </div>
      {[...plate.cells]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((c) => {
          const loc = locate(c.hash);
          const mark = LOCATION_MARK[c.action === 'deleted' ? 'tombstone' : loc];
          return (
            <div
              key={c.key}
              style={{
                ...S.row,
                background:
                  selection.cellKey === c.key ? '#1f6feb33' : undefined,
              }}
            >
              <span style={{ color: mark.color, whiteSpace: 'nowrap' }}>{mark.mark}</span>
              <span
                style={{ color: ACTION_COLOR[c.action], whiteSpace: 'nowrap' }}
                title={ACTION_LABEL[c.action]}
              >
                {ACTION_LABEL[c.action]}
              </span>
              <span style={{ color: '#79c0ff', whiteSpace: 'nowrap' }}>{c.type}</span>
              <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }}>
                {c.id}
                {c.nestedScopeId && (
                  <button
                    type="button"
                    onClick={() => onToggleNested?.(c.nestedScopeId as string)}
                    title={c.nestedShown ? 'この世界線を畳む' : 'この世界線を開く'}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0 4px',
                      cursor: 'pointer',
                      font: 'inherit',
                      color: c.nestedShown ? '#58a6ff' : '#6e7681',
                    }}
                  >
                    {c.nestedShown ? '↘' : '▸'}
                    {c.nestedScopeId}
                  </button>
                )}
                <div style={{ color: '#6e7681' }}>{preview(c.hash)}</div>
              </span>
            </div>
          );
        })}
      <div style={{ marginTop: 8, color: '#8b949e' }}>
        ↘ を押すとその世界線を畳み、▸ を押すと開きます。
        左の記号 = 値の所在、右の言葉 = このノードで起きたこと。
        消されたものは、その瞬間のノードにだけ墓標として出て、以降は現れません。
      </div>
    </div>
  );
};
