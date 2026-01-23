import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectUsers, setUsers } from "../slice/index.js";
import { UserListView } from "../ui/UserListView.js";
import { User } from "../domain/User.domain.js";
import { UrledPlace } from "@bublys-org/bubbles-ui";

const defaultUsers = [
  new User("2a5d5e9e-5d2b-4e9c-97e0-1d4f7f0db743", "田中 太郎", "2000-04-12"),
  new User("5b8e3a41-0f56-4a18-8c1c-9bb2c9a9f3e2", "佐藤 花子", "2001-08-23"),
  new User("c4f10743-3f24-4d59-a44a-6d238544c1f8", "鈴木 健太", "2002-01-15"),
  new User("d1c2b3a4-5678-49ab-9cde-abcdef123456", "高橋 美咲", "2000-11-07"),
  new User("e2d3c4b5-6789-4abc-8def-fedcba654321", "伊藤 大輔", "2003-03-28"),
  new User("f3e4d5c6-7890-4bcd-9ef0-0fedcba98765", "渡辺 さくら", "2001-06-14"),
  new User("a4b5c6d7-8901-4cde-0f12-123456789abc", "山本 翔太", "2004-09-02"),
  new User("b5c6d7e8-9012-4def-1234-23456789abcd", "中村 愛", "2002-12-19"),
  new User("c6d7e8f9-0123-4ef0-2345-3456789abcde", "小林 悠人", "2000-07-30"),
  new User("d7e8f9a0-1234-4f01-3456-456789abcdef", "加藤 結衣", "2005-02-08"),
  new User("e8f9a0b1-2345-4012-4567-56789abcdef0", "吉田 颯太", "2003-10-25"),
  new User("f9a0b1c2-3456-4123-5678-6789abcdef01", "山田 陽菜", "2001-05-11"),
  new User("a0b1c2d3-4567-4234-6789-789abcdef012", "佐々木 蓮", "2004-08-17"),
  new User("b1c2d3e4-5678-4345-789a-89abcdef0123", "松本 凛", "2002-04-03"),
  new User("c2d3e4f5-6789-4456-89ab-9abcdef01234", "井上 大地", "2000-09-22"),
  new User("d3e4f5a6-7890-4567-9abc-abcdef012345", "木村 七海", "2005-01-29"),
  new User("e4f5a6b7-8901-4678-abcd-bcdef0123456", "林 陸", "2003-06-06"),
  new User("f5a6b7c8-9012-4789-bcde-cdef01234567", "清水 葵", "2001-11-13"),
  new User("a6b7c8d9-0123-489a-cdef-def012345678", "山口 隼人", "2004-03-20"),
  new User("b7c8d9e0-1234-49ab-def0-ef0123456789", "森 楓", "2002-08-08"),
  new User("c8d9e0f1-2345-4abc-ef01-f0123456789a", "池田 春樹", "2000-12-01"),
  new User("d9e0f1a2-3456-4bcd-f012-0123456789ab", "橋本 莉子", "2005-05-16"),
  new User("e0f1a2b3-4567-4cde-0123-123456789abc", "阿部 海斗", "2003-09-09"),
  new User("f1a2b3c4-5678-4def-1234-23456789abcd", "石川 桃花", "2001-02-24"),
  new User("a2b3c4d5-6789-4ef0-2345-3456789abcde", "前田 朝陽", "2004-07-12"),
  new User("b3c4d5e6-7890-4f01-3456-456789abcdef", "藤田 真央", "2002-10-31"),
  new User("c4d5e6f7-8901-4012-4567-56789abcdef0", "岡田 奏太", "2000-06-18"),
  new User("d5e6f7a8-9012-4123-5678-6789abcdef01", "後藤 心美", "2005-04-05"),
  new User("e6f7a8b9-0123-4234-6789-789abcdef012", "長谷川 湊", "2003-12-27"),
  new User("f7a8b9c0-1234-4345-789a-89abcdef0123", "村上 琴音", "2001-03-14"),
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
