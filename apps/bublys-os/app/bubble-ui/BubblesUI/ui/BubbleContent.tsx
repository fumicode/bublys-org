import { FC, JSX, useContext, } from "react";
import { Bubble,} from "@bublys-org/bubbles-ui";

import { MobBubble } from "./bubbles/MobBubble";
import { UserGroupDetail } from "./bubbles/UserGroupDetail";
import { UserGroupList } from "./bubbles/UserGroupList";
import { MemoList } from "@/app/memos/MemoList";
import { MemoEditor } from "@/app/memos/[memoId]/MemoEditor";
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
  return (
    <MemoList onSelectMemo={(id) => {
      const memoUrl = `memos/${id}`;
      openBubble(memoUrl, bubble.id);
    }} />
  );
});

registerBubbleRenderers("memo", (bubble: Bubble) => {
  const memoId = bubble.name.replace("memos/", "");
  return <MemoEditor memoId={memoId} />;
});

registerBubbleRenderers("normal", (bubble: Bubble) => <MobBubble bubble={bubble} />);

registerBubbleRenderers("iframe", (bubble: Bubble) => {


  const appId = bubble.name.replace("iframes/", "");
  

  return (<IframeBubble appId={appId} />)
});