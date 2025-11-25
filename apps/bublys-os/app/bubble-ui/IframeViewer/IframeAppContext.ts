import { AppData } from "@bublys-org/state-management";
import { createContext } from "react";

type IframeAppContextType = {
  apps: AppData[];
};

export const IframeAppContext = createContext<IframeAppContextType>({
  apps: [],
});
