import { createContext } from "react";
import { Size2, Bubble, CoordinateSystem, GLOBAL_COORDINATE_SYSTEM } from "@bublys-org/bubbles-ui";
import { OpeningPosition } from "@bublys-org/bubbles-ui-state";

type BubblesContextType = {
  pageSize?: Size2;
  surfaceLeftTop: { x: number, y: number },
  bubbles: Bubble[][];
  coordinateSystem: CoordinateSystem;

  openBubble: (name: string, openerBubbleId: string, openingPosition?: OpeningPosition) => string;
  renameBubble: (id: string, newName: string) => string;
};

export const BubblesContext = createContext<BubblesContextType>({
  pageSize: { width: 1000, height: 1000 },
  surfaceLeftTop: { x: 0, y: 0 }, 
  bubbles: [],
  coordinateSystem: GLOBAL_COORDINATE_SYSTEM,
  openBubble(name, openerBubbleId) {
    console.warn("addBubble not implemented");
    return "void_id";
  },
  renameBubble: (id: string, newName: string) => {
    console.warn("renameBubble not implemented");
    return "void_id";
  },
});
