import { Size2 } from "@bublys-org/bubbles-ui";
import { useLayoutEffect, useState } from "react";

export const useWindowSize = (): Size2 => {
  const [size, setSize] = useState<Size2>({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const updateSize = (): void => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", updateSize);
    updateSize();

    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
};
