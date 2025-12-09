import { FC } from "react";
import { useAppSelector, selectUserById, selectUserGroups } from "@bublys-org/state-management";
import { User } from "../domain/User.domain";
import { UserIcon } from "../ui/UserIcon";
import { UserGroupBadgeView } from "../ui/UserGroupBadgeView";
import { DRAG_DATA_TYPES } from "../../bubble-ui/utils/drag-types";

type UserDetailProps = {
  userId: string;
  onOpenGroup?: (groupId: string, detailUrl: string) => void;
};

export const UserDetail: FC<UserDetailProps> = ({ userId, onOpenGroup }) => {
  const userEntity = useAppSelector(selectUserById(userId));
  const userGroups = useAppSelector(selectUserGroups);
  const user = userEntity
    ? new User(userEntity.id, userEntity.name, userEntity.birthday)
    : undefined;

  if (!user) {
    return <div>ユーザーが見つかりません</div>;
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const userUrl = `users/${user.id}`;
    // シンプルに3つのデータだけ
    e.dataTransfer.setData(DRAG_DATA_TYPES.user, userUrl);      // bubble type
    e.dataTransfer.setData("url", userUrl);                     // URL
    e.dataTransfer.setData("label", user.name);                 // 表示名
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div >
      <h3 draggable={true} onDragStart={handleDragStart} style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <UserIcon fontSize="small" /> {user.name}
      </h3>
      <div>生年月日: {user.birthday}</div>
      <div>年齢: {user.getAge()}歳</div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: "bold" }}>所属グループ</div>
        {userGroups.filter((g) => g.userIds.includes(user.id)).length === 0 ? (
          <div style={{ color: "#666" }}>なし</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {userGroups
              .filter((g) => g.userIds.includes(user.id))
              .map((g) => (
                <UserGroupBadgeView
                  key={g.id}
                  label={g.name}
                  onClick={() => onOpenGroup?.(g.id, `user-groups/${g.id}`)}
                  linkTarget={`user-groups/${g.id}`}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
