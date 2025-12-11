"use client";

import { FocusedObjectProvider } from "../world-line/WorldLine/domain/FocusedObjectContext";
import { BubblesUI } from "./BubblesUI/feature/BubblesUI";

export default function Index() {
  return (
    <FocusedObjectProvider>
      <BubblesUI />
    </FocusedObjectProvider>
  );
}
