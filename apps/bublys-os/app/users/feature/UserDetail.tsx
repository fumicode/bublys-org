import { FC } from "react";
import { useAppSelector } from "@bublys-org/state-management";
import { selectUserById } from "@bublys-org/state-management";
import { User } from "../domain/User";

type UserDetailProps = {
  userId: string;
};

export const UserDetail: FC<UserDetailProps> = ({ userId }) => {
  const userEntity = useAppSelector(selectUserById(userId));
  const user = userEntity
    ? new User(userEntity.id, userEntity.name, userEntity.birthday)
    : undefined;

  if (!user) {
    return <div>ユーザーが見つかりません</div>;
  }

  return (
    <div>
      <h3>{user.name}</h3>
      <div>生年月日: {user.birthday}</div>
      <div>年齢: {user.getAge()}歳</div>
    </div>
  );
};
