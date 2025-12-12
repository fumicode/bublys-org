import { useContext, useEffect, useMemo, useState } from "react";
import { WorldLineContext } from "../domain/WorldLineContext";
import { WorldInitializeButton } from "./WorldInitialize";
import { World } from "../domain/World";

interface WorldLine3DViewProps<TWorldState> {
    renderWorldState: (worldState: TWorldState, onWorldStateChange: (newWorldState: TWorldState) => void) => React.ReactNode;
    onCloseWorldLineView: () => void;
}

// 3D WorldView（ヒストリー表示）
interface WorldLineView3DProps<TWorldState> {
  worlds: World<TWorldState>[];
  apexWorldId: string | null;
  apexWorld: World<TWorldState> | null;
  onWorldSelect: (worldId: string) => void;
  onSetApex: (worldId: string) => void;
  onRegrow: () => void;
  renderWorldState: (
    worldState: TWorldState,
    onWorldStateChange: (newWorldState: TWorldState) => void
  ) => React.ReactNode;
}

function WorldLineView3D<TWorldState>({
  worlds,
  apexWorldId,
  apexWorld,
  onWorldSelect,
  onSetApex,
  onRegrow,
  renderWorldState,
}: WorldLineView3DProps<TWorldState>) {
  const [focusedWorldId, setFocusedWorldId] = useState<string | null>(apexWorldId);
  const [hoveredWorldId, setHoveredWorldId] = useState<string | null>(null);
  const worldMap = useMemo(() => new Map(worlds.map((w) => [w.worldId, w])), [worlds]);

  useEffect(() => {
    setFocusedWorldId(apexWorldId);
  }, [apexWorldId]);

  useEffect(() => {
    if (!apexWorldId) return;
    setHoveredWorldId(apexWorldId);
    const timer = window.setTimeout(() => setHoveredWorldId(null), 600);
    return () => window.clearTimeout(timer);
  }, [apexWorldId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key === 'z') {
        const parentId = apexWorld?.parentWorldId;
        if (!parentId) return;

        const parent = worldMap.get(parentId);
        if (!parent || parent.apexWorldLineId !== apexWorld?.apexWorldLineId) return;

        event.preventDefault();
        event.stopPropagation(); // WorldLineViewのハンドラに到達しないようにする
        onSetApex(parentId);
        setFocusedWorldId(parentId);
        setHoveredWorldId(parentId);
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        event.stopPropagation(); // WorldLineViewのハンドラに到達しないようにする
        onRegrow();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [apexWorld, onSetApex, onRegrow, worldMap]);

  const vanishingPoint = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.2 };
  const apexPosition = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.7 };

  const worldLineHeads = useMemo(() => {
    const worldsWithChildren = new Set(worlds.filter((w) => w.parentWorldId).map((w) => w.parentWorldId));
    const heads = worlds.filter((w) => !worldsWithChildren.has(w.worldId));
    return new Set(heads.map((h) => h.worldId));
  }, [worlds]);

  const worldLineColors = useMemo(() => {
    const colors = [
      { bg: 'rgba(200, 255, 200, 0.92)', border: 'rgba(100, 200, 100, 0.8)' },
      { bg: 'rgba(255, 200, 230, 0.92)', border: 'rgba(255, 100, 180, 0.8)' },
      { bg: 'rgba(255, 255, 200, 0.92)', border: 'rgba(200, 200, 100, 0.8)' },
      { bg: 'rgba(200, 230, 255, 0.92)', border: 'rgba(100, 180, 255, 0.8)' },
      { bg: 'rgba(255, 220, 200, 0.92)', border: 'rgba(255, 150, 100, 0.8)' },
      { bg: 'rgba(230, 200, 255, 0.92)', border: 'rgba(180, 100, 255, 0.8)' },
    ];

    const colorMap = new Map<string, { bg: string; border: string }>();
    const headsList = Array.from(worldLineHeads);
    headsList.forEach((headId, index) => {
      colorMap.set(headId, colors[index % colors.length]);
    });

    return colorMap;
  }, [worldLineHeads]);

  const worldsWithPosition = useMemo(() => {
    if (!apexWorldId || worlds.length === 0) return [];

    const localMap = new Map(worlds.map((w) => [w.worldId, w]));
    const distances = new Map<string, number>();
    const worldLineMap = new Map<string, string>();

    for (const headId of worldLineHeads) {
      const queue: { id: string; distance: number }[] = [{ id: headId, distance: 0 }];

      while (queue.length > 0) {
        const { id, distance } = queue.shift()!;
        if (!distances.has(id) || distances.get(id)! > distance) {
          distances.set(id, distance);
          worldLineMap.set(id, headId);
        }

        const world = localMap.get(id);
        if (!world) continue;

        if (world.parentWorldId && (!distances.has(world.parentWorldId) || distances.get(world.parentWorldId)! > distance + 1)) {
          queue.push({ id: world.parentWorldId, distance: distance + 1 });
        }
      }
    }

    const headsList = Array.from(worldLineHeads);
    const headPositions = new Map<string, { index: number; total: number }>();
    headsList.forEach((headId, index) => {
      headPositions.set(headId, { index, total: headsList.length });
    });

    return worlds.map((world) => {
      const distance = distances.get(world.worldId) ?? 999;
      const worldLineHeadId = worldLineMap.get(world.worldId);
      const headPos = worldLineHeadId ? headPositions.get(worldLineHeadId) : null;

      const ratio = distance === 0 ? 1 : 1 / (distance + 1);

      let x = vanishingPoint.x + (apexPosition.x - vanishingPoint.x) * ratio;
      const y = vanishingPoint.y + (apexPosition.y - vanishingPoint.y) * ratio;

      if (headPos && headPos.total > 1) {
        const spreadWidth = Math.min(window.innerWidth * 0.4, window.innerWidth);
        const offset = ((headPos.index - (headPos.total - 1) / 2) / headPos.total) * spreadWidth * ratio;
        x += offset;
      }

      const z = distance * -120;
      const baseZIndex = 100 - distance;

      return {
        world,
        distance,
        x,
        y,
        z,
        baseZIndex,
        worldLineHeadId,
        isHead: worldLineHeads.has(world.worldId),
      };
    });
  }, [worlds, apexWorldId, worldLineHeads]);

  const connections = useMemo(() => {
    const lines: Array<{
      from: { x: number; y: number; z: number };
      to: { x: number; y: number; z: number };
      color: string;
    }> = [];

    const posMap = new Map(worldsWithPosition.map((w) => [w.world.worldId, { x: w.x, y: w.y, z: w.z, worldLineHeadId: w.worldLineHeadId }]));

    for (const { world, worldLineHeadId } of worldsWithPosition) {
      if (world.parentWorldId) {
        const childPos = posMap.get(world.worldId);
        const parentPos = posMap.get(world.parentWorldId);

        if (childPos && parentPos) {
          const worldLineColor = worldLineHeadId ? worldLineColors.get(worldLineHeadId) : null;
          const lineColor = worldLineColor?.border || 'rgba(150, 150, 200, 0.4)';

          lines.push({
            from: parentPos,
            to: childPos,
            color: lineColor.replace(/[\d.]+\)$/, '0.5)'),
          });
        }
      }
    }

    return lines;
  }, [worldsWithPosition, worldLineColors]);

  const handleWorldClick = (worldId: string) => {
    setFocusedWorldId(worldId);
  };

  const handleWorldDoubleClick = (worldId: string) => {
    onWorldSelect(worldId);
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) rotateX(20deg) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) rotateX(20deg) scale(1);
          }
        }
      `}</style>

      <div
        style={{
          width: '100%',
          height: '100%',
          perspective: '1500px',
          perspectiveOrigin: '50% 20%',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'rgba(240, 245, 250, 0.3)',
        }}
      >
        <div
          style={{
            transformStyle: 'preserve-3d',
            position: 'absolute',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {connections.map((conn, index) => (
              <line
                key={index}
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
                stroke={conn.color}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            ))}
          </svg>

          {worldsWithPosition.map(({ world, distance, x, y, z, baseZIndex, isHead, worldLineHeadId }) => {
            const isFocused = world.worldId === focusedWorldId;
            const opacity = Math.max(0.3, 1 - distance * 0.15);
            const scale = Math.max(0.3, 1 - distance * 0.15);
            const adjustedZ = isFocused ? z + 50 : z;
            const worldLineColor = worldLineHeadId ? worldLineColors.get(worldLineHeadId) : null;
            const isHovered = hoveredWorldId === world.worldId;

            if (isHead) {
              return (
                <div
                  key={world.worldId}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWorldClick(world.worldId);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleWorldDoubleClick(world.worldId);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: `translate(-50%, -50%) translateZ(${adjustedZ}px) scale(${scale}) rotateX(20deg)`,
                    transformOrigin: 'center center',
                    transformStyle: 'preserve-3d',
                    width: `${window.innerWidth * 0.4}px`,
                    minHeight: '120px',
                    padding: '1.5rem',
                    backgroundColor: isFocused
                      ? 'rgba(255, 255, 255, 0.98)'
                      : worldLineColor?.bg || 'rgba(255, 255, 255, 0.92)',
                    border: isFocused
                      ? '3px solid rgba(0, 123, 255, 0.8)'
                      : `3px solid ${worldLineColor?.border || 'rgba(150, 150, 200, 0.6)'}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    opacity,
                    pointerEvents: 'auto',
                    boxShadow: isFocused
                      ? '0 10px 40px rgba(0, 123, 255, 0.3)'
                      : '0 8px 24px rgba(0, 0, 0, 0.15)',
                    zIndex: isHovered ? 3000 : isFocused ? 1000 : baseZIndex + 50,
                  }}
                >
                  {renderWorldState(world.worldState as TWorldState, () => {})}
                </div>
              );
            }

            const dotColor = worldLineColor?.border || 'rgba(150, 150, 200, 0.7)';
            return (
              <div
                key={world.worldId}
                style={{
                  position: 'absolute',
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) translateZ(${adjustedZ}px)`,
                  transformOrigin: 'center center',
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'auto',
                  zIndex: isHovered ? 3000 : isFocused ? 1000 : baseZIndex,
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWorldClick(world.worldId);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleWorldDoubleClick(world.worldId);
                  }}
                  onMouseEnter={() => setHoveredWorldId(world.worldId)}
                  onMouseLeave={() => setHoveredWorldId(null)}
                  style={{
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: isFocused ? 'rgba(0, 123, 255, 0.9)' : dotColor,
                      border: isFocused ? '2px solid rgba(0, 123, 255, 1)' : `2px solid ${dotColor}`,
                      borderRadius: '50%',
                      opacity,
                      boxShadow: isFocused ? '0 0 10px rgba(0, 123, 255, 0.5)' : 'none',
                    }}
                  />
                </div>

                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) rotateX(20deg)`,
                      width: `${window.innerWidth * 0.4}px`,
                      minHeight: '120px',
                      padding: '1.5rem',
                      backgroundColor: worldLineColor?.bg || 'rgba(255, 255, 255, 0.98)',
                      border: `3px solid ${worldLineColor?.border || 'rgba(150, 150, 200, 0.6)'}`,
                      borderRadius: '16px',
                      boxShadow: '0 12px 48px rgba(0, 0, 0, 0.25)',
                      pointerEvents: 'none',
                      zIndex: 2,
                      animation: 'fadeIn 0.2s ease-out',
                    }}
                  >
                    {renderWorldState(world.worldState as TWorldState, () => {})}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
