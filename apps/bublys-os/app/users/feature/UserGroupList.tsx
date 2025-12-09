import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector, selectUserGroups, setUserGroups, addUserGroup } from "@bublys-org/state-management";
import { UserGroup } from "../domain/UserGroup.domain";
import { UserGroupIcon } from "../ui/UserIcon";
import { UrledPlace } from "../../bubble-ui/components";
import { DRAG_DATA_TYPES } from "../../bubble-ui/utils/drag-types";

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
              <UrledPlace url={url}>
                <button
                  style={{ all: "unset", cursor: "pointer" }}
                  onClick={() => onSelect?.(group.id, url)}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_DATA_TYPES.userGroup, url);
                    e.dataTransfer.setData("url", url);
                    e.dataTransfer.setData("label", group.name);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                >
                  <UserGroupIcon fontSize="small" style={{ marginRight: 6, verticalAlign: "middle" }} />
                  {group.name}
                </button>
              </UrledPlace>
            </li>
          );
        })}
      </ul>
      <button onClick={handleAddGroup}>グループを追加</button>
    </div>
  );
};
