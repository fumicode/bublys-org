import { FC, useMemo, useState } from "react";
import {
  useAppDispatch,
  useAppSelector,
  selectUserGroupById,
  selectUsers,
  updateUserGroup,
  deleteUserGroup,
} from "@bublys-org/state-management";
import { UserGroup } from "../domain/UserGroup";
import { User } from "../domain/User";
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

  const memberUsers = useMemo(
    () =>
      users
        .filter((u) => group?.userIds.includes(u.id))
        .map((u) => new User(u.id, u.name, u.birthday)),
    [users, group]
  );

  if (!group) {
    return <div>グループが見つかりません</div>;
  }

  const handleSave = () => {
    const updated = group.rename(name);
    dispatch(updateUserGroup(updated.toJSON()));
  };

  const handleDelete = () => {
    dispatch(deleteUserGroup(group.id));
    onDeleted?.();
  };

  const handleAddUser = () => {
    if (!selectedUserId) return;
    const updated = group.addUser(selectedUserId);
    dispatch(updateUserGroup(updated.toJSON()));
    setSelectedUserId("");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedUserId = e.dataTransfer.getData("text/user-id");
    if (!droppedUserId) return;
    const updated = group.addUser(droppedUserId);
    dispatch(updateUserGroup(updated.toJSON()));
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <h3>{group.name}</h3>
      <label>
        グループ名
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <button onClick={handleSave}>保存</button>
      <button onClick={handleDelete}>削除</button>

      <h4>メンバー</h4>
      <UserListView
        users={memberUsers}
        buildDetailUrl={(id) => `users/${id}`}
        buildDeleteUrl={(id) => `users/${id}/delete-confirm`}
        onUserClick={(userId, url) => onOpenUser?.(userId, url)}
      />

      <div>
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
      </div>
    </div>
  );
};
