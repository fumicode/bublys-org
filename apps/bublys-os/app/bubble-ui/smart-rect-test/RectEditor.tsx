import { FC } from 'react';
import { RectItem } from './types';

type RectEditorProps = {
  selectedRect: RectItem | null;
  canvasSize: { width: number; height: number };
  onUpdate: (x: number, y: number, width: number, height: number) => void;
};

export const RectEditor: FC<RectEditorProps> = ({ selectedRect, canvasSize, onUpdate }) => {
  if (!selectedRect) return null;

  const isLocal = selectedRect.rect.coordinateSystem.layerIndex !== 0;
  const coordLabel = isLocal ? 'ローカル座標' : 'グローバル座標';

  return (
    <div style={{ marginBottom: '15px' }}>
      <div style={{ marginBottom: '8px', color: '#888' }}>
        選択中の矩形を編集 ({coordLabel}):
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          X: {Math.round(selectedRect.rect.x)}
        </label>
        <input
          type="range"
          min={-200}
          max={canvasSize.width + 200}
          value={selectedRect.rect.x}
          onChange={(e) => onUpdate(
            Number(e.target.value),
            selectedRect.rect.y,
            selectedRect.rect.width,
            selectedRect.rect.height
          )}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          Y: {Math.round(selectedRect.rect.y)}
        </label>
        <input
          type="range"
          min={-200}
          max={canvasSize.height + 200}
          value={selectedRect.rect.y}
          onChange={(e) => onUpdate(
            selectedRect.rect.x,
            Number(e.target.value),
            selectedRect.rect.width,
            selectedRect.rect.height
          )}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          幅: {Math.round(selectedRect.rect.width)}
        </label>
        <input
          type="range"
          min="10"
          max={canvasSize.width}
          value={selectedRect.rect.width}
          onChange={(e) => onUpdate(
            selectedRect.rect.x,
            selectedRect.rect.y,
            Number(e.target.value),
            selectedRect.rect.height
          )}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          高さ: {Math.round(selectedRect.rect.height)}
        </label>
        <input
          type="range"
          min="10"
          max={canvasSize.height}
          value={selectedRect.rect.height}
          onChange={(e) => onUpdate(
            selectedRect.rect.x,
            selectedRect.rect.y,
            selectedRect.rect.width,
            Number(e.target.value)
          )}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
