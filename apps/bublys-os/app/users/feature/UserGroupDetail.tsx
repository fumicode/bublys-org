import { FC, useMemo, useState } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectUserGroupById,
  selectUsers,
  updateUserGroup,
  deleteUserGroup,
} from "@bublys-org/state-management";
import { UserGroup } from "../domain/UserGroup.domain";
import { User } from "../domain/User.domain";
import { UserListView } from "../ui/UserListView";

type UserGroupDetailProps = {
  groupId: string;
  onDeleted?: () => void;
  onOpenUser?: (userId: string, detailUrl: string) => void;
};

export const UserGroupDetail: FC<UserGroupDetailProps> = ({ groupId, onDeleted, onOpenUser }) => {
  const dispatch = useAppDispatch();
  const groupEntity = useAppSelector(selectUserGroupById(groupId));
  const users = useAppSelector(selectUsers);

  const group = groupEntity ? new UserGroup(groupEntity.id, groupEntity.name, groupEntity.userIds) : undefined;
  const [name, setName] = useState(group?.name ?? "");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [sortKey, setSortKey] = useState<"custom" | "age-desc" | "age-asc" | "name-asc" | "name-desc">("custom");

  const memberUsers = useMemo(
    () =>
      (() => {
        const memberInstances = users
          .filter((u) => group?.userIds.includes(u.id))
          .map((u) => new User(u.id, u.name, u.birthday));

        if (sortKey === "custom") {
          const map = new Map(memberInstances.map((u) => [u.id, u]));
          return (group?.userIds ?? []).map((id) => map.get(id)).filter(Boolean) as User[];
        }

        return memberInstances.sort((a, b) => {
          if (sortKey === "age-desc") return b.getAge() - a.getAge();
          if (sortKey === "age-asc") return a.getAge() - b.getAge();
          const result = a.name.localeCompare(b.name);
          return sortKey === "name-asc" ? result : -result;
        });
      })(),
    [users, group, sortKey]
  );

  if (!group) {
    return <div>グループが見つかりません</div>;
  }


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    console.log("onDrop UserGroupDetail start");
    
    e.preventDefault();
    const droppedUserId = e.dataTransfer.getData("text/user-id");
    if (!droppedUserId) return;
    const updated = group.joinMember(droppedUserId);
    dispatch(updateUserGroup(updated.toJSON()));
  };

  const handleRemoveUser = (userId: string) => {
    const updated = group.removeMember(userId);
    dispatch(updateUserGroup(updated.toJSON()));
  };

  const reorderMember = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || !group) return;
    const ids = [...group.userIds];
    if (from >= ids.length || to >= ids.length) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    const updated = group.reorderMembers(ids);
    dispatch(updateUserGroup(updated.toJSON()));
  };

  const handleReorderById = (sourceUserId: string, targetUserId: string) => {
    const from = group.userIds.indexOf(sourceUserId);
    const to = group.userIds.indexOf(targetUserId);
    reorderMember(from, to);
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <h3>{group.name}</h3>

      <div style={{ marginBottom: "8px" }}>
        <label>
          並び替え
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            style={{ marginLeft: "8px" }}
          >
            <option value="custom">カスタム（自由配置）</option>
            <option value="age-desc">年齢が高い順</option>
            <option value="age-asc">年齢が低い順</option>
            <option value="name-asc">名前昇順</option>
            <option value="name-desc">名前降順</option>
          </select>
        </label>
      </div>

      {/* <label>
        グループ名
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button onClick={handleSave}>保存</button>
      <button onClick={handleDelete}>削除</button> */}

      <UserListView
        users={memberUsers}
        buildDetailUrl={(id) => `users/${id}`}
        buildDeleteUrl={(id) => `users/${id}/delete-confirm`}
        onUserClick={(userId, url) => onOpenUser?.(userId, url)}
        onUserDelete={handleRemoveUser}
        showReorder={sortKey === "custom"}
        onReorder={sortKey === "custom" ? handleReorderById : undefined}
      />

      {/* <div>
        <label>
          ユーザーを追加
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">選択してください</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={handleAddUser}>追加</button>
      </div> */}
    </div>
  );
};
