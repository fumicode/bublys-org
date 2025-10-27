import { Bubble } from "@bublys-org/bubbles-ui";
import { FC } from "react";


export const MobBubble: FC<{ bubble: Bubble }> = ({ bubble }) => {
  return (
    <div>
      <p>こちらがbubbleの中身です。</p>
      <p>name: {bubble.name}</p>
    </div>
  );
};