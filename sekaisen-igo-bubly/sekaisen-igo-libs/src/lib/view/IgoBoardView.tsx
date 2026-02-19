'use client';

import { FC, HTMLAttributes, ButtonHTMLAttributes } from "react";
import styled from "styled-components";
import { IgoGame_囲碁ゲーム, StoneColor_石の色 } from "@bublys-org/sekaisen-igo-model";

type DivProps = HTMLAttributes<HTMLDivElement>;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

type IgoBoardViewProps = {
  game: IgoGame_囲碁ゲーム;
  onIntersectionClick?: (row: number, col: number) => void;
};

/**
 * 囲碁盤面 UIコンポーネント
 * - ドメインモデルを受け取って表示
 * - クリックイベントを親に通知
 */
export const IgoBoardView: FC<IgoBoardViewProps> = ({ game, onIntersectionClick }) => {
  const size = game.boardSize;

  return (
    <BoardContainer $size={size}>
      {/* 格子線 */}
      <GridLines $size={size}>
        {Array.from({ length: size }).map((_, row) => (
          <div key={`h-${row}`} className="horizontal-line" style={{ top: `${(row / (size - 1)) * 100}%` }} />
        ))}
        {Array.from({ length: size }).map((_, col) => (
          <div key={`v-${col}`} className="vertical-line" style={{ left: `${(col / (size - 1)) * 100}%` }} />
        ))}
        {/* 星の位置 */}
        {size === 9 && (
          <>
            <StarPoint $row={2} $col={2} $size={size} />
            <StarPoint $row={2} $col={6} $size={size} />
            <StarPoint $row={4} $col={4} $size={size} />
            <StarPoint $row={6} $col={2} $size={size} />
            <StarPoint $row={6} $col={6} $size={size} />
          </>
        )}
        {size === 19 && (
          <>
            {/* 四隅の星 */}
            <StarPoint $row={3} $col={3} $size={size} />
            <StarPoint $row={3} $col={15} $size={size} />
            <StarPoint $row={15} $col={3} $size={size} />
            <StarPoint $row={15} $col={15} $size={size} />
            {/* 辺の星 */}
            <StarPoint $row={3} $col={9} $size={size} />
            <StarPoint $row={9} $col={3} $size={size} />
            <StarPoint $row={9} $col={15} $size={size} />
            <StarPoint $row={15} $col={9} $size={size} />
            {/* 天元 */}
            <StarPoint $row={9} $col={9} $size={size} />
          </>
        )}
      </GridLines>

      {/* 交点とクリック領域 */}
      <IntersectionsLayer>
        {Array.from({ length: size }).map((_, row) =>
          Array.from({ length: size }).map((_, col) => {
            const stone = game.getStone(row, col);
            const isEmpty = stone === null;
            const isLastMove = game.state.moveHistory.length > 0 &&
              game.state.moveHistory[game.state.moveHistory.length - 1].intersection.row === row &&
              game.state.moveHistory[game.state.moveHistory.length - 1].intersection.col === col;

            return (
              <IntersectionCell
                key={`${row}-${col}`}
                $row={row}
                $col={col}
                $size={size}
                $canPlace={isEmpty && game.state.status === 'playing'}
                $currentTurn={game.currentTurn}
                onClick={() => isEmpty && onIntersectionClick?.(row, col)}
              >
                {stone && (
                  <Stone $color={stone} $isLastMove={isLastMove}>
                    {isLastMove && <LastMoveMarker $color={stone} />}
                  </Stone>
                )}
              </IntersectionCell>
            );
          })
        )}
      </IntersectionsLayer>
    </BoardContainer>
  );
};

