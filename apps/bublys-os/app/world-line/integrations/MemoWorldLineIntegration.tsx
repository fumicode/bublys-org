'use client';
import { WorldLineView } from '../WorldLine/ui/WorldLineView';
import { MemoEditor } from '../../memos/[memoId]/MemoEditor';
import { MemoTitle } from '../../memos/[memoId]/MemoTitle';
import { Memo, updateMemo, selectMemo, useAppDispatch, useAppSelector } from '@bublys-org/state-management';
import { useContext, useEffect, useRef, useState } from 'react';
import { WorldLineContext } from '../WorldLine/domain/WorldLineContext';

/**
 * MemoとWorldLineの統合層
 * - 世界線システムで編集した内容をReduxのmemoSliceに反映
 */
export function MemoWorldLineIntegration({ memoId }: { memoId: string }) {
  const dispatch = useAppDispatch();
  const context = useContext(WorldLineContext);
  const apexWorld = context?.apexWorld;
  const grow = context?.grow;
  const reduxMemo = useAppSelector(selectMemo(memoId));
  const isModalOpen = context?.isModalOpen ?? false;
  
  // 無限ループを防ぐためのフラグ
  const previousApexMemoRef = useRef<string | null>(null);
  const previousReduxMemoRef = useRef<string | null>(null);
  const isUpdatingFromWorldLineRef = useRef<boolean>(false);
  const isUpdatingFromReduxRef = useRef<boolean>(false);
  const [hoveredMemo, setHoveredMemo] = useState<Memo | null>(null);
  const previousHoveredMemoRef = useRef<string | null>(null);

  // 世界線システムの状態をReduxのmemoSliceに同期（Ctrl+Zなどで世界線を遡ったとき、またはgrowで更新されたとき）
  useEffect(() => {
    if (apexWorld && reduxMemo && !isUpdatingFromReduxRef.current) {
      const apexMemo = apexWorld.worldState as Memo;
      const apexMemoJsonString = JSON.stringify(apexMemo.toJson());
      const reduxMemoJsonString = JSON.stringify(reduxMemo.toJson());

      // 世界線システムの状態とReduxの状態が異なる場合、Reduxを更新
      if (apexMemoJsonString !== reduxMemoJsonString && previousApexMemoRef.current !== apexMemoJsonString) {
        isUpdatingFromWorldLineRef.current = true;
        previousApexMemoRef.current = apexMemoJsonString;
        dispatch(updateMemo({ memo: apexMemo.toJson() }));
        // 次のレンダリングサイクルでフラグをリセット
        setTimeout(() => {
          isUpdatingFromWorldLineRef.current = false;
        }, 0);
      }
    }
  }, [apexWorld, reduxMemo, dispatch]);

  // Reduxの状態を世界線システムに反映
  useEffect(() => {
    if (reduxMemo && apexWorld && grow && !isUpdatingFromWorldLineRef.current) {
      const reduxMemoJsonString = JSON.stringify(reduxMemo.toJson());
      const apexMemoJsonString = JSON.stringify((apexWorld.worldState as Memo).toJson());

      // Reduxの状態と世界線システムの現在の状態が異なる場合、新しい世界を作成
      if (reduxMemoJsonString !== apexMemoJsonString && previousReduxMemoRef.current !== reduxMemoJsonString) {
        isUpdatingFromReduxRef.current = true;
        previousReduxMemoRef.current = reduxMemoJsonString;
        grow(reduxMemo);
        // 次のレンダリングサイクルでフラグをリセット
        setTimeout(() => {
          isUpdatingFromReduxRef.current = false;
        }, 0);
      }
    }
  }, [reduxMemo, apexWorld, grow]);

  // 3Dビューで各世界にホバーしたときに、その世界の状態をReduxに一時的に反映
  useEffect(() => {
    if (isModalOpen && hoveredMemo) {
      const hoveredMemoJsonString = JSON.stringify(hoveredMemo.toJson());
      const reduxMemoJsonString = JSON.stringify(reduxMemo?.toJson() || '{}');
      
      // ホバーされている世界の状態とReduxの状態が異なる場合、Reduxを更新
      if (hoveredMemoJsonString !== reduxMemoJsonString && previousHoveredMemoRef.current !== hoveredMemoJsonString) {
        isUpdatingFromWorldLineRef.current = true;
        dispatch(updateMemo({ memo: hoveredMemo.toJson() }));
        previousHoveredMemoRef.current = hoveredMemoJsonString;
      }
    } else if (!isModalOpen && previousHoveredMemoRef.current) {
      // 3Dビューが閉じられたら、apexWorldの状態に戻す
      setHoveredMemo(null);
      previousHoveredMemoRef.current = null;
      if (apexWorld) {
        const apexMemo = apexWorld.worldState as Memo;
        const apexMemoJsonString = JSON.stringify(apexMemo.toJson());
        const reduxMemoJsonString = JSON.stringify(reduxMemo?.toJson() || '{}');
        if (apexMemoJsonString !== reduxMemoJsonString) {
          isUpdatingFromWorldLineRef.current = true;
          dispatch(updateMemo({ memo: apexMemo.toJson() }));
        }
      }
    }
  }, [hoveredMemo, isModalOpen, reduxMemo, apexWorld, dispatch]);

  // 3Dビューでホバーした世界の状態を追跡するためのref
  const currentRenderedMemoRef = useRef<{ memo: Memo | null; isHovered: boolean }>({ memo: null, isHovered: false });

  // レンダリング後にホバーされた世界の状態を更新（レンダリング中に状態を更新しない）
  useEffect(() => {
    if (currentRenderedMemoRef.current.isHovered && currentRenderedMemoRef.current.memo) {
      const memoJsonString = JSON.stringify(currentRenderedMemoRef.current.memo.toJson());
      if (previousHoveredMemoRef.current !== memoJsonString) {
        setHoveredMemo(currentRenderedMemoRef.current.memo);
        previousHoveredMemoRef.current = memoJsonString;
      }
    }
  });

  return (
    <WorldLineView<Memo>
      renderWorldState={(memo: Memo, onMemoChange) => {
        if (!memo) {
          return null;
        }

        // 3Dビューで各世界にホバーしたときに、その世界の状態を記録
        const isHoveredWorld = isModalOpen && onMemoChange !== grow;
        currentRenderedMemoRef.current = { memo, isHovered: isHoveredWorld };

        const handleMemoChange = (newMemo: Memo) => {
          if (!isHoveredWorld && onMemoChange) {
            // 内容が実際に変更された場合のみ新しい世界を作成
            const memoJsonString = JSON.stringify(memo.toJson());
            const newMemoJsonString = JSON.stringify(newMemo.toJson());
            if (memoJsonString !== newMemoJsonString) {
              onMemoChange(newMemo);
            }
          }
        };

        return (
          <div>
            <MemoTitle memo={memo} />
            <MemoEditor memo={memo} onMemoChange={handleMemoChange} />
          </div>
        );
      }}
    />
  );
}

