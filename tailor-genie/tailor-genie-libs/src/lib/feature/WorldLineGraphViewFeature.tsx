"use client";

import { FC, useState, useEffect, useCallback, useMemo } from "react";

// --- Types (matching server API response) ---

interface StateRef {
  type: string;
  id: string;
  hash: string;
}

interface WorldNode {
  id: string;
  parentId: string | null;
  timestamp: number;
  changedRefs: StateRef[];
  worldLineId: string;
}

interface GraphJson {
  nodes: Record<string, WorldNode>;
  apexNodeId: string | null;
  rootNodeId: string | null;
}

interface ServerData {
  graphs: Record<string, GraphJson>;
  cas: Record<string, unknown>;
}

// --- Tree building ---

interface TreeNode {
  node: WorldNode;
  children: TreeNode[];
}

function buildTree(graph: GraphJson): TreeNode | null {
  if (!graph.rootNodeId) return null;
  const childrenMap: Record<string, string[]> = {};
  for (const node of Object.values(graph.nodes)) {
    if (node.parentId) {
      if (!childrenMap[node.parentId]) childrenMap[node.parentId] = [];
      childrenMap[node.parentId].push(node.id);
    }
  }
  function build(nodeId: string): TreeNode | null {
    const node = graph.nodes[nodeId];
    if (!node) return null;
    const childIds = childrenMap[nodeId] ?? [];
    return {
      node,
      children: childIds.map(build).filter((c): c is TreeNode => c !== null),
    };
  }
  return build(graph.rootNodeId);
}

/** rootからnodeIdまでのパスを辿り、各オブジェクトの最新StateRefを集める */
function getStateRefsAt(graph: GraphJson, nodeId: string): StateRef[] {
  const path: string[] = [];
  let cur: string | null = nodeId;
  while (cur) {
    path.unshift(cur);
    cur = graph.nodes[cur]?.parentId ?? null;
  }
  const refMap = new Map<string, StateRef>();
  for (const nid of path) {
    const n = graph.nodes[nid];
    if (!n) continue;
    for (const ref of n.changedRefs) {
      refMap.set(`${ref.type}:${ref.id}`, ref);
    }
  }
  return Array.from(refMap.values());
}

// --- Color palette for worldLineIds ---
const LINE_COLORS = [
  "#1976d2", "#388e3c", "#f57c00", "#7b1fa2",
  "#c62828", "#00838f", "#4e342e", "#283593",
];
function getLineColor(worldLineId: string, allIds: string[]): string {
  const idx = allIds.indexOf(worldLineId);
  return LINE_COLORS[idx % LINE_COLORS.length];
}

// --- Summarize CAS data ---
function summarizeCasValue(value: unknown): string {
  if (!value || typeof value !== "object") return String(value);
  const obj = value as Record<string, unknown>;

  // conversation: turnの数を表示
  if (Array.isArray(obj.turns)) {
    return `${obj.turns.length} turns`;
  }
  // speaker: nameを表示
  if (typeof obj.name === "string") {
    return obj.name;
  }
  // その他: キーの数
  const keys = Object.keys(obj);
  if (keys.length <= 4) return keys.join(", ");
  return `${keys.length} fields`;
}

// ==========================================================================
// Main Component
// ==========================================================================