type GameInfoViewProps = {
  game: IgoGame_囲碁ゲーム;
  onPass?: () => void;
  onResign?: () => void;
  onNewGame?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

/**
 * ゲーム情報 UIコンポーネント
 */
export const GameInfoView: FC<GameInfoViewProps> = ({
  game,
  onPass,
  onResign,
  onNewGame,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <GameInfoContainer>
      <TurnIndicator>
        <TurnLabel>手番</TurnLabel>
        <TurnStone $color={game.currentTurn} />
        <TurnText>{game.currentTurnLabel}番</TurnText>
      </TurnIndicator>

      <ScoreSection>
        <ScoreItem>
          <ScoreStone $color="black" />
          <span>取られた: {game.state.capturedBlack}</span>
        </ScoreItem>
        <ScoreItem>
          <ScoreStone $color="white" />
          <span>取られた: {game.state.capturedWhite}</span>
        </ScoreItem>
      </ScoreSection>

      <MoveCount>手数: {game.state.moveHistory.length}</MoveCount>

      {game.state.status === 'finished' ? (
        <StatusMessage $winner={game.state.winner}>
          {game.state.winner ? (
            <>
              <WinnerStone $color={game.state.winner} />
              <span>{game.state.winner === 'black' ? '黒' : '白'}の勝ち</span>
              {game.state.endReason === 'resign' && <span>（投了）</span>}
            </>
          ) : (
            <span>対局終了</span>
          )}
        </StatusMessage>
      ) : (
        <ButtonGroup>
          <ActionButton onClick={onPass}>パス</ActionButton>
          <ActionButton onClick={onResign} $variant="danger">投了</ActionButton>
        </ButtonGroup>
      )}

      {(onUndo || onRedo) && (
        <ButtonGroup>
          <ActionButton onClick={onUndo} disabled={!canUndo}>
            待った
          </ActionButton>
          <ActionButton onClick={onRedo} disabled={!canRedo}>
            やり直し
          </ActionButton>
        </ButtonGroup>
      )}

      {onNewGame && (
        <NewGameButton onClick={onNewGame}>新しい対局</NewGameButton>
      )}
    </GameInfoContainer>
  );
};

// Styled Components

const BoardContainer = styled.div<{ $size: number } & DivProps>`
  position: relative;
  width: ${({ $size }) => $size === 19 ? '570px' : '360px'};
  height: ${({ $size }) => $size === 19 ? '570px' : '360px'};
  background-color: #dcb35c;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
`;

const GridLines = styled.div<{ $size: number } & DivProps>`
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;

  .horizontal-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background-color: #000;
  }

  .vertical-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background-color: #000;
  }
`;

const StarPoint = styled.div<{ $row: number; $col: number; $size: number }>`
  position: absolute;
  width: ${({ $size }) => $size === 19 ? '6px' : '8px'};
  height: ${({ $size }) => $size === 19 ? '6px' : '8px'};
  background-color: #000;
  border-radius: 50%;
  top: ${({ $row, $size }) => ($row / ($size - 1)) * 100}%;
  left: ${({ $col, $size }) => ($col / ($size - 1)) * 100}%;
  transform: translate(-50%, -50%);
`;

const IntersectionsLayer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  bottom: 20px;
`;

const IntersectionCell = styled.div<{
  $row: number;
  $col: number;
  $size: number;
  $canPlace: boolean;
  $currentTurn: 'black' | 'white';
} & DivProps>`
  position: absolute;
  width: ${({ $size }) => 100 / $size}%;
  height: ${({ $size }) => 100 / $size}%;
  top: ${({ $row, $size }) => ($row / ($size - 1)) * 100 - 100 / $size / 2}%;
  left: ${({ $col, $size }) => ($col / ($size - 1)) * 100 - 100 / $size / 2}%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${({ $canPlace }) => ($canPlace ? 'pointer' : 'default')};

  &:hover {
    ${({ $canPlace, $currentTurn }) =>
      $canPlace &&
      `
      &::after {
        content: '';
        position: absolute;
        width: 80%;
        height: 80%;
        border-radius: 50%;
        background-color: ${$currentTurn === 'black' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.5)'};
        border: ${$currentTurn === 'white' ? '1px solid rgba(0, 0, 0, 0.3)' : 'none'};
      }
    `}
  }
`;

const Stone = styled.div<{ $color: StoneColor_石の色; $isLastMove: boolean } & DivProps>`
  position: relative;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: ${({ $color }) =>
    $color === 'black'
      ? 'radial-gradient(circle at 30% 30%, #666, #000)'
      : 'radial-gradient(circle at 30% 30%, #fff, #ccc)'};
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
  border: ${({ $color }) => ($color === 'white' ? '1px solid #999' : 'none')};
  z-index: 1;
`;

const LastMoveMarker = styled.div<{ $color: StoneColor_石の色 }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background-color: ${({ $color }) => ($color === 'black' ? '#fff' : '#000')};
  opacity: 0.8;
`;

const GameInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: #f5f5f5;
  border-radius: 8px;
  min-width: 180px;
`;

const TurnIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TurnLabel = styled.span`
  font-size: 14px;
  color: #666;
`;

const TurnStone = styled.div<{ $color: 'black' | 'white' }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $color }) =>
    $color === 'black'
      ? 'radial-gradient(circle at 30% 30%, #666, #000)'
      : 'radial-gradient(circle at 30% 30%, #fff, #ccc)'};
  border: ${({ $color }) => ($color === 'white' ? '1px solid #999' : 'none')};
  box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
`;

const TurnText = styled.span`
  font-size: 16px;
  font-weight: bold;
`;

const ScoreSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ScoreItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;

const ScoreStone = styled.div<{ $color: 'black' | 'white' }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => ($color === 'black' ? '#000' : '#fff')};
  border: ${({ $color }) => ($color === 'white' ? '1px solid #999' : 'none')};
`;

const MoveCount = styled.div`
  font-size: 14px;
  color: #666;
`;

const StatusMessage = styled.div<{ $winner: 'black' | 'white' | null } & DivProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: ${({ $winner }) => $winner === 'black' ? '#333' : $winner === 'white' ? '#666' : '#c62828'};
  text-align: center;
  padding: 12px;
  background-color: ${({ $winner }) => $winner === 'black' ? '#e0e0e0' : $winner === 'white' ? '#fff8e1' : '#ffebee'};
  border-radius: 4px;
  border: 2px solid ${({ $winner }) => $winner === 'black' ? '#333' : $winner === 'white' ? '#ffc107' : '#c62828'};
`;

const WinnerStone = styled.div<{ $color: 'black' | 'white' }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color }) =>
    $color === 'black'
      ? 'radial-gradient(circle at 30% 30%, #666, #000)'
      : 'radial-gradient(circle at 30% 30%, #fff, #ccc)'};
  border: ${({ $color }) => ($color === 'white' ? '1px solid #999' : 'none')};
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button<{ $variant?: 'danger' } & ButtonProps>`
  flex: 1;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;

  background-color: ${({ $variant }) => ($variant === 'danger' ? '#ffcdd2' : '#e0e0e0')};
  color: ${({ $variant }) => ($variant === 'danger' ? '#c62828' : '#333')};

  &:hover:not(:disabled) {
    background-color: ${({ $variant }) => ($variant === 'danger' ? '#ef9a9a' : '#bdbdbd')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

const NewGameButton = styled.button<ButtonProps>`
  padding: 10px 16px;
  font-size: 14px;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #4caf50;
  color: white;
  transition: background-color 0.2s;

  &:hover {
    background-color: #388e3c;
  }
`;
