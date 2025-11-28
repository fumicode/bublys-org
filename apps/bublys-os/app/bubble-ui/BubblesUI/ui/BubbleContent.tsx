'use client';
import { FC, JSX, useContext } from "react";
import { Bubble } from "@bublys-org/bubbles-ui";

import { MobBubble } from "./bubbles/MobBubble";
import { UserGroupDetail } from "./bubbles/UserGroupDetail";
import { UserGroupList } from "./bubbles/UserGroupList";
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { MemoEditor } from "@/app/world-line/Memo/ui/MemoEditor";
import { MemoTitle } from "@/app/world-line/Memo/ui/MemoTitle";
import { selectApexWorld, updateState, useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { deserializeMemo, serializeMemo } from "@/app/world-line/Memo/feature/MemoManager";
import { WorldLineState } from "@bublys-org/state-management";
import { BubblesContext } from "../domain/BubblesContext";
import { IframeBubble } from "./bubbles/IframeBubble";

const typeToBubbleRenderer: Record<string, (bubble: Bubble) => JSX.Element> = {
};

export function registerBubbleRenderers(typeName: string, renderer: (bubble: Bubble) => JSX.Element) {
  typeToBubbleRenderer[typeName] = renderer;
}



export const BubbleContent: FC<{ bubble: Bubble }> = ({ bubble }) => {
  const BubbleRenderer = typeToBubbleRenderer[bubble.type];
  if (BubbleRenderer) {
    return BubbleRenderer(bubble);
  }

  return <div>Unknown bubble type: {bubble.type}</div>;
};




registerBubbleRenderers("mob", (bubble: Bubble) => <MobBubble bubble={bubble} />);
registerBubbleRenderers("user-groups", (bubble: Bubble) => <UserGroupList containedBubble={bubble} />);
registerBubbleRenderers("user-group", (bubble: Bubble) => {
  const groupId = bubble.name.replace("user-groups/", "");
  return <UserGroupDetail userGroupId={Number(groupId)} />;
});

registerBubbleRenderers("memos", (bubble: Bubble) => {
  const { openBubble } = useContext(BubblesContext);
  const buildMemoUrl = (id: string) => `memos/${id}`;
  const handleMemoClick = (_id: string, detailUrl: string) => {
    openBubble(detailUrl, bubble.id);
  };
  return (
    <MemoCollection buildDetailUrl={buildMemoUrl} onMemoClick={handleMemoClick} />
  );
});

registerBubbleRenderers("memo", (bubble: Bubble) => {
  const memoId = bubble.name.replace("memos/", "");

  // 世界線システムからmemoを取得して、MemoEditorとMemoTitleにpropsとして渡す
  const MemoBubbleContent = () => {
    const apexWorld = useAppSelector(selectApexWorld(memoId));
    const currentWorldLine = useAppSelector((state) => state.worldLine.worldLines[memoId]);
    const dispatch = useAppDispatch();

    if (!apexWorld || !apexWorld.worldState) {
      return <div>メモが見つかりません</div>;
    }

    const memo = deserializeMemo(apexWorld.worldState);

    return (
      <div>
        <MemoTitle memo={memo} />
        <MemoEditor
          memoId={memoId}
          memo={memo}
          onMemoChange={(newMemo) => {
            // 世界線システムの状態を更新
            if (!currentWorldLine) return;

            const newWorldId = crypto.randomUUID();
            const newWorld = {
              id: newWorldId,
              world: {
                worldId: newWorldId,
                parentWorldId: currentWorldLine.apexWorldId,
                worldState: serializeMemo(newMemo),
              },
            };

            const newWorldLine: WorldLineState = {
              worlds: [...currentWorldLine.worlds, newWorld],
              apexWorldId: newWorldId,
              rootWorldId: currentWorldLine.rootWorldId,
            };

            dispatch(updateState({
              objectId: memoId,
              newWorldLine,
              operation: 'updateMemo'
            }));
          }}
        />
      </div>
    );
  };

  return <MemoBubbleContent />;
});

registerBubbleRenderers("normal", (bubble: Bubble) => <MobBubble bubble={bubble} />);

registerBubbleRenderers("iframe", (bubble: Bubble) => {


  const appId = bubble.name.replace("iframes/", "");
  

  return (<IframeBubble appId={appId} />)
});
