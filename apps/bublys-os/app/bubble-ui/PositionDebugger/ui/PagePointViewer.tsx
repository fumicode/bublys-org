"use client";

import { FC, useContext, useState, useMemo } from "react";
import { PositionDebuggerContext } from "../domain/PositionDebuggerContext";
import { useWindowSize } from "../../01_Utils/01_useWindowSize";
import { CanvasDebugView, RectItem } from "./CanvasDebugView";
import { RectList } from "./RectList";
import { Direction, CornerPosition, Side } from "@bublys-org/bubbles-ui";

const getColorForIndex = (index: number): string => {
  const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#ff8787', '#94d82d', '#845ef7', '#ff6b9d'];
  return colors[index % colors.length];
};

//PositionDebuggerからpointsとrectsをもらって表示する
export const PagePointViewer: FC = () => {
  const { points, rects, coordinateSystem, removeRect, addRects, removeAllRects } = useContext(PositionDebuggerContext);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasOpacity, setCanvasOpacity] = useState(0.7);
  const [selectedRectIndex, setSelectedRectIndex] = useState<number | null>(null);
  const [gridSettings, setGridSettings] = useState<boolean[]>([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  const pageSize = useWindowSize();

  // RectsをRectItemsに変換
  const rectItems: RectItem[] = useMemo(() => {
    // gridSettingsの長さが足りない場合は拡張
    if (gridSettings.length < rects.length) {
      setGridSettings([...gridSettings, ...Array(rects.length - gridSettings.length).fill(true)]);
    }

    return rects.map((rect, index) => ({
      rect,
      color: getColorForIndex(index),
      label: `Rect ${index + 1}`,
      showGrid: gridSettings[index] ?? true,
    }));
  }, [rects, gridSettings]);

  const handleToggleGrid = (index: number) => {
    setGridSettings(prev => {
      const newSettings = [...prev];
      newSettings[index] = !newSettings[index];
      return newSettings;
    });
  };

  const handleDeleteRect = (index: number) => {
    removeRect(index);
    // 削除したrectが選択中だった場合は選択解除
    if (selectedRectIndex === index) {
      setSelectedRectIndex(null);
    } else if (selectedRectIndex !== null && selectedRectIndex > index) {
      // 削除したrectより後ろが選択されていた場合はインデックスを調整
      setSelectedRectIndex(selectedRectIndex - 1);
    }
    // グリッド設定も削除
    setGridSettings(prev => prev.filter((_, i) => i !== index));
  };

  // 選択されたrectを取得
  const getSelectedRect = () => {
    if (selectedRectIndex === null) return null;
    return rects[selectedRectIndex] || null;
  };

  // 隣の矩形を作成
  const createNeighborRect = (direction: Direction) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.getNeighbor(direction);
    addRects([newRect]);
    setSelectedRectIndex(rects.length); // 新しく追加されたrectを選択
  };

  // 角の矩形を作成
  const createCornerRect = (position: CornerPosition) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.getCorner(position);
    addRects([newRect]);
    setSelectedRectIndex(rects.length);
  };

  // 側の矩形を作成
  const createSideRect = (side: Side) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.getSide(side);
    addRects([newRect]);
    setSelectedRectIndex(rects.length);
  };

  // 一個下のレイヤーの矩形を作成
  const createLayerBelow = () => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.toLayerBelow();
    addRects([newRect]);
    setSelectedRectIndex(rects.length);
  };

  return (
    <>
      {/* Canvas描画 */}
      {showCanvas && (
        <CanvasDebugView
          rectItems={rectItems}
          canvasSize={pageSize}
          opacity={canvasOpacity}
          selectedRectIndex={selectedRectIndex}
          coordinateSystem={coordinateSystem}
        />
      )}

      {/* 右側のサイドバー */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: isPanelCollapsed ? '10px' : '20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxHeight: 'calc(100vh - 40px)',
        overflowY: 'auto',
        minWidth: isPanelCollapsed ? 'auto' : '320px',
        maxWidth: isPanelCollapsed ? 'auto' : '400px',
        zIndex: 10002,
        pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPanelCollapsed ? '0' : '15px' }}>
          {!isPanelCollapsed && <h3 style={{ margin: '0', fontSize: '16px' }}>Debug Panel</h3>}
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            style={{
              padding: '4px 8px',
              background: '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {isPanelCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {!isPanelCollapsed && (
          <>
            {/* Canvas表示コントロール */}
            <div style={{ marginBottom: '15px' }}>
          <button
            onClick={() => setShowCanvas((prev) => !prev)}
            style={{
              padding: '8px 12px',
              background: showCanvas ? '#4dabf7' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              width: '100%',
              marginBottom: '8px',
            }}
          >
            {showCanvas ? "Hide Canvas" : "Show Canvas"}
          </button>
          <div style={{ marginBottom: '5px', color: '#888', fontSize: '12px' }}>Canvas Opacity:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={canvasOpacity}
              onChange={(e) => setCanvasOpacity(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: '12px', minWidth: '30px' }}>{canvasOpacity.toFixed(1)}</span>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '5px', color: '#888', fontSize: '12px' }}>画面サイズ:</div>
          <div style={{ fontSize: '12px' }}>{pageSize.width} × {pageSize.height}</div>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div>Points: {points.length}</div>
          <div>Rects: {rects.length}</div>
        </div>

        {/* 全削除ボタン */}
        {rects.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <button
              onClick={removeAllRects}
              style={{
                padding: '8px 12px',
                background: '#ff6b6b',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%',
              }}
            >
              すべてのRectを削除
            </button>
          </div>
        )}

        {/* 矩形リスト */}
        <RectList
          rects={rectItems}
          selectedRectIndex={selectedRectIndex}
          onSelectRect={setSelectedRectIndex}
          onToggleGrid={handleToggleGrid}
          onDeleteRect={handleDeleteRect}
        />

        {/* 隣の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>隣を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <div></div>
            <button
              onClick={() => createNeighborRect('top')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↑上
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('left')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ←左
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('right')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右→
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('bottom')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↓下
            </button>
            <div></div>
          </div>
        </div>

        {/* 角の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>角を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createCornerRect('topLeft')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↖左上
            </button>
            <button
              onClick={() => createCornerRect('topRight')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右上↗
            </button>
            <button
              onClick={() => createCornerRect('bottomLeft')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↙左下
            </button>
            <button
              onClick={() => createCornerRect('bottomRight')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右下↘
            </button>
          </div>
        </div>

        {/* 側の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>側を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createSideRect('top')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬆上側
            </button>
            <button
              onClick={() => createSideRect('right')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右側⮕
            </button>
            <button
              onClick={() => createSideRect('bottom')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬇下側
            </button>
            <button
              onClick={() => createSideRect('left')}
              disabled={selectedRectIndex === null}
              style={{
                padding: '6px',
                background: selectedRectIndex !== null ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬅左側
            </button>
          </div>
        </div>

        {/* レイヤーを作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888', fontSize: '12px' }}>レイヤー:</div>
          <button
            onClick={createLayerBelow}
            disabled={selectedRectIndex === null}
            style={{
              padding: '8px',
              background: selectedRectIndex !== null ? '#845ef7' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedRectIndex !== null ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              width: '100%',
            }}
          >
            ⬇下のレイヤーに生成
          </button>
        </div>
          </>
        )}
      </div>
    </>
  );
};