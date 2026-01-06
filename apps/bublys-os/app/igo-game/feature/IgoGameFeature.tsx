'use client';

import { FC, useState, useCallback } from "react";
import styled from "styled-components";
import { IgoGame_囲碁ゲーム } from "../domain";
import { IgoBoardView, GameInfoView } from "../ui";

type IgoGameFeatureProps = {
  gameId?: string;
  boardSize?: number;
};

/**
 * 囲碁ゲーム フィーチャーコンポーネント
 *
 * - ドメインモデルとUIを結合
 * - ゲーム状態の管理
 * - ユーザーアクションのハンドリング
 */
export const IgoGameFeature: FC<IgoGameFeatureProps> = ({
  gameId = crypto.randomUUID(),
  boardSize = 19,
}) => {
  const [game, setGame] = useState<IgoGame_囲碁ゲーム>(() =>
    IgoGame_囲碁ゲーム.create(gameId, boardSize)
  );

  const handleIntersectionClick = useCallback((row: number, col: number) => {
    setGame((prevGame) => prevGame.placeStone(row, col));
  }, []);

  const handlePass = useCallback(() => {
    setGame((prevGame) => prevGame.pass());
  }, []);

  const handleResign = useCallback(() => {
    setGame((prevGame) => prevGame.resign());
  }, []);

  const handleNewGame = useCallback(() => {
    setGame(IgoGame_囲碁ゲーム.create(crypto.randomUUID(), boardSize));
  }, [boardSize]);

  return (
    <GameContainer>
      <GameTitle>囲碁バブリ</GameTitle>
      <GameLayout>
        <BoardWrapper>
          <IgoBoardView game={game} onIntersectionClick={handleIntersectionClick} />
        </BoardWrapper>
        <InfoWrapper>
          <GameInfoView
            game={game}
            onPass={handlePass}
            onResign={handleResign}
            onNewGame={handleNewGame}
          />
        </InfoWrapper>
      </GameLayout>
    </GameContainer>
  );
};

// Styled Components

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px;
  height: 100%;
  box-sizing: border-box;
`;

const GameTitle = styled.h2`
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: bold;
  color: #333;
`;

const GameLayout = styled.div`
  display: flex;
  gap: 16px;
  flex: 1;
  min-height: 0;

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;

const BoardWrapper = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
`;

const InfoWrapper = styled.div`
  flex-shrink: 0;
`;
