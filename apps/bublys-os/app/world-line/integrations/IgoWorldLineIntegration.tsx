'use client';
import { useEffect } from 'react';
import { IgoBoardView, GameInfoView, IgoGameName } from '../../igo-game/ui';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { useIgoWorldLine } from '../../igo-game/feature/useIgoWorldLine';
import { useFocusedObject } from "@bublys-org/bubbles-ui";
import { ObjectView } from '@bublys-org/bubbles-ui';

type IgoWorldLineIntegrationProps = {
  gameId: string;
  /** この対局の世界線バブルの URL（ダブルクリックで開く） */
  worldLineUrl?: string;
};

/**
 * IgoGame と world-line-graph（CAS）の統合層。
 *
 * `useIgoWorldLine(gameId)` で scope を確保し、apex のゲームを盤面に表示する。
 * 着手・パス・投了は `update(transform)` 経由で graph を伸ばす。
 * Cmd/Ctrl+Z でデータ undo（moveBack）、Shift 付きで redo（moveForward）。
 */
export function IgoWorldLineIntegration({ gameId, worldLineUrl }: IgoWorldLineIntegrationProps) {
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
      {/* ★ 隙間は**行が持つ**（`gap`）。名前の入力欄は空いたぶんまで伸びる（flex:1）ので、
          行に隙間が無いと**ボタンにぶつかる**。数はこの画面のほかの隙間と同じ 16 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
        {/* ★ 見出しは**この対局の名前**。前はここに「囲碁バブリ」という固定の字が出ていた
            ── アプリの名前が、対局の題名の場所にあった。名前はユーザーが付けるものなので、
            押せば書ける（付くまでは「無題」と言う）。 */}
        <IgoGameName
          name={apexGame.state.name ?? ''}
          onRename={(name) => update((current) => current.rename(name))}
        />
        {worldLineUrl && (
          /* すでに在るもの（この対局の世界線）を開くので、ボタンではなくオブジェクトとして扱う。
             ダブルクリックで開き、data-url からリンクのリボンも伸びる。 */
          <ObjectView
            url={worldLineUrl}
            openingPosition="bubble-side-bottom"
            draggable={false}
          >
            <span
              title="ダブルクリックで世界線を開く"
              style={{
                padding: '4px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                background: '#fff',
                // 明るい地を敷くので、字の色も自分で決める（継ぐと明るい字が白に乗る）
                color: '#333',
                cursor: 'pointer',
              }}
            >
              🌳 世界線
            </span>
          </ObjectView>
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
