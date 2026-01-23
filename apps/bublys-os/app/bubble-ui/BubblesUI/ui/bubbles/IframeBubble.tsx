import { FC } from "react";
import { SmartRect, useMyRectObserver } from "@bublys-org/bubbles-ui";
import { usePositionDebugger } from "@/app/bubble-ui/PositionDebugger/domain/PositionDebuggerContext";
import IframeAppContent from "@/app/bubble-ui/IframeViewer/IframeAppContent";


type IframeBubbleProps = {
  appId: string;
};

export const IframeBubble: FC<IframeBubbleProps> = ({appId}) => {
  const { addRects } = usePositionDebugger();

  const { ref, notifyRendered: onRenderChange} = useMyRectObserver({
    onRectChanged: (rect: SmartRect) => {
      addRects([rect]);
    }
  });

  return (
    <div ref={ref} onTransitionEnd={onRenderChange}>
      <IframeAppContent key={appId} appId={appId} />
    </div>
  );
};