import { FC } from "react";


export const UserGroupDetail: FC<{ userGroupId: number }> = ({ userGroupId }) => {
  return <div>ユーザグループの詳細: {userGroupId}</div>;
};