import { FC } from 'react';

type CoordinateSystemSettingsProps = {
  layerIndex: number;
  offsetX: number;
  offsetY: number;
  vanishingPointX: number;
  vanishingPointY: number;
  canvasSize: { width: number; height: number };
  onLayerIndexChange: (value: number) => void;
  onOffsetXChange: (value: number) => void;
  onOffsetYChange: (value: number) => void;
  onVanishingPointXChange: (value: number) => void;
  onVanishingPointYChange: (value: number) => void;
};

export const CoordinateSystemSettings: FC<CoordinateSystemSettingsProps> = ({
  layerIndex,
  offsetX,
  offsetY,
  vanishingPointX,
  vanishingPointY,
  canvasSize,
  onLayerIndexChange,
  onOffsetXChange,
  onOffsetYChange,
  onVanishingPointXChange,
  onVanishingPointYChange,
}) => {
  return (
    <div style={{ marginBottom: '15px', borderTop: '1px solid #444', paddingTop: '15px' }}>
      <div style={{ marginBottom: '8px', color: '#888', fontWeight: 'bold' }}>座標変換設定:</div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          レイヤーIndex: {layerIndex} (scale={(1 - layerIndex * 0.1).toFixed(1)})
        </label>
        <input
          type="range"
          min="0"
          max="5"
          step="1"
          value={layerIndex}
          onChange={(e) => onLayerIndexChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          オフセットX: {offsetX}
        </label>
        <input
          type="range"
          min="0"
          max={canvasSize.width}
          value={offsetX}
          onChange={(e) => onOffsetXChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          オフセットY: {offsetY}
        </label>
        <input
          type="range"
          min="0"
          max={canvasSize.height}
          value={offsetY}
          onChange={(e) => onOffsetYChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          消失点X: {vanishingPointX}
        </label>
        <input
          type="range"
          min="0"
          max={canvasSize.width}
          value={vanishingPointX}
          onChange={(e) => onVanishingPointXChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '6px' }}>
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '2px' }}>
          消失点Y: {vanishingPointY}
        </label>
        <input
          type="range"
          min="0"
          max={canvasSize.height}
          value={vanishingPointY}
          onChange={(e) => onVanishingPointYChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};
