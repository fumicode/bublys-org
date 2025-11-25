'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SmartRect,
  Direction,
  CornerPosition,
  Side,
  createLayerCoordinateSystem
} from '@bublys-org/bubbles-ui';
import { RectItem } from './types';
import { getRandomColor, renderCanvas } from './canvas-utils';
import { RectEditor } from './RectEditor';
import { RectList } from './RectList';
import { CoordinateSystemSettings } from './CoordinateSystemSettings';

export default function SmartRectTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rects, setRects] = useState<RectItem[]>([]);
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [nextId, setNextId] = useState(1);

  // 初期矩形のデフォルト値
  const initialRectDefault = {
    x: 200,
    y: 200,
    width: 100,
    height: 100,
  };

  // 座標系の設定
  const [layerIndex, setLayerIndex] = useState(0);
  const [offsetX, setOffsetX] = useState(100);
  const [offsetY, setOffsetY] = useState(100);
  const [vanishingPointX, setVanishingPointX] = useState(300);
  const [vanishingPointY, setVanishingPointY] = useState(300);

  // Canvasのサイズを設定
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setCanvasSize({ width, height });

      // 初期矩形は(0,0)から開始するので設定不要
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // 初期矩形を作成
  useEffect(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return;

    setRects(prevRects => {
      if (prevRects.length === 0) {
        const rect = new SmartRect(
          new DOMRect(
            initialRectDefault.x,
            initialRectDefault.y,
            initialRectDefault.width,
            initialRectDefault.height
          ),
          { width: canvasSize.width, height: canvasSize.height }
        );
        setSelectedRectId('0');
        return [{
          id: '0',
          rect,
          label: '初期矩形',
          color: '#ffaa00',
          showGrid: true, // デフォルトでグリッド表示
        }];
      }
      return prevRects;
    });
  }, [canvasSize, initialRectDefault.x, initialRectDefault.y, initialRectDefault.width, initialRectDefault.height]);


  // 選択中の矩形を取得
  const getSelectedRect = () => {
    return rects.find(r => r.id === selectedRectId) || null;
  };

  // 選択中の矩形を更新
  const updateSelectedRect = (x: number, y: number, width: number, height: number) => {
    if (!selectedRectId) return;

    setRects(prevRects => prevRects.map(item => {
      if (item.id === selectedRectId) {
        const newDomRect = new DOMRect(x, y, width, height);
        const newRect = new SmartRect(
          newDomRect,
          item.rect.parentSize,
          item.rect.coordinateSystem
        );
        return { ...item, rect: newRect };
      }
      return item;
    }));
  };

  // 隣の矩形を作成
  const createNeighborRect = (direction: Direction) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getNeighbor(direction);
    const directionLabel = { top: '上', right: '右', bottom: '下', left: '左' }[direction];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${directionLabel}隣`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 角の矩形を作成
  const createCornerRect = (position: CornerPosition) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getCorner(position);
    const positionLabel = {
      topLeft: '左上',
      topRight: '右上',
      bottomLeft: '左下',
      bottomRight: '右下'
    }[position];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${positionLabel}角`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 側の矩形を作成
  const createSideRect = (side: Side) => {
    const selected = getSelectedRect();
    if (!selected) return;

    const newRect = selected.rect.getSide(side);
    const sideLabel = { top: '上', right: '右', bottom: '下', left: '左' }[side];

    setRects([...rects, {
      id: String(nextId),
      rect: newRect,
      label: `${selected.label}の${sideLabel}側`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 矩形を削除
  const deleteRect = (id: string) => {
    setRects(rects.filter(r => r.id !== id));
    if (selectedRectId === id) {
      setSelectedRectId(rects.length > 1 ? rects[0].id : null);
    }
  };

  // 座標変換: グローバル→ローカル
  const convertToLocal = () => {
    const selected = getSelectedRect();
    if (!selected) return;

    const layerCoordSystem = createLayerCoordinateSystem(
      layerIndex,
      { x: offsetX, y: offsetY },
      { x: vanishingPointX, y: vanishingPointY }
    );

    const localRect = selected.rect.toLocal(layerCoordSystem);

    setRects([...rects, {
      id: String(nextId),
      rect: localRect,
      label: `${selected.label}(ローカル:L${layerIndex})`,
      color: getRandomColor(),
      showGrid: true, // グリッドを表示
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };

  // 座標変換: ローカル→グローバル
  const convertToGlobal = () => {
    const selected = getSelectedRect();
    if (!selected) return;

    const globalRect = selected.rect.toGlobal();

    setRects([...rects, {
      id: String(nextId),
      rect: globalRect,
      label: `${selected.label}(グローバル)`,
      color: getRandomColor(),
    }]);
    setSelectedRectId(String(nextId));
    setNextId(nextId + 1);
  };


  // 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderCanvas(
      ctx,
      rects,
      selectedRectId,
      canvasSize,
      { x: vanishingPointX, y: vanishingPointY },
      { x: offsetX, y: offsetY }
    );
  }, [rects, selectedRectId, canvasSize, vanishingPointX, vanishingPointY, offsetX, offsetY]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      />

      {/* コントロールパネル */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '8px',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          minWidth: '300px',
        }}
      >
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>SmartRect テスト</h2>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '5px', color: '#888' }}>画面サイズ:</div>
          <div>{canvasSize.width} × {canvasSize.height}</div>
        </div>

        {/* 選択中の矩形を編集 */}
        <RectEditor
          selectedRect={getSelectedRect()}
          canvasSize={canvasSize}
          onUpdate={updateSelectedRect}
        />

        {/* 矩形リスト */}
        <RectList
          rects={rects}
          selectedRectId={selectedRectId}
          onSelectRect={setSelectedRectId}
          onToggleGrid={(id) => setRects(rects.map(r => r.id === id ? { ...r, showGrid: !r.showGrid } : r))}
          onDeleteRect={deleteRect}
        />

        {/* 隣の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>隣を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <div></div>
            <button
              onClick={() => createNeighborRect('top')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↑上
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('left')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ←左
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('right')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右→
            </button>
            <div></div>
            <button
              onClick={() => createNeighborRect('bottom')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#00ff88' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
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
          <div style={{ marginBottom: '8px', color: '#888' }}>角を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createCornerRect('topLeft')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↖左上
            </button>
            <button
              onClick={() => createCornerRect('topRight')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右上↗
            </button>
            <button
              onClick={() => createCornerRect('bottomLeft')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ↙左下
            </button>
            <button
              onClick={() => createCornerRect('bottomRight')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#ff6b6b' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右下↘
            </button>
          </div>
        </div>

        {/* 側の矩形を作成 */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>側を作成:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <button
              onClick={() => createSideRect('top')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬆上側
            </button>
            <button
              onClick={() => createSideRect('right')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              右側⮕
            </button>
            <button
              onClick={() => createSideRect('bottom')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬇下側
            </button>
            <button
              onClick={() => createSideRect('left')}
              disabled={!selectedRectId}
              style={{
                padding: '6px',
                background: selectedRectId ? '#4dabf7' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '11px',
              }}
            >
              ⬅左側
            </button>
          </div>
        </div>

        {/* 座標系の設定 */}
        <CoordinateSystemSettings
          layerIndex={layerIndex}
          offsetX={offsetX}
          offsetY={offsetY}
          vanishingPointX={vanishingPointX}
          vanishingPointY={vanishingPointY}
          canvasSize={canvasSize}
          onLayerIndexChange={setLayerIndex}
          onOffsetXChange={setOffsetX}
          onOffsetYChange={setOffsetY}
          onVanishingPointXChange={setVanishingPointX}
          onVanishingPointYChange={setVanishingPointY}
        />

        {/* 座標変換ボタン */}
        <div style={{ marginBottom: '15px' }}>
          <div style={{ marginBottom: '8px', color: '#888' }}>座標変換:</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={convertToLocal}
              disabled={!selectedRectId}
              style={{
                flex: 1,
                padding: '10px',
                background: selectedRectId ? '#ff00ff' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              →ローカル
            </button>
            <button
              onClick={convertToGlobal}
              disabled={!selectedRectId}
              style={{
                flex: 1,
                padding: '10px',
                background: selectedRectId ? '#00ff00' : '#555',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: selectedRectId ? 'pointer' : 'not-allowed',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              →グローバル
            </button>
          </div>
        </div>

        {/* 説明 */}
        <div style={{ marginTop: '20px', fontSize: '11px', color: '#888', lineHeight: 1.6 }}>
          <div>選択した矩形から新しい矩形を作成できます。</div>
          <div>例: 初期矩形 → 右隣 → 左隣 のように連鎖できます。</div>
          <div style={{ marginTop: '8px', color: '#ff00ff' }}>【座標変換】グローバル座標をローカル座標に変換します。</div>
        </div>
      </div>
    </div>
  );
}
