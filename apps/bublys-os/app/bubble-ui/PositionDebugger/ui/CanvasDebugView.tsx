"use client";

import { FC, useEffect, useRef } from "react";
import { SmartRect, Size2, GLOBAL_COORDINATE_SYSTEM, getScale, CoordinateSystem } from "@bublys-org/bubbles-ui";

export type RectItem = {
  rect: SmartRect;
  color: string;
  label?: string;
  showGrid?: boolean;
};

type CanvasDebugViewProps = {
  rectItems: RectItem[];
  canvasSize: Size2;
  opacity?: number;
  selectedRectIndex?: number | null;
  coordinateSystem: CoordinateSystem;
};

/**
 * 座標系のグリッドを描画する関数（矩形の周辺のみ、消失点を起点に）
 */
const drawCoordinateSystemGrid = (
  ctx: CanvasRenderingContext2D,
  rect: SmartRect,
  color: string
) => {
  const coordinateSystem = rect.coordinateSystem;
  const { offset, vanishingPoint } = coordinateSystem;
  const scale = getScale(coordinateSystem);
  const gridSize = 100; // グリッドの間隔（ローカル座標系）
  const dotRadius = 2;
  const surroundingArea = 300; // 矩形の周辺300px

  // 矩形のグローバル座標での位置を取得
  const globalRect = rect.coordinateSystem === GLOBAL_COORDINATE_SYSTEM
    ? rect
    : rect.toGlobal();
  const minX = globalRect.x - surroundingArea;
  const maxX = globalRect.right + surroundingArea;
  const minY = globalRect.y - surroundingArea;
  const maxY = globalRect.bottom + surroundingArea;

  ctx.fillStyle = color + '40'; // より薄く（ぼやっと）

  // 消失点を起点としたグリッドの範囲を計算
  const localMinX = Math.floor((minX - offset.x - vanishingPoint.x) / scale / gridSize) * gridSize + vanishingPoint.x;
  const localMaxX = Math.ceil((maxX - offset.x - vanishingPoint.x) / scale / gridSize) * gridSize + vanishingPoint.x;
  const localMinY = Math.floor((minY - offset.y - vanishingPoint.y) / scale / gridSize) * gridSize + vanishingPoint.y;
  const localMaxY = Math.ceil((maxY - offset.y - vanishingPoint.y) / scale / gridSize) * gridSize + vanishingPoint.y;

  // グリッド点を描画（消失点を起点に）
  for (let localX = localMinX; localX <= localMaxX; localX += gridSize) {
    for (let localY = localMinY; localY <= localMaxY; localY += gridSize) {
      // ローカル座標からグローバル座標に変換
      const globalX = vanishingPoint.x + (localX - vanishingPoint.x) * scale + offset.x;
      const globalY = vanishingPoint.y + (localY - vanishingPoint.y) * scale + offset.y;

      // 矩形の周辺範囲内の点のみ描画
      if (globalX >= minX && globalX <= maxX && globalY >= minY && globalY <= maxY) {
        ctx.beginPath();
        ctx.arc(globalX, globalY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
};

/**
 * 矩形を描画する関数
 */
const drawRectItem = (
  ctx: CanvasRenderingContext2D,
  item: RectItem
) => {
  const { rect, color, label } = item;

  // ローカル座標系の矩形は、グローバル座標に変換して描画
  const displayRect = rect.coordinateSystem === GLOBAL_COORDINATE_SYSTEM
    ? rect
    : rect.toGlobal();

  // 塗りつぶし
  ctx.fillStyle = color + '40'; // 半透明
  ctx.fillRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);

  // 枠線
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(displayRect.x, displayRect.y, displayRect.width, displayRect.height);

  // 対角線を描画
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]); // 破線スタイル

  // 左上から右下への対角線
  ctx.beginPath();
  ctx.moveTo(displayRect.x, displayRect.y);
  ctx.lineTo(displayRect.right, displayRect.bottom);
  ctx.stroke();

  // 右上から左下への対角線
  ctx.beginPath();
  ctx.moveTo(displayRect.right, displayRect.y);
  ctx.lineTo(displayRect.x, displayRect.bottom);
  ctx.stroke();

  ctx.setLineDash([]); // 破線スタイルをリセット

  // ラベル
  if (label) {
    // テキスト情報の背景
    const padding = 5;
    const lineHeight = 18;
    const lines = rect.coordinateSystem !== GLOBAL_COORDINATE_SYSTEM ? 4 : 3;
    const bgWidth = 140; // 幅を半分に
    const bgHeight = lineHeight * lines + padding * 2;

    // 右上の外側に表示
    const labelX = displayRect.right;
    const labelY = displayRect.y - bgHeight - 5;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
      labelX,
      labelY,
      bgWidth,
      bgHeight
    );

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      labelX,
      labelY,
      bgWidth,
      bgHeight
    );

    // ラベルテキスト
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px monospace'; // フォントサイズを少し小さく
    ctx.fillText(label, labelX + 5, labelY + 17);
    ctx.font = '10px monospace'; // フォントサイズを少し小さく

    // ローカル座標の場合は、元のローカル座標も表示
    if (rect.coordinateSystem !== GLOBAL_COORDINATE_SYSTEM) {
      ctx.fillText(
        `L: (${Math.round(rect.x)}, ${Math.round(rect.y)})`,
        labelX + 5,
        labelY + 35
      );
      ctx.fillText(
        `G: (${Math.round(displayRect.x)}, ${Math.round(displayRect.y)})`,
        labelX + 5,
        labelY + 50
      );
      ctx.fillText(
        `${Math.round(rect.width)}×${Math.round(rect.height)}`,
        labelX + 5,
        labelY + 65
      );
    } else {
      ctx.fillText(
        `(${Math.round(displayRect.x)}, ${Math.round(displayRect.y)})`,
        labelX + 5,
        labelY + 35
      );
      ctx.fillText(
        `${Math.round(displayRect.width)}×${Math.round(displayRect.height)}`,
        labelX + 5,
        labelY + 50
      );
    }
  }
};

