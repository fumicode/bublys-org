import { useAppSelector, selectWindowSize } from "@bublys-org/state-management";

export const useWindowSize = () => useAppSelector(selectWindowSize);
