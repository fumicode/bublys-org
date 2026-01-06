'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { IgoBoardView, GameInfoView } from '../../igo-game/ui';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';
import { useFocusedObject } from '../WorldLine/domain/FocusedObjectContext';

/**
 * IgoGameとWorldLineの統合層
 */
export function IgoWorldLineIntegration({ gameId }: { gameId: string }) {
  const { setFocusedObjectId } = useFocusedObject();

  return (
    <WorldLineView<IgoGame_囲碁ゲーム>
      renderWorldState={(game: IgoGame_囲碁ゲーム, onGameChange, isPreview) => {
        // プレビューモード（世界線ビュー）では盤だけ表示
        if (isPreview) {
          return <IgoBoardView game={game} />;
        }

        // 通常モード：フルUI
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
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#333',
            }}>
              囲碁バブリ
            </h2>
            <div style={{
              display: 'flex',
              gap: '16px',
              flex: 1,
              minHeight: 0,
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
              }}>
                <IgoBoardView
                  game={game}
                  onIntersectionClick={(row, col) => {
                    const newGame = game.placeStone(row, col);
                    if (newGame !== game) {
                      onGameChange(newGame);
                    }
                  }}
                />
              </div>
              <div style={{ flexShrink: 0 }}>
                <GameInfoView
                  game={game}
                  onPass={() => onGameChange(game.pass())}
                  onResign={() => onGameChange(game.resign())}
                  onNewGame={() => onGameChange(IgoGame_囲碁ゲーム.create(crypto.randomUUID(), 9))}
                />
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}
