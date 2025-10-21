import { FC, useContext } from "react";
import { Bubble } from "@bublys-org/bubbles-ui";
import { BubblesContext } from "../domain/BubblesContext";
import { Button } from "@mui/material";

import { useMyRect } from "../../01_Utils/01_useMyRect";

export const BubbleContent: FC<{ bubble: Bubble }> = ({ bubble }) => {
  if (bubble.type === "user-groups") {
    return <UserGroupList />;
  } else if (bubble.type === "user-group") {
    //TODO: IDを求めるのがしょぼいロジック。すぐ穴が開くので修正
    // user-groups/35 のような形式であれば、正規表現でIDの35の部分を抽出してUserGroupDetailを表示すべき
    const groupId = bubble.name.replace("user-groups/", "");
    return <UserGroupDetail userGroupId={Number(groupId)} />;
  } else if (bubble.type === "normal") {
    return <MobBubble bubble={bubble} />;
  } else {
    return <div>Unknown bubble type: {bubble.type}</div>;
  }
};

const MobBubble: FC<{ bubble: Bubble }> = ({ bubble }) => {
  return (
    <div>
      <p>こちらがbubbleの中身です。</p>
      <p>name: {bubble.name}</p>
    </div>
  );
};

const UserGroupDetail: FC<{ userGroupId: number }> = ({ userGroupId }) => {
  return <div>ユーザグループの詳細: {userGroupId}</div>;
};

const UserGroupList: FC = () => {
  const { openBubble } = useContext(BubblesContext);

  const { ref, myRect } = useMyRect({bubble: new Bubble({
    name: "dummy",
    colorHue: 0,
    type: "normal",

  })}); // Dummy bubble for rect calculation

  return (
    <div ref={ref}>
      <Button variant="contained" onClick={() => openBubble("huga", myRect)}>
        normal
      </Button>
      <Button
        variant="contained"
        onClick={() => openBubble("user-groups", myRect)}
      >
        other User Groups
      </Button>

      <ul>
        {["Admins", "Editors", "Guests"].map((group) => (
          <li key={group}>
            {group}
          </li>
        ))}
      </ul>
    </div>
  );
};
