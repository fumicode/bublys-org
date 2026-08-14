'use client';
import { useEffect } from 'react';
import { IgoBoardView, GameInfoView } from '../../igo-game/ui';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { useIgoWorldLine } from '../../igo-game/feature/useIgoWorldLine';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

type IgoWorldLineIntegrationProps = {
  gameId: string;
  /** 世界線ビュー（履歴バブル）を開く */
  onOpenWorldLineView?: () => void;
};

/**
 * IgoGame と world-line-graph（CAS）の統合層。
 *
 * `useIgoWorldLine(gameId)` で scope を確保し、apex のゲームを盤面に表示する。
 * 着手・パス・投了は `update(transform)` 経由で graph を伸ばす。
 * Cmd/Ctrl+Z でデータ undo（moveBack）、Shift 付きで redo（moveForward）。
 */
export function IgoWorldLineIntegration({ gameId, onOpenWorldLineView }: IgoWorldLineIntegrationProps) {
  const { focusedObjectId, setFocusedObjectId } = useFocusedObject();
  const { apexGame, update, moveBack, moveForward } = useIgoWorldLine(gameId);

  // Cmd/Ctrl+Z = データ undo（親ノードへ moveBack）、Shift 付き = redo。
  // フォーカス中のゲームにだけ効かせる。apex が動くので世界線ビューも追従する。
  useEffect(() => {
    if (focusedObjectId !== gameId) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) moveForward();
      else moveBack();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [focusedObjectId, gameId, moveBack, moveForward]);

  if (!apexGame) {
    return <div style={{ opacity: 0.7 }}>ゲームを初期化しています…</div>;
  }

  return (
    <div
      onFocus={() => setFocusedObjectId(gameId)}
      onMouseDown={() => setFocusedObjectId(gameId)}
      tabIndex={-1}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        height: '100%',
        boxSizing: 'border-box',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
          囲碁バブリ
        </h2>
        {onOpenWorldLineView && (
          <button
            onClick={onOpenWorldLineView}
            style={{
              padding: '4px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            🌳 世界線
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
          <IgoBoardView
            game={apexGame}
            onIntersectionClick={(row, col) => {
              update((current) => current.placeStone(row, col));
            }}
          />
        </div>
        <div style={{ flexShrink: 0 }}>
          <GameInfoView
            game={apexGame}
            onPass={() => update((current) => current.pass())}
            onResign={() => update((current) => current.resign())}
            onNewGame={() => update(() => IgoGame_囲碁ゲーム.create(gameId, apexGame.boardSize))}
          />
        </div>
      </div>
    </div>
  );
}
