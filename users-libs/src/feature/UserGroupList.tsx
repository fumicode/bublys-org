import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@bublys-org/state-management";
import { selectUserGroups, setUserGroups, addUserGroup } from "../slice/index.js";
import { UserGroup } from "../domain/UserGroup.domain.js";
import { UserGroupIcon } from "../ui/UserIcon.js";
import { ObjectView } from "@bublys-org/bubbles-ui";

type UserGroupListProps = {
  buildDetailUrl: (groupId: string) => string;
  onSelect?: (groupId: string, url: string) => void;
};

const defaultGroups = [
  new UserGroup("group-admins", "Admins", []),
  new UserGroup("group-editors", "Editors", []),
];

export const UserGroupList: FC<UserGroupListProps> = ({ buildDetailUrl, onSelect }) => {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectUserGroups);

  useEffect(() => {
    if (groups.length === 0) {
      dispatch(setUserGroups(defaultGroups.map((g) => g.toJSON())));
    }
  }, [dispatch, groups.length]);

  const handleAddGroup = () => {
    const newGroup = new UserGroup(crypto.randomUUID(), `New Group ${groups.length + 1}`, []);
    dispatch(addUserGroup(newGroup.toJSON()));
  };

  return (
    <div>
      <h3>User Groups</h3>
      <ul style={{ padding: 0, listStyle: "none" }}>
        {groups.map((group) => {
          const url = buildDetailUrl(group.id);
          return (
            <li key={group.id} style={{ marginBottom: 8 }}>
              <ObjectView
                type="UserGroup"
                url={url}
                label={group.name}
                onClick={() => onSelect?.(group.id, url)}
              >
                <UserGroupIcon fontSize="small" style={{ marginRight: 6, verticalAlign: "middle" }} />
                {group.name}
              </ObjectView>
            </li>
          );
        })}
      </ul>
      <button onClick={handleAddGroup}>グループを追加</button>
    </div>
  );
};
