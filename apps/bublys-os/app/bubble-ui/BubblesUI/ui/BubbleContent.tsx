'use client';
import { FC, JSX, useContext } from "react";
import { Bubble } from "@bublys-org/bubbles-ui";

import { MobBubble } from "./bubbles/MobBubble";
import { UserGroupDetail } from "./bubbles/UserGroupDetail";
import { UserGroupList } from "./bubbles/UserGroupList";
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { MemoEditor } from "@/app/world-line/Memo/ui/MemoEditor";
import { MemoTitle } from "@/app/world-line/Memo/ui/MemoTitle";
import { UserCollection } from "@/app/users/feature/UserCollection";
import { UserDetail } from "@/app/users/feature/UserDetail";
import { UserCreateFormView } from "@/app/users/ui/UserCreateFormView";
import { UserDeleteConfirm } from "@/app/users/feature/UserDeleteConfirm";
import { selectApexWorld, updateState, useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { deserializeMemo, serializeMemo } from "@/app/world-line/Memo/feature/MemoManager";
import { WorldLineState } from "@bublys-org/state-management";
import { BubblesContext } from "../domain/BubblesContext";
import { IframeBubble } from "./bubbles/IframeBubble";
import { addUser } from "@bublys-org/state-management";
import { User } from "@/app/users/domain/User";
import { deleteProcessBubble, removeBubble, selectBubblesRelationByOpeneeId } from "@bublys-org/bubbles-ui-state";

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

registerBubbleRenderers("users", (bubble: Bubble) => {
  const { openBubble } = useContext(BubblesContext);
  const buildUserUrl = (id: string) => `users/${id}`;
  const buildUserDeleteUrl = (id: string) => `users/${id}/delete-confirm`;
  const buildUserCreateUrl = () => "users/create";
  const handleUserClick = (_id: string, detailUrl: string) => {
    openBubble(detailUrl, bubble.id);
  };
  const handleCreateClick = (createUrl: string) => {
    openBubble(createUrl, bubble.id);
  };
  const handleUserDelete = (userId: string) => {
    openBubble(buildUserDeleteUrl(userId), bubble.id);
  };
  return (
    <UserCollection
      buildDetailUrl={buildUserUrl}
      buildCreateUrl={buildUserCreateUrl}
      buildDeleteUrl={buildUserDeleteUrl}
      onUserClick={handleUserClick}
      onCreateClick={handleCreateClick}
      onUserDelete={handleUserDelete}
    />
  );
});

registerBubbleRenderers("user", (bubble: Bubble) => {
  const userId = bubble.name.replace("users/", "");
  return <UserDetail userId={userId} />;
});

registerBubbleRenderers("user-create", (bubble: Bubble) => {
  const dispatch = useAppDispatch();
  const { openBubble } = useContext(BubblesContext);
  const relation = useAppSelector((state) =>
    selectBubblesRelationByOpeneeId(state, { openeeId: bubble.id })
  );
  const openerId = relation?.openerId || bubble.id;

  const handleSubmit = ({ name, birthday }: { name: string; birthday: string }) => {
    const newUser = new User(crypto.randomUUID(), name, birthday);
    dispatch(addUser(newUser.toJSON()));
    openBubble(`users/${newUser.id}`, openerId);
    // 作成フォームを閉じる
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <div>
      <h3>ユーザー作成</h3>
      <UserCreateFormView onSubmit={handleSubmit} />
    </div>
  );
});

registerBubbleRenderers("user-delete-confirm", (bubble: Bubble) => {
  const dispatch = useAppDispatch();
  const relation = useAppSelector((state) =>
    selectBubblesRelationByOpeneeId(state, { openeeId: bubble.id })
  );
  const openerId = relation?.openerId || bubble.id;
  const userId = bubble.name.replace("users/", "").replace("/delete-confirm", "");

  const closeSelf = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  const handleDeleted = () => {
    closeSelf();
  };

  const handleCancel = () => {
    closeSelf();
  };

  return (
    <UserDeleteConfirm
      userId={userId}
      onDeleted={handleDeleted}
      onCancel={handleCancel}
    />
  );
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
