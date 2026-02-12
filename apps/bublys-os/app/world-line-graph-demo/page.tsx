'use client';

import React, { useState, useEffect } from 'react';
import {
  useCasScope,
  ObjectShell,
  type WorldNode,
} from '@bublys-org/world-line-graph';
import { DomainRegistryProvider, defineDomainObjects } from '@bublys-org/domain-registry';
import { Counter } from './Counter';

// ============================================================================
// Counter CAS Registry
// ============================================================================

const COUNTER_DOMAIN_OBJECTS = defineDomainObjects({
  counter: {
    class: Counter,
    fromJSON: (json) => Counter.fromJSON(json as { id: string; value: number }),
    toJSON: (c: Counter) => c.toJSON(),
    getId: (c: Counter) => c.state.id,
  },
});

// ============================================================================
// Counter ID 生成
// ============================================================================

let nextCounterIndex = 0;
function generateCounterId(): string {
  nextCounterIndex++;
  const letter = String.fromCharCode(65 + ((nextCounterIndex - 1) % 26));
  return `counter-${letter}`;
}

const INITIAL_COUNTERS = [
  new Counter({ id: generateCounterId(), value: 0 }),
  new Counter({ id: generateCounterId(), value: 0 }),
];

// ============================================================================
// CounterPanel — 単一カウンターの操作 UI
// ============================================================================

