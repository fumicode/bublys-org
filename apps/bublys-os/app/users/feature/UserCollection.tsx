import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector ,  selectUsers, setUsers } from "@bublys-org/state-management";
import { UserListView } from "../ui/UserListView";
import { User } from "../domain/User.domain";
import { UrledPlace } from "../../bubble-ui/components";

const defaultUsers = [
  new User("2a5d5e9e-5d2b-4e9c-97e0-1d4f7f0db743", "Alice Johnson", "1990-04-12"),
  new User("5b8e3a41-0f56-4a18-8c1c-9bb2c9a9f3e2", "Brandon Lee", "1985-11-03"),
  new User("c4f10743-3f24-4d59-a44a-6d238544c1f8", "Chika Tanaka", "1998-07-25"),
  new User("d1c2b3a4-5678-49ab-9cde-abcdef123456", "Diego Ramirez", "1979-02-17"),
];

type UserCollectionProps = {
  buildDetailUrl: (userId: string) => string;
  buildCreateUrl: () => string;
  buildDeleteUrl: (userId: string) => string;
  onUserClick?: (userId: string, detailUrl: string) => void;
  onCreateClick?: (createUrl: string) => void;
  onUserDelete?: (userId: string) => void;
};

export const UserCollection: FC<UserCollectionProps> = ({
  buildDetailUrl,
  buildCreateUrl,
  buildDeleteUrl,
  onUserClick,
  onCreateClick,
  onUserDelete,
}) => {
  const dispatch = useAppDispatch();
  const userEntities = useAppSelector(selectUsers);

  useEffect(() => {
    if (userEntities.length === 0) {
      dispatch(setUsers(defaultUsers.map((u) => u.toJSON())));
    }
  }, [dispatch, userEntities.length]);

  const users = userEntities.map((u) => new User(u.id, u.name, u.birthday));

  const handleCreateClick = () => {
    const createUrl = buildCreateUrl();
    onCreateClick?.(createUrl);
  };

  const handleDelete = (userId: string) => {
    onUserDelete?.(userId);
  };

  return (
    <div>
      <h3>ユーザー 一覧</h3>
      <UserListView
        users={users}
        buildDetailUrl={buildDetailUrl}
        buildDeleteUrl={buildDeleteUrl}
        onUserClick={onUserClick}
        onUserDelete={handleDelete}
      />
      <div style={{ marginTop: "16px" }}>
        <UrledPlace url={buildCreateUrl()}>
          <button onClick={handleCreateClick}>
            ユーザーを作成
          </button>
        </UrledPlace>
      </div>
    </div>
  );
};
