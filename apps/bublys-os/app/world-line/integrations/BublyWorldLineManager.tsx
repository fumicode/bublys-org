'use client';
import { WorldLineManager } from '../WorldLine/feature/WorldLineManager';
import { BublyWorld } from './BublyWorld';

/**
 * BublyWorldとWorldLineを統合するマネージャーコンポーネント
 * - 1つのWorldLineで複数のバブリ（Counter、Timer、など）を管理
 */
interface BublyWorldLineManagerProps {
  children: React.ReactNode;
  worldId: string;
}

/**
 * BublyWorldのシリアライズ
 */
function serializeBublyWorld(world: BublyWorld): any {
  return world.toJson();
}

/**
 * BublyWorldのデシリアライズ
 */
function deserializeBublyWorld(data: any): BublyWorld {
  return BublyWorld.fromJson(data);
}

/**
 * BublyWorldの初期状態を作成（空のWorld）
 */
function createInitialBublyWorld(): BublyWorld {
  return new BublyWorld(new Map());
}

export function BublyWorldLineManager({ 
  children, 
  worldId,
}: BublyWorldLineManagerProps) {
  return (
    <WorldLineManager<BublyWorld>
      objectId={worldId}
      serialize={serializeBublyWorld}
      deserialize={deserializeBublyWorld}
      createInitialWorldState={createInitialBublyWorld}
    >
      {children}
    </WorldLineManager>
  );
}

