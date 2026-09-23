"use client";

import { useContext, useMemo } from "react";
import {
  BubbleRoute,
  BubbleContentRenderer,
  BubblesContext,
  selectBubblesRelationByOpeneeId,
  deleteProcessBubble,
  removeBubble,
} from "@bublys-org/bubbles-ui";
import { ListSpace } from "@bublys-org/bubble-layout-feature";
import { Button } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";

import { UserDetail } from "../feature/UserDetail.js";
import { UserGroupDetail } from "../feature/UserGroupDetail.js";
import { UserCreateFormView } from "../ui/UserCreateFormView.js";
import { UserDeleteConfirm } from "../feature/UserDeleteConfirm.js";
import { UserCard } from "../ui/UserCard.js";
import { UserGroupCard } from "../ui/UserGroupCard.js";
import { User } from "../domain/User.domain.js";
import { UserGroup } from "../domain/UserGroup.domain.js";
import { addUser, addUserGroup, selectUserGroups, selectUsers } from "../slice/index.js";
import { useSeedUsers, useSeedUserGroups } from "../feature/useSeed.js";

// ラッパーコンポーネント

/**
 * ユーザー一覧 ── **並びの空間**。
 *
 * 前は巻物（スクロールする行の一覧）だった。1 人を泡にして、
 * 「少ないときは縦に並べる／多いときは奥行きに重ねる」を親の View に任せる。
 */
const UsersBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  useSeedUsers();
  const users = useAppSelector(selectUsers);
  const members = useMemo(() => users.map((u) => `users/${u.id}/card`), [users]);
  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      head={
        <Button
          size="small"
          variant="contained"
          onClick={() => openBubble("users/create", bubble.id)}
          sx={{ minWidth: 0, px: 0.9, py: 0.2, fontSize: 11, lineHeight: 1.5 }}
        >
          ＋新規
        </Button>
      }
    />
  );
};

/** 札 1 枚の大きさ（一覧が「縦に収まるか」を測るのに使う） */
const CARD = { w: 280, h: 64 };

/** ユーザー 1 人の札 ── 一覧の中の泡 */
const UserCardBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const userId = bubble.url.replace("users/", "").replace("/card", "");
  return <UserCard userId={userId} onDelete={(id) => openBubble(`users/${id}/delete-confirm`, bubble.id)} />;
};

const UserBubble: BubbleContentRenderer = ({ bubble }) => {
  const userId = bubble.url.replace("users/", "");
  return <UserDetail userId={userId} />;
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

  return (
    <UserDeleteConfirm
      userId={userId}
      onDeleted={closeSelf}
      onCancel={closeSelf}
    />
  );
};

/** グループ一覧 ── 並びの空間（ユーザー一覧と同じ形） */
const UserGroupsBubble: BubbleContentRenderer = () => {
  const dispatch = useAppDispatch();
  useSeedUserGroups();
  const groups = useAppSelector(selectUserGroups);
  const members = useMemo(() => groups.map((g) => `user-groups/${g.id}/card`), [groups]);
  return (
    <ListSpace
      members={members}
      itemWidth={CARD.w}
      itemHeight={CARD.h}
      head={
        <Button
          size="small"
          variant="contained"
          onClick={() =>
            dispatch(addUserGroup(new UserGroup(crypto.randomUUID(), `New Group ${groups.length + 1}`, []).toJSON()))
          }
          sx={{ minWidth: 0, px: 0.9, py: 0.2, fontSize: 11, lineHeight: 1.5 }}
        >
          ＋新規
        </Button>
      }
    />
  );
};

/** グループ 1 つの札 ── 一覧の中の泡 */
const UserGroupCardBubble: BubbleContentRenderer = ({ bubble }) => (
  <UserGroupCard groupId={bubble.url.replace("user-groups/", "").replace("/card", "")} />
);

const UserGroupBubble: BubbleContentRenderer = ({ bubble }) => {
  const groupId = bubble.url.replace("user-groups/", "");

  return <UserGroupDetail groupId={groupId} />;
};

// ルーティング定義
/** 一覧（並びの空間）の箱 ── 札 280 に対して広く取る。右の余白に口（＋新規）が収まる */
const LIST_SIZE = { width: 420, height: 520 };
/** 一覧は地を敷かない ── 並びの空間は海がそのまま透ける */
const LIST_OPTIONS = { defaultSize: LIST_SIZE, contentBackground: "transparent" };
const CARD_OPTIONS = { defaultSize: { width: CARD.w, height: CARD.h } };

export const usersBubbleRoutes: BubbleRoute[] = [
  { pattern: /^user-groups$/, type: "user-groups", Component: UserGroupsBubble, bubbleOptions: LIST_OPTIONS },
  // ★ 札は詳細より**先に**置く（`user-groups/:id` が `.../card` も飲み込むので）
  { pattern: /^user-groups\/[^/]+\/card$/, type: "user-group-card", Component: UserGroupCardBubble, bubbleOptions: CARD_OPTIONS },
  { pattern: /^user-groups\/.+$/, type: "user-group", Component: UserGroupBubble },
  { pattern: /^users$/, type: "users", Component: UsersBubble, bubbleOptions: LIST_OPTIONS },
  { pattern: /^users\/create$/, type: "user-create", Component: UserCreateBubble },
  { pattern: /^users\/[^/]+\/card$/, type: "user-card", Component: UserCardBubble, bubbleOptions: CARD_OPTIONS },
  { pattern: /^users\/[^/]+\/delete-confirm$/, type: "user-delete-confirm", Component: UserDeleteConfirmBubble },
  { pattern: /^users\/[^/]+$/, type: "user", Component: UserBubble },
];