function CounterPanel({
  shell,
  onRemove,
}: {
  shell: ObjectShell<Counter>;
  onRemove: () => void;
}) {
  const [obj, setObj] = useState(shell.object);

  // apex 変更時に shell.object が差し替わるので同期
  useEffect(() => {
    setObj(shell.object);
  }, [shell.object]);

  const handleCountUp = () => {
    shell.update((c) => c.countUp());
    setObj(shell.object);
  };
  const handleCountDown = () => {
    shell.update((c) => c.countDown());
    setObj(shell.object);
  };

  return (
    <div style={styles.counterPanel}>
      <div style={styles.counterHeader}>
        <h3 style={styles.counterId}>{shell.id}</h3>
        <button onClick={onRemove} style={styles.removeButton}>
          x
        </button>
      </div>
      <div style={styles.valueDisplay}>{obj.state.value}</div>
      <div style={styles.buttonRow}>
        <button onClick={handleCountDown} style={styles.button}>
          -
        </button>
        <button onClick={handleCountUp} style={styles.button}>
          +
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// CountersContainer — useCasScope で全機能を統合
// ============================================================================

function CountersContainer() {
  const scope = useCasScope('counter-demo', {
    initialObjects: INITIAL_COUNTERS.map((c) => ({ type: 'counter', object: c })),
  });

  const counterShells = scope.shells<Counter>('counter');
  const { graph, getLoadedState } = scope;

  const handleAddCounter = () => {
    scope.addObject(new Counter({ id: generateCounterId(), value: 0 }));
  };

  // ControlPanel inline
  const apexNode = graph.state.apexNodeId
    ? graph.state.nodes[graph.state.apexNodeId]
    : null;
  const canUndo =
    apexNode?.parentId !== null && apexNode?.parentId !== undefined;
  const childrenMap = graph.getChildrenMap();
  const canRedo =
    apexNode !== null && (childrenMap[apexNode.id]?.length ?? 0) > 0;

  // DAG rendering
  const { nodes, apexNodeId, rootNodeId } = graph.state;

  // worldLineId ごとの色を割り当て
  const worldLineIds = new Set<string>();
  for (const node of Object.values(nodes)) {
    worldLineIds.add(node.worldLineId);
  }
  const colorPalette = [
    '#4fc3f7', '#81c784', '#ffb74d', '#e57373',
    '#ba68c8', '#4db6ac', '#fff176', '#f06292',
  ];
  const worldLineColors: Record<string, string> = {};
  let colorIdx = 0;
  for (const wlId of worldLineIds) {
    worldLineColors[wlId] = colorPalette[colorIdx % colorPalette.length];
    colorIdx++;
  }

  function getNodeSummary(nodeId: string): string {
    const refs = graph.getStateRefsAt(nodeId);
    const parts: string[] = [];
    for (const ref of refs) {
      const data = getLoadedState<{ id: string; value: number }>(ref.hash);
      if (data) {
        parts.push(`${ref.id}=${data.value}`);
      }
    }
    return parts.join(', ');
  }

  function renderNode(nodeId: string, depth: number): React.ReactNode {
    const node: WorldNode = nodes[nodeId];
    const children = childrenMap[nodeId] ?? [];
    const isApex = nodeId === apexNodeId;
    const color = worldLineColors[node.worldLineId] ?? '#aaa';
    const summary = getNodeSummary(nodeId);
    const changedLabel = node.changedRefs.map((r) => r.id).join(', ');

    return (
      <div key={nodeId} style={{ marginLeft: depth * 20 }}>
        <button
          onClick={() => scope.moveTo(nodeId)}
          style={{
            ...styles.dagNode,
            borderColor: color,
            backgroundColor: isApex ? color : 'transparent',
            color: isApex ? '#1a1a2e' : color,
            fontWeight: isApex ? 'bold' : 'normal',
          }}
          title={`Node: ${nodeId.slice(0, 8)}...\nWorldLine: ${node.worldLineId.slice(0, 12)}...\nChanged: ${changedLabel}`}
        >
          <span style={styles.dagNodeDot}>●</span>
          <span style={styles.dagNodeId}>{nodeId.slice(0, 6)}</span>
          {summary && (
            <span style={styles.dagNodeSummary}>[{summary}]</span>
          )}
          {isApex && <span style={styles.apexBadge}>APEX</span>}
        </button>
        {children.map((childId) => renderNode(childId, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <div style={styles.countersRow}>
        {counterShells.map((shell) => (
          <CounterPanel
            key={shell.id}
            shell={shell}
            onRemove={() => scope.removeObject('counter', shell.id)}
          />
        ))}
      </div>
      <div style={styles.controlPanel}>
        <button
          onClick={scope.moveBack}
          disabled={!canUndo}
          style={{ ...styles.smallButton, opacity: canUndo ? 1 : 0.4 }}
        >
          Undo
        </button>
        <button
          onClick={scope.moveForward}
          disabled={!canRedo}
          style={{ ...styles.smallButton, opacity: canRedo ? 1 : 0.4 }}
        >
          Redo
        </button>
        <button onClick={handleAddCounter} style={styles.addButton}>
          + Add Counter
        </button>
      </div>
      <div style={styles.dagPanel}>
        <h2 style={styles.sectionTitle}>DAG</h2>
        {rootNodeId === null ? (
          <p style={styles.emptyText}>No nodes yet</p>
        ) : (
          <>
            <div style={styles.legend}>
              {Object.entries(worldLineColors).map(([wlId, color]) => (
                <span key={wlId} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, backgroundColor: color }} />
                  {wlId.slice(0, 10)}
                </span>
              ))}
            </div>
            <div style={styles.dagTree}>{renderNode(rootNodeId, 0)}</div>
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function WorldLineGraphDemoPage() {
  return (
    <DomainRegistryProvider registry={COUNTER_DOMAIN_OBJECTS}>
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>WorldLineGraph Demo</h1>
        <p style={styles.description}>
          Counter を操作すると DAG にノードが追加されます。
          Add Counter でカウンターを増やせます。
          Undo するとカウンターの追加も巻き戻ります。
        </p>
        <CountersContainer />
      </div>
    </DomainRegistryProvider>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    padding: 32,
    fontFamily: 'monospace',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
    maxWidth: 600,
    lineHeight: 1.6,
  },
  countersRow: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  },
  counterPanel: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    minWidth: 180,
    textAlign: 'center' as const,
  },
  counterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  counterId: {
    fontSize: 13,
    color: '#888',
    margin: 0,
    fontWeight: 'normal',
  },
  removeButton: {
    fontSize: 12,
    width: 24,
    height: 24,
    borderRadius: 4,
    border: '1px solid #666',
    backgroundColor: 'transparent',
    color: '#888',
    cursor: 'pointer',
    fontFamily: 'monospace',
    lineHeight: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4fc3f7',
  },
  valueDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#fff',
  },
  buttonRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  button: {
    fontSize: 24,
    width: 48,
    height: 48,
    borderRadius: 8,
    border: '2px solid #4fc3f7',
    backgroundColor: 'transparent',
    color: '#4fc3f7',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controlPanel: {
    display: 'flex',
    gap: 12,
    marginBottom: 24,
  },
  smallButton: {
    fontSize: 13,
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid #666',
    backgroundColor: 'transparent',
    color: '#ccc',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  addButton: {
    fontSize: 13,
    padding: '6px 16px',
    borderRadius: 6,
    border: '1px solid #4fc3f7',
    backgroundColor: 'transparent',
    color: '#4fc3f7',
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  dagPanel: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
  legend: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#aaa',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  dagTree: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  dagNode: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: 'monospace',
    background: 'none',
    transition: 'all 0.15s ease',
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
    padding: '1px 5px',
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginLeft: 4,
  },
};