// 3Dビュー専用のコンポーネント
export function WorldLine3DView<TWorldState>({ 
    renderWorldState,
    onCloseWorldLineView
  }: WorldLine3DViewProps<TWorldState>) {
    const {
      apexWorld,
      apexWorldId,
      setApex,
      regrow,
      getAllWorlds,
      initialize,
      isInitializing,
      isInitialized,
    } = useContext(WorldLineContext);

    useEffect(() => {
        if (!onCloseWorldLineView) return;
        const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onCloseWorldLineView();
            }
        };
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
      }, [onCloseWorldLineView]);

    const handleWorldSelect = (worldId: string) => {
      setApex(worldId);
      onCloseWorldLineView?.();
    };
  
    if (!isInitialized) {
      return (
        <WorldInitializeButton 
          onInitialize={initialize}
          disabled={isInitializing}
        />
      );
    }

    return (
      <div 
        style={{ 
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <WorldLineView3D<TWorldState>
            worlds={getAllWorlds()}
            apexWorldId={apexWorldId}
            apexWorld={apexWorld}
            onWorldSelect={handleWorldSelect}
            onSetApex={setApex}
            onRegrow={regrow}
            renderWorldState={renderWorldState}
          />
        </div>
      </div>
    );
  }

// 3Dビュー本体を直接利用したい場合の公開（互換用）
export { WorldLineView3D };