"use client";
import { BubbleContentRenderer } from "../ui/BubbleContentRenderer";
import { registerBubbleTypeResolver } from "@bublys-org/bubbles-ui";
import { useContext } from "react";

export type BubbleRoute = {
  pattern: RegExp;
  type: string;
  Component: BubbleContentRenderer;
};

export const matchBubbleRoute = (url: string): BubbleRoute | undefined =>
  bubbleRoutes.find((route) => route.pattern.test(url));

// ルーティング定義
import { MobBubble } from "../ui/bubbles/MobBubble";
import { UserGroupList } from "@/app/users/feature/UserGroupList";
import { UserGroupDetail } from "@/app/users/feature/UserGroupDetail";
import { MemoCollection } from "@/app/world-line/Memo/ui/MemoCollection";
import { UserCollection } from "@/app/users/feature/UserCollection";
import { UserDetail } from "@/app/users/feature/UserDetail";
import { UserCreateFormView } from "@/app/users/ui/UserCreateFormView";
import { IframeBubble } from "../ui/bubbles/IframeBubble";
import { UserDeleteConfirm } from "@/app/users/feature/UserDeleteConfirm";
import { MemoDeleteConfirm } from "@/app/world-line/Memo/feature/MemoDeleteConfirm";
import { BubblesContext } from "./BubblesContext";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { addUser } from "@bublys-org/state-management";
import { User } from "@/app/users/domain/User.domain";
import { selectBubblesRelationByOpeneeId, deleteProcessBubble, removeBubble } from "@bublys-org/bubbles-ui-state";
import { MemoWorldLineManager } from "@/app/world-line/integrations/MemoWorldLineManager";
import { MemoWorldLineIntegration } from "@/app/world-line/integrations/MemoWorldLineIntegration";
import { StaffCollection } from "@/app/gakkai-shift/feature/StaffCollection";
import { StaffDetail } from "@/app/gakkai-shift/feature/StaffDetail";
import { StaffAvailability } from "@/app/gakkai-shift/feature/StaffAvailability";

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
  const userId = bubble.url.replace("users/", "");
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
  const userId = bubble.url.replace("users/", "").replace("/delete-confirm", "");

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


const UserGroupBubble: BubbleContentRenderer = ({ bubble }) => {
  const groupId = bubble.url.replace("user-groups/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenUser = (_userId: string, url: string) => {
    openBubble(url, bubble.id);
  };
  return <UserGroupDetail groupId={groupId} onOpenUser={handleOpenUser} />;
};

// const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
//   const memoId = bubble.url.replace("memos/", "");
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
  const buildMemoDeleteUrl = (id: string) => `memos/${id}/delete-confirm`;
  const handleMemoClick = (_id: string, detailUrl: string) => {
    openBubble(detailUrl, bubble.id);
  };
  const handleMemoDelete = (memoId: string) => {
    openBubble(buildMemoDeleteUrl(memoId), bubble.id);
  };
  return (
    <MemoCollection
      buildDetailUrl={buildMemoUrl}
      buildDeleteUrl={buildMemoDeleteUrl}
      onMemoClick={handleMemoClick}
      onMemoDelete={handleMemoDelete}
    />
  );
};

const MemoBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenWorldLineView = () => {
    openBubble(`memos/${memoId}/history`, bubble.id);
  };

  return (
    <MemoWorldLineManager 
      memoId={memoId} 
      isBubbleMode={false} 
      onOpenWorldLineView={handleOpenWorldLineView} 
      onCloseWorldLineView={() => {}}
    >
      <MemoWorldLineIntegration memoId={memoId} />
    </MemoWorldLineManager>
  );
};


const MemoDeleteConfirmBubble: BubbleContentRenderer = ({ bubble }) => {
  const dispatch = useAppDispatch();
  const memoId = bubble.url.replace("memos/", "").replace("/delete-confirm", "");

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
    <MemoDeleteConfirm
      memoId={memoId}
      onDeleted={handleDeleted}
      onCancel={handleCancel}
    />
  );
};

const MemoWorldLinesBubble: BubbleContentRenderer = ({ bubble }) => {
  const memoId = bubble.url.replace("memos/", "").replace("/history", "");
  const dispatch = useAppDispatch();
  const handleCloseWorldLineView = () => {
    dispatch(deleteProcessBubble(bubble.id));
    dispatch(removeBubble(bubble.id));
  };

  return (
    <MemoWorldLineManager
      memoId={memoId}
      isBubbleMode={true}
      onOpenWorldLineView={() => {}}
      onCloseWorldLineView={handleCloseWorldLineView}
    >
      <MemoWorldLineIntegration memoId={memoId} />
    </MemoWorldLineManager>
  );
};

import { ShellBubble } from '../ui/bubbles/ShellBubble';

// 学会シフト - スタッフ一覧バブル
const GakkaiShiftStaffsBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const handleStaffSelect = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}`, bubble.id);
  };
  return <StaffCollection onStaffSelect={handleStaffSelect} />;
};

// 学会シフト - スタッフ詳細バブル
const GakkaiShiftStaffBubble: BubbleContentRenderer = ({ bubble }) => {
  const staffId = bubble.url.replace("gakkai-shift/staffs/", "");
  const { openBubble } = useContext(BubblesContext);
  const handleOpenAvailability = (staffId: string) => {
    openBubble(`gakkai-shift/staffs/${staffId}/availableTimeSlots`, bubble.id);
  };
  return <StaffDetail staffId={staffId} onOpenAvailability={handleOpenAvailability} />;
};

// 学会シフト - スタッフ参加可能時間帯バブル
const GakkaiShiftStaffAvailabilityBubble: BubbleContentRenderer = ({ bubble }) => {
  const staffId = bubble.url.replace("gakkai-shift/staffs/", "").replace("/availableTimeSlots", "");
  return <StaffAvailability staffId={staffId} />;
};

const routes: BubbleRoute[] = [
  {
    pattern: /^mob$/,
    type: "mob",
    Component: ({ bubble }) => <MobBubble bubble={bubble} />
  },
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
  { pattern: /^memos\/[^/]+\/delete-confirm$/, type: "memo-delete-confirm", Component: MemoDeleteConfirmBubble },
  { pattern: /^memos\/[^/]+\/history$/, type: "world-lines", Component: MemoWorldLinesBubble },
  { pattern: /^memos\/[^/]+$/, type: "memo", Component: MemoBubble },

  // 学会シフト
  { pattern: /^gakkai-shift\/staffs$/, type: "gakkai-shift-staffs", Component: GakkaiShiftStaffsBubble },
  { pattern: /^gakkai-shift\/staffs\/[^/]+\/availableTimeSlots$/, type: "gakkai-shift-staff-availability", Component: GakkaiShiftStaffAvailabilityBubble },
  { pattern: /^gakkai-shift\/staffs\/[^/]+$/, type: "gakkai-shift-staff", Component: GakkaiShiftStaffBubble },

  // ObjectShell統合ルート
  {
    pattern: /^object-shells\/[^/]+\/[^/]+$/,
    type: "object-shell",
    Component: ShellBubble
  },

  { pattern: /^iframes\/.+$/, type: "iframe", Component: ({ bubble }) => {
    const appId = bubble.url.replace("iframes/", "");
    return (<IframeBubble appId={appId} />);
  } },
];

export const bubbleRoutes = routes;
registerBubbleTypeResolver((url: string) => matchBubbleRoute(url)?.type);
