"use client";
import { BubbleContentRenderer } from "../ui/BubbleContentRenderer";
import { Bubble, registerBubbleTypeResolver } from "@bublys-org/bubbles-ui";
import { useContext } from "react";

export type BubbleRoute = {
  pattern: RegExp;
  type: string;
  Component: BubbleContentRenderer;
};

export const matchBubbleRoute = (name: string): BubbleRoute | undefined =>
  bubbleRoutes.find((route) => route.pattern.test(name));

// ルーティング定義
import { MobBubble } from "../ui/bubbles/MobBubble";
import { UserGroupList } from "@/app/users/feature/UserGroupList";
import { UserGroupDetail } from "@/app/users/feature/UserGroupDetail";
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { MemoEditor } from "@/app/world-line/Memo/ui/MemoEditor";
import { MemoTitle } from "@/app/world-line/Memo/ui/MemoTitle";
import { UserCollection } from "@/app/users/feature/UserCollection";
import { UserDetail } from "@/app/users/feature/UserDetail";
import { UserCreateFormView } from "@/app/users/ui/UserCreateFormView";
import { IframeBubble } from "../ui/bubbles/IframeBubble";
import { UserDeleteConfirm } from "@/app/users/feature/UserDeleteConfirm";
import { BubblesContext } from "./BubblesContext";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { addUser } from "@bublys-org/state-management";
import { User } from "@/app/users/domain/User.domain";
import { selectBubblesRelationByOpeneeId, deleteProcessBubble, removeBubble } from "@bublys-org/bubbles-ui-state";
import { Memo } from "@/app/world-line/Memo/domain/Memo";
import { MemoWorldLineManager } from "@/app/world-line/integrations/MemoWorldLineManager";
import { MemoWorldLineIntegration } from "@/app/world-line/integrations/MemoWorldLineIntegration";
import { WorldLineView } from "@/app/world-line/WorldLine/ui/WorldLineView";

// 各バブルのコンポーネント
const UsersBubble: BubbleContentRenderer = ({ bubble }) => {
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
};

const UserBubble: BubbleContentRenderer = ({ bubble }) => {
  const userId = bubble.name.replace("users/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenGroup = (groupId: string, url: string) => {
    openBubble(url, bubble.id);
  };
  return <UserDetail userId={userId} onOpenGroup={handleOpenGroup} />;
};

const UserCreateBubble: BubbleContentRenderer = ({ bubble }) => {
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
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <div>
      <h3>ユーザー作成</h3>
      <UserCreateFormView onSubmit={handleSubmit} />
    </div>
  );
};

const UserDeleteConfirmBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
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
};

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.name.replace("memos/", "");

  return (
    <MemoWorldLineManager memoId={memoId}>
      <MemoWorldLineIntegration memoId={memoId} />
    </MemoWorldLineManager>
  );
};

// const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
//   const memoId = bubble.name.replace("memos/", "");
//   const { openBubble } = useContext(BubblesContext);

//   const MemoBubbleContent = () => {
//     const apexWorld = useAppSelector(selectApexWorld(memoId));
//     const currentWorldLine = useAppSelector((state) => state.worldLine.worldLines[memoId]);
//     const dispatch = useAppDispatch();

//     const handleMemoChange = (newMemo: Memo) => {
//       if (!currentWorldLine) return;

//       const newWorldId = crypto.randomUUID();
//       const newWorld = {
//         id: newWorldId,
//         world: {
//           worldId: newWorldId,
//           parentWorldId: currentWorldLine.apexWorldId,
//           worldState: serializeMemo(newMemo),
//         },
//       };

//       const newWorldLine: WorldLineState = {
//         worlds: [...currentWorldLine.worlds, newWorld],
//         apexWorldId: newWorldId,
//         rootWorldId: currentWorldLine.rootWorldId,
//       };

//       dispatch(updateState({
//         objectId: memoId,
//         newWorldLine,
//         operation: 'updateMemo'
//       }));
//     };

//     if (!apexWorld || !apexWorld.worldState) {
//       return <div>メモが見つかりません</div>;
//     }

//     const memo = deserializeMemo(apexWorld.worldState);

//     return (
//       <div>
//         <MemoTitle
//           memo={memo}
//           onSetAuthor={(userId) => handleMemoChange(memo.setAuthor(userId))}
//           onOpenAuthor={(userId, url) => openBubble(url, bubble.id)}
//         />
//         <MemoEditor
//           memoId={memoId}
//           memo={memo}
//           onMemoChange={handleMemoChange}
//         />
//       </div>
//     );
//   };

//   return <MemoBubbleContent />;
// };

const MemosBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildMemoUrl = (id: string) => `memos/${id}`;
  const handleMemoClick = (_id: string, detailUrl: string) => {
    openBubble(detailUrl, bubble.id);
  };
  return (
    <MemoCollection buildDetailUrl={buildMemoUrl} onMemoClick={handleMemoClick} />
  );
};

const UserGroupBubble: BubbleContentRenderer = ({ bubble }) => {
  const groupId = bubble.name.replace("user-groups/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenUser = (_userId: string, url: string) => {
    openBubble(url, bubble.id);
  };
  return <UserGroupDetail groupId={groupId} onOpenUser={handleOpenUser} />;
};

const WorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  return <WorldLineView<Bubble>
    renderWorldState={(_worldState: Bubble, _onWorldStateChange: (worldState: Bubble) => void) => <div>World Line</div>}
  />
};

const routes: BubbleRoute[] = [
  { pattern: /^mob$/, type: "mob", Component: ({ bubble }) => <MobBubble bubble={bubble} /> },
  {
    pattern: /^user-groups$/,
    type: "user-groups",
    Component: ({ bubble }) => {
      const { openBubble } = useContext(BubblesContext);
      const buildGroupUrl = (id: string) => `user-groups/${id}`;
      const handleSelect = (_id: string, url: string) => {
        openBubble(url, bubble.id);
      };
      return (
        <UserGroupList buildDetailUrl={buildGroupUrl} onSelect={handleSelect} />
      );
    },
  },
  { pattern: /^user-groups\/.+$/, type: "user-group", Component: UserGroupBubble },
  { pattern: /^users$/, type: "users", Component: UsersBubble },
  { pattern: /^users\/create$/, type: "user-create", Component: UserCreateBubble },
  { pattern: /^users\/[^/]+\/delete-confirm$/, type: "user-delete-confirm", Component: UserDeleteConfirmBubble },
  { pattern: /^users\/[^/]+$/, type: "user", Component: UserBubble },
  { pattern: /^memos$/, type: "memos", Component: MemosBubble },
  { pattern: /^memos\/.+$/, type: "memo", Component: MemoBubble },
  { pattern: /^world-lines\/.+$/, type: "world-lines", Component: WorldLinesBubble },
  { pattern: /^iframes\/.+$/, type: "iframe", Component: ({ bubble }) => {
    const appId = bubble.name.replace("iframes/", "");
    return (<IframeBubble appId={appId} />);
  } },
];

export const bubbleRoutes = routes;
registerBubbleTypeResolver((name: string) => matchBubbleRoute(name)?.type);