export const WorldLineGraphViewFeature: FC = () => {
  const [data, setData] = useState<ServerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apexUpdating, setApexUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/wlg/sync?full=true");
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const scopeIds = data ? Object.keys(data.graphs) : [];

  // 最初のscopeを自動選択
  useEffect(() => {
    if (!selectedScope && scopeIds.length > 0) {
      setSelectedScope(scopeIds[0]);
    }
  }, [scopeIds, selectedScope]);

  const handleSetApex = useCallback(async (nodeId: string) => {
    if (!selectedScope) return;
    setApexUpdating(true);
    try {
      const res = await fetch("/api/wlg/sync", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeId: selectedScope, apexNodeId: nodeId }),
      });
      if (res.ok) {
        await fetchData(); // 即座にリフレッシュ
      } else {
        const body = await res.json().catch(() => ({}));
        setError(`Apex update failed: ${body.error ?? res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "PATCH failed");
    } finally {
      setApexUpdating(false);
    }
  }, [selectedScope, fetchData]);

  const graph = selectedScope && data ? data.graphs[selectedScope] : null;
  const tree = useMemo(() => (graph ? buildTree(graph) : null), [graph]);

  const allWorldLineIds = useMemo(() => {
    if (!graph) return [];
    const ids = new Set<string>();
    for (const node of Object.values(graph.nodes)) ids.add(node.worldLineId);
    return Array.from(ids);
  }, [graph]);

  // 選択ノードの時点での全オブジェクト状態
  const nodeStateRefs = useMemo(() => {
    if (!graph || !selectedNodeId) return [];
    return getStateRefsAt(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  return (
    <div style={{ padding: 16, height: "100%", display: "flex", flexDirection: "column", fontSize: 13 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>World-Line Graph</h2>
        <button onClick={fetchData} style={refreshBtnStyle}>Refresh</button>
      </div>
      {lastUpdated && (
        <div style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>
          {lastUpdated.toLocaleTimeString()} (3s auto)
        </div>
      )}
      {error && <div style={errorStyle}>Error: {error}</div>}

      {/* Scope selector */}
      {scopeIds.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
          {scopeIds.map((id) => (
            <button
              key={id}
              onClick={() => { setSelectedScope(id); setSelectedNodeId(null); }}
              style={{
                padding: "4px 10px",
                fontSize: 12,
                border: selectedScope === id ? "2px solid #1976d2" : "1px solid #ccc",
                borderRadius: 4,
                background: selectedScope === id ? "#e3f2fd" : "#fff",
                cursor: "pointer",
                fontWeight: selectedScope === id ? 700 : 400,
              }}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      {!data && !error && <div style={{ color: "#888" }}>Loading...</div>}

      {graph && (
        <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0, overflow: "hidden" }}>
          {/* Left: DAG Tree */}
          <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 6, padding: 8, background: "#fafafa" }}>
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12, color: "#666" }}>
              DAG Tree ({Object.keys(graph.nodes).length} nodes)
            </div>
            {tree ? (
              <TreeNodeView
                treeNode={tree}
                depth={0}
                apexNodeId={graph.apexNodeId}
                selectedNodeId={selectedNodeId}
                onSelect={setSelectedNodeId}
                onSetApex={handleSetApex}
                apexUpdating={apexUpdating}
                allWorldLineIds={allWorldLineIds}
                cas={data?.cas ?? {}}
              />
            ) : (
              <div style={{ color: "#999" }}>Empty graph</div>
            )}
          </div>

          {/* Right: Node detail */}
          <div style={{ width: 280, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 6, padding: 8, background: "#fafafa" }}>
            {selectedNodeId && graph.nodes[selectedNodeId] ? (
              <NodeDetail
                node={graph.nodes[selectedNodeId]}
                isApex={selectedNodeId === graph.apexNodeId}
                stateRefs={nodeStateRefs}
                cas={data?.cas ?? {}}
                allWorldLineIds={allWorldLineIds}
              />
            ) : (
              <div style={{ color: "#999", textAlign: "center", marginTop: 32 }}>
                ノードをクリックして詳細を表示
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================================================
// Tree Node (recursive)
// ==========================================================================

const TreeNodeView: FC<{
  treeNode: TreeNode;
  depth: number;
  apexNodeId: string | null;
  selectedNodeId: string | null;
  onSelect: (id: string) => void;
  onSetApex: (id: string) => void;
  apexUpdating: boolean;
  allWorldLineIds: string[];
  cas: Record<string, unknown>;
}> = ({ treeNode, depth, apexNodeId, selectedNodeId, onSelect, onSetApex, apexUpdating, allWorldLineIds, cas }) => {
  const { node, children } = treeNode;
  const isApex = node.id === apexNodeId;
  const isSelected = node.id === selectedNodeId;
  const lineColor = getLineColor(node.worldLineId, allWorldLineIds);

  // changedRefsの要約
  const refsSummary = node.changedRefs.map((ref) => {
    const casData = cas[ref.hash];
    const summary = casData ? summarizeCasValue(casData) : "";
    return { ...ref, summary };
  });

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      {/* 接続線 */}
      {depth > 0 && (
        <div style={{ borderLeft: `2px solid ${lineColor}`, height: 8, marginLeft: 8 }} />
      )}

      {/* ノード本体: click=選択, double-click=apex設定 */}
      <div
        onClick={() => onSelect(node.id)}
        onDoubleClick={() => !isApex && !apexUpdating && onSetApex(node.id)}
        title={isApex ? "Current apex" : "Double-click to set as apex"}
        style={{
          padding: "6px 8px",
          marginBottom: 2,
          borderRadius: 6,
          cursor: apexUpdating ? "wait" : "pointer",
          border: isSelected
            ? "2px solid #1976d2"
            : `2px solid ${lineColor}40`,
          background: isSelected ? "#e3f2fd" : isApex ? "#e8f5e9" : "#fff",
          transition: "all 0.15s",
        }}
      >
        {/* ヘッダ: ノードID + タグ */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span
            style={{
              width: 8, height: 8, borderRadius: "50%",
              background: lineColor, display: "inline-block", flexShrink: 0,
            }}
          />
          <code style={{ fontSize: 11, fontWeight: 600, color: "#333" }}>
            {node.id.slice(0, 12)}
          </code>
          {isApex && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: "#fff",
              background: "#388e3c", borderRadius: 3, padding: "1px 5px",
            }}>
              APEX
            </span>
          )}
          <span style={{ fontSize: 10, color: "#999", marginLeft: "auto" }}>
            {new Date(node.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* changedRefsの要約 */}
        {refsSummary.length > 0 && (
          <div style={{ marginLeft: 14, fontSize: 11 }}>
            {refsSummary.map((ref, i) => (
              <div key={i} style={{ display: "flex", gap: 4, alignItems: "baseline", color: "#555" }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: "#fff", borderRadius: 2,
                  padding: "0 4px", background: typeColor(ref.type),
                }}>
                  {ref.type}
                </span>
                <span style={{ color: "#888", fontSize: 10 }}>{ref.id.slice(0, 8)}</span>
                {ref.summary && (
                  <span style={{ color: "#333", fontWeight: 500 }}>{ref.summary}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 子ノード */}
      {children.map((child) => (
        <TreeNodeView
          key={child.node.id}
          treeNode={child}
          depth={depth + 1}
          apexNodeId={apexNodeId}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onSetApex={onSetApex}
          apexUpdating={apexUpdating}
          allWorldLineIds={allWorldLineIds}
          cas={cas}
        />
      ))}
    </div>
  );
};

// ==========================================================================
// Node Detail Panel
// ==========================================================================

const NodeDetail: FC<{
  node: WorldNode;
  isApex: boolean;
  stateRefs: StateRef[];
  cas: Record<string, unknown>;
  allWorldLineIds: string[];
}> = ({ node, isApex, stateRefs, cas, allWorldLineIds }) => {
  const lineColor = getLineColor(node.worldLineId, allWorldLineIds);

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: lineColor, display: "inline-block" }} />
        Node Detail
        {isApex && (
          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", background: "#388e3c", borderRadius: 3, padding: "1px 5px" }}>
            APEX
          </span>
        )}
      </div>

      <DetailRow label="ID" value={node.id} mono />
      <DetailRow label="Parent" value={node.parentId ?? "(root)"} mono />
      <DetailRow label="WorldLine" value={node.worldLineId} mono />
      <DetailRow label="Time" value={new Date(node.timestamp).toLocaleString()} />

      {/* このノードで変更されたオブジェクト */}
      <div style={{ fontWeight: 700, fontSize: 12, margin: "12px 0 6px", color: "#666" }}>
        Changed ({node.changedRefs.length})
      </div>
      {node.changedRefs.map((ref, i) => (
        <RefCard key={i} ref_={ref} cas={cas} />
      ))}

      {/* このノード時点での全オブジェクト状態 */}
      <div style={{ fontWeight: 700, fontSize: 12, margin: "12px 0 6px", color: "#666" }}>
        State at this node ({stateRefs.length} objects)
      </div>
      {stateRefs.map((ref, i) => (
        <RefCard key={i} ref_={ref} cas={cas} />
      ))}
    </div>
  );
};

// ==========================================================================
// Sub-components
// ==========================================================================

const RefCard: FC<{ ref_: StateRef; cas: Record<string, unknown> }> = ({ ref_, cas }) => {
  const [expanded, setExpanded] = useState(false);
  const casData = cas[ref_.hash];

  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "4px 6px",
          background: "#f0f0f0",
          borderRadius: 4,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{
          fontSize: 9, fontWeight: 600, color: "#fff", borderRadius: 2,
          padding: "0 4px", background: typeColor(ref_.type),
        }}>
          {ref_.type}
        </span>
        <span style={{ fontSize: 10, color: "#666", fontFamily: "monospace" }}>
          {ref_.id.slice(0, 8)}
        </span>
        <span style={{ fontSize: 10, color: "#333", fontWeight: 500, marginLeft: "auto" }}>
          {casData ? summarizeCasValue(casData) : "?"}
        </span>
        <span style={{ fontSize: 10, color: "#aaa" }}>{expanded ? "▼" : "▶"}</span>
      </div>
      {expanded && casData && (
        <pre style={{
          background: "#f8f8f8",
          padding: 6,
          borderRadius: 4,
          overflow: "auto",
          maxHeight: 200,
          fontSize: 11,
          color: "#222",
          margin: "2px 0 0",
          border: "1px solid #e0e0e0",
        }}>
          {JSON.stringify(casData, null, 2)}
        </pre>
      )}
    </div>
  );
};

const DetailRow: FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: "flex", gap: 8, marginBottom: 3 }}>
    <span style={{ color: "#888", fontSize: 11, minWidth: 60 }}>{label}</span>
    <span style={{
      fontSize: 11,
      fontFamily: mono ? "monospace" : "inherit",
      color: "#333",
      wordBreak: "break-all",
    }}>
      {value}
    </span>
  </div>
);

// --- Helpers ---

function typeColor(type: string): string {
  switch (type) {
    case "conversation": return "#1565c0";
    case "speaker": return "#6a1b9a";
    case "context": return "#e65100";
    default: return "#616161";
  }
}

const refreshBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  background: "#1976d2",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
};

const errorStyle: React.CSSProperties = {
  color: "#d32f2f",
  padding: 8,
  background: "#ffebee",
  borderRadius: 4,
  marginBottom: 8,
};
