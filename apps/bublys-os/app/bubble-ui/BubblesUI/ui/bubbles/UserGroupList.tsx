import { FC, useContext } from "react";
import { BubblesContext } from "../../domain/BubblesContext";
import { Bubble, SmartRect } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "@/app/bubble-ui/PositionDebugger/domain/PositionDebuggerContext";
import { useMyRectObserver } from "@/app/bubble-ui/01_Utils/01_useMyRect";
import { Button } from "@mui/material";

type UserGroupListProps = {
  containedBubble: Bubble;
}

export const UserGroupList: FC<UserGroupListProps> = ({
  containedBubble
}) => {

  const { openBubble } = useContext(BubblesContext);

  const { addRects } = usePositionDebugger();

  const { ref, notifyRendered: onRenderChange} = useMyRectObserver({ 
    onRectChanged: (rect: SmartRect) => {
      addRects([rect]);
    }
  });

  return (
    <div ref={ref} onTransitionEnd={onRenderChange}>
      <Button variant="contained" onClick={() => openBubble("huga", containedBubble.id)}>
        normal
      </Button>
      <Button
        variant="contained"
        onClick={() => openBubble("user-groups", containedBubble.id)}
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