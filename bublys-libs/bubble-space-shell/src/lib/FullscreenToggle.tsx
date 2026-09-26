"use client";
import { FC, useCallback, useEffect, useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

/**
 * 画面いっぱいにする（フルスクリーン）切り替え。
 *
 * OS のように使うなら、ブラウザの枠まで消えていた方がいい。押すのは 1 つで、
 * いまの状態（入っている / 出ている）は `fullscreenchange` から受け取る
 * ── 自分で覚えない。ブラウザの ESC やメニューから抜けても表示がずれない。
 */
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

const currentFullscreenElement = (): Element | null => {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

export const FullscreenToggle: FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setIsFullscreen(currentFullscreenElement() !== null);
    sync();
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    const doc = document as FullscreenDocument;
    try {
      if (currentFullscreenElement()) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
        return;
      }
      const root = document.documentElement as FullscreenElement;
      await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    } catch {
      // ブラウザに断られた（ユーザー操作以外からの呼び出し等）。状態は触らない
    }
  }, []);

  return (
    // ★ 色は**まわりから継ぐ**。この口は暗い空間の上に出ることもあるので、
    //   既定の黒い字のままだと読めない（入っているときだけ青くする）。
    //   ★ Tooltip の子は 1 つだけ ── ここに註釈を置くと子が 2 つになって壊れる
    <Tooltip title={isFullscreen ? "画面いっぱいを解除" : "画面いっぱいにする"} arrow>
      <IconButton
        size="small"
        onClick={toggle}
        sx={{ color: isFullscreen ? "#4d8dff" : "inherit" }}
      >
        {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};
