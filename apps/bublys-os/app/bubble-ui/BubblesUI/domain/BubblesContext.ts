import { createContext } from "react";
import { Size2, CoordinateSystem } from "@bublys-org/bubbles-ui";
import { OpeningPosition } from "@bublys-org/bubbles-ui-state";

type BubblesContextType = {
  pageSize?: Size2;
  surfaceLeftTop: { x: number, y: number },
  coordinateSystem: CoordinateSystem;

  openBubble: (name: string, openerBubbleId: string, openingPosition?: OpeningPosition) => string;
};

export const BubblesContext = createContext<BubblesContextType>({
  pageSize: { width: 1000, height: 1000 },
  surfaceLeftTop: { x: 0, y: 0 },
  coordinateSystem: CoordinateSystem.GLOBAL,
  openBubble(name, openerBubbleId) {
    console.warn("addBubble not implemented");
    return "void_id";
  },
});
