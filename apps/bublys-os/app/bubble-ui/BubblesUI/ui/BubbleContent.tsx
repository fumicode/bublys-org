import { FC, JSX, } from "react";
import { Bubble,} from "@bublys-org/bubbles-ui";

import { MobBubble } from "./bubbles/MobBubble";
import { UserGroupDetail } from "./bubbles/UserGroupDetail";
import { UserGroupList } from "./bubbles/UserGroupList";

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
registerBubbleRenderers("user-groups", (bubble: Bubble) => <UserGroupList />);
registerBubbleRenderers("user-group", (bubble: Bubble) => {
  const groupId = bubble.name.replace("user-groups/", "");
  return <UserGroupDetail userGroupId={Number(groupId)} />;
});
registerBubbleRenderers("normal", (bubble: Bubble) => <MobBubble bubble={bubble} />);