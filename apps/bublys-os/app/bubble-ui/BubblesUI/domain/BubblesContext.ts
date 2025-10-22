import { createContext } from "react";
import { Size2, Bubble } from "@bublys-org/bubbles-ui";
import {SmartRect} from "@bublys-org/bubbles-ui";

type BubblesContextType = {
  pageSize?: Size2;
  bubbles: Bubble[][];

  openBubble: (name: string, parentRect?: SmartRect) => string;
  renameBubble: (id: string, newName: string) => string;
};

export const BubblesContext = createContext<BubblesContextType>({
  pageSize: { width: 1000, height: 1000 },
  bubbles: [],
  openBubble(name, parentRect) {
    console.warn("addBubble not implemented");
    return "void_id";
  },
  renameBubble: (id: string, newName: string) => {
    console.warn("renameBubble not implemented");
    return "void_id";
  },
});
