'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import {
  serializeIgoGame,
  deserializeIgoGame,
  createInitialIgoGame
} from '../../igo-game/feature/IgoGameManager';
import { IgoGame_囲碁ゲーム } from '../../igo-game/domain';

/**
 * IgoGameとWorldLineを統合するマネージャーコンポーネント
 * - 1つの囲碁ゲームに対して1つの独立した世界線を管理
 */
interface IgoWorldLineManagerProps {
  children: React.ReactNode;
  gameId: string;
  isBubbleMode: boolean;
  onOpenWorldLineView: () => void;
  onCloseWorldLineView: () => void;
}

export function IgoWorldLineManager({
  children,
  gameId,
  isBubbleMode = false,
  onOpenWorldLineView,
  onCloseWorldLineView
}: IgoWorldLineManagerProps) {
  return (
    <WorldLineManager<IgoGame_囲碁ゲーム>
      objectId={gameId}
      serialize={serializeIgoGame}
      deserialize={deserializeIgoGame}
      createInitialWorldState={() => createInitialIgoGame()}
      onOpenWorldLineView={onOpenWorldLineView}
      onCloseWorldLineView={onCloseWorldLineView}
      isBubbleMode={isBubbleMode}
    >
      {children}
    </WorldLineManager>
  );
}
