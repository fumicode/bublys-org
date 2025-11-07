'use client';
import { FC, JSX, useContext, } from "react";
import { Bubble,} from "@bublys-org/bubbles-ui";

import { MobBubble } from "./bubbles/MobBubble";
import { UserGroupDetail } from "./bubbles/UserGroupDetail";
import { UserGroupList } from "./bubbles/UserGroupList";
import { MemoList } from "@/app/memos/MemoList";
import { MemoEditor } from "@/app/memos/[memoId]/MemoEditor";
import { MemoTitle } from "@/app/memos/[memoId]/MemoTitle";
import { selectMemo, updateMemo, useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { BubblesContext } from "../domain/BubblesContext";

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
  return (
    <MemoList onSelectMemo={(id) => {
      const memoUrl = `memos/${id}`;
      openBubble(memoUrl, bubble.id);
    }} />
  );
});

registerBubbleRenderers("memo", (bubble: Bubble) => {
  const memoId = bubble.name.replace("memos/", "");
  
  // Reduxからmemoを取得して、MemoEditorとMemoTitleにpropsとして渡す
  const MemoBubbleContent = () => {
    const memo = useAppSelector(selectMemo(memoId));
    const dispatch = useAppDispatch();

    if (!memo) {
      return null;
    }

    return (
      <div>
        <MemoTitle memo={memo} />
        <MemoEditor 
          memo={memo} 
          onMemoChange={(newMemo) => {
            dispatch(updateMemo({ memo: newMemo.toJson() }));
          }}
        />
      </div>
    );
  };

  return <MemoBubbleContent />;
});

registerBubbleRenderers("normal", (bubble: Bubble) => <MobBubble bubble={bubble} />);