// @ts-expect-error - 将来の実装のため保持
const _getColorForIndex = (index: number): string => {
  const colors = ['#ff6b6b', '#4dabf7', '#51cf66', '#ffd43b', '#ff8787', '#94d82d', '#845ef7', '#ff6b9d'];
  return colors[index % colors.length];
};

export const CanvasDebugView: FC<CanvasDebugViewProps> = ({
  rectItems,
  canvasSize,
  opacity = 0.7,
  selectedRectIndex,
  coordinateSystem,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    const canvasWidth = canvasSize.width - coordinateSystem.offset.x;
    const canvasHeight = canvasSize.height - coordinateSystem.offset.y;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 背景（透明）
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // rectItemsのlayerIndexを保持しつつ、offsetを0にリセット（canvas座標系用）
    const canvasRectItems = rectItems.map((item) => {
      // layerIndexは保持、offsetは(0,0)にリセット
      const rectWithZeroOffset = item.rect.withCoordinateSystem({ offset: { x: 0, y: 0 } });

      const canvasRect = new SmartRect(
        new DOMRect(
          rectWithZeroOffset.x,
          rectWithZeroOffset.y,
          rectWithZeroOffset.width,
          rectWithZeroOffset.height
        ),
        { width: canvasWidth, height: canvasHeight },
        rectWithZeroOffset.coordinateSystem
      );

      return {
        ...item,
        rect: canvasRect
      };
    });

    // 選択されたrectを最後に描画するために並び替え
    const sortedItems = [...canvasRectItems];
    if (selectedRectIndex !== null && selectedRectIndex !== undefined && selectedRectIndex < sortedItems.length) {
      const selectedItem = sortedItems.splice(selectedRectIndex, 1)[0];
      if (selectedItem) {
        sortedItems.push(selectedItem);
      }
    }

    // グリッドを描画
    sortedItems.forEach(item => {
      if (item.showGrid) {
        drawCoordinateSystemGrid(ctx, item.rect, item.color);
      }
    });

    // 矩形を描画（選択されたものが最後に描画される）
    sortedItems.forEach(item => {
      drawRectItem(ctx, item);
    });
  }, [rectItems, canvasSize, selectedRectIndex, coordinateSystem]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width - coordinateSystem.offset.x}
      height={canvasSize.height - coordinateSystem.offset.y}
      style={{
        position: 'fixed',
        top: coordinateSystem.offset.y,
        left: coordinateSystem.offset.x,
        width: `calc(100% - ${coordinateSystem.offset.x}px)`,
        height: `calc(100% - ${coordinateSystem.offset.y}px)`,
        pointerEvents: 'none',
        opacity: opacity,
        zIndex: 999,
      }}
    />
  );
};
