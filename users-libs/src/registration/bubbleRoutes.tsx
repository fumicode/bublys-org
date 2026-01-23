"use client";

import { useContext } from "react";
import {
  BubbleRoute,
  BubbleContentRenderer,
  BubblesContext,
  selectBubblesRelationByOpeneeId,
  deleteProcessBubble,
  removeBubble,
} from "@bublys-org/bubbles-ui";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";

import { UserCollection } from "../feature/UserCollection.js";
import { UserDetail } from "../feature/UserDetail.js";
import { UserGroupList } from "../feature/UserGroupList.js";
import { UserGroupDetail } from "../feature/UserGroupDetail.js";
import { UserCreateFormView } from "../ui/UserCreateFormView.js";
import { UserDeleteConfirm } from "../feature/UserDeleteConfirm.js";
import { User } from "../domain/User.domain.js";
import { addUser } from "../slice/index.js";

// ラッパーコンポーネント

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

  const handleOpenGroup = (_groupId: string, url: string) => {
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

  return (
    <UserDeleteConfirm
      userId={userId}
      onDeleted={closeSelf}
      onCancel={closeSelf}
    />
  );
};

const UserGroupsBubble: BubbleContentRenderer = ({ bubble }) => {
  const { openBubble } = useContext(BubblesContext);
  const buildGroupUrl = (id: string) => `user-groups/${id}`;

  const handleSelect = (_id: string, url: string) => {
    openBubble(url, bubble.id);
  };

  return (
    <UserGroupList buildDetailUrl={buildGroupUrl} onSelect={handleSelect} />
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

// ルーティング定義
export const usersBubbleRoutes: BubbleRoute[] = [
  { pattern: /^user-groups$/, type: "user-groups", Component: UserGroupsBubble },
  { pattern: /^user-groups\/.+$/, type: "user-group", Component: UserGroupBubble },
  { pattern: /^users$/, type: "users", Component: UsersBubble },
  { pattern: /^users\/create$/, type: "user-create", Component: UserCreateBubble },
  { pattern: /^users\/[^/]+\/delete-confirm$/, type: "user-delete-confirm", Component: UserDeleteConfirmBubble },
  { pattern: /^users\/[^/]+$/, type: "user", Component: UserBubble },
];
