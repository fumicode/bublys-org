import { FC, useContext, useState } from "react";
import { BubblesContext } from "../../domain/BubblesContext";
import { SmartRect } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "@/app/bubble-ui/PositionDebugger/domain/PositionDebuggerContext";
import { useMyRectObserver } from "@/app/bubble-ui/01_Utils/01_useMyRect";
import IframeAppContent from "@/app/bubble-ui/IframeViewer/IframeAppContent";


type IframeBubbleProps = {
  appId: string;
};

export const IframeBubble: FC<IframeBubbleProps> = ({appId}) => {
  //const { openBubble } = useContext(BubblesContext);

  const [myRect, setMyRect] = useState<SmartRect | undefined>(undefined);

  const { addRects } = usePositionDebugger();

  const { ref, notifyRendered: onRenderChange} = useMyRectObserver({ 
    onRectChanged: (rect: SmartRect) => {
      setMyRect (rect);
      addRects([rect]);
    }
  });

  return (
    <div ref={ref} onTransitionEnd={onRenderChange}>
      <IframeAppContent key={appId} appId={appId} />
    </div>
  );
};