"use client";
import { useMemo, useState } from "react";
import { Box, Button, CircularProgress, IconButton, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExtensionIcon from "@mui/icons-material/Extension";
import { loadBublyFromOrigin, unloadBubly, getAllBublies, toBublyRouteBase, normalizeBublyOrigin, type BubbleContentRenderer } from "@bublys-org/bubbles-ui";
import { Launcher } from "@bublys-org/launcher-model";
import { useLauncher } from "@bublys-org/launcher-libs";
import { MAIN_LAUNCHER_ID } from "./launchTargets";

/**
 * バブリをオリジンからロードするバブル（url: `bubly-loader`）。
 * 旧サイドバー下部の「バブリ」欄を独立させたもの。
 * ロードしたバブリは main ランチャーに呼び出しとして足す。外したら抜く。
 */
export const BublyLoaderBubble: BubbleContentRenderer = () => {
  const [bublyOrigin, setBublyOrigin] = useState(process.env.NEXT_PUBLIC_DEFAULT_BUBLY_ORIGIN ?? "");
  const [isLoading, setIsLoading] = useState(false);
  // StoreProvider が復元を終えてから描画されるので、初期値はレジストリの現状でよい
  const [loadedBublies, setLoadedBublies] = useState<string[]>(() => Object.keys(getAllBublies()));
  const { launcher, update } = useLauncher(MAIN_LAUNCHER_ID);
  /**
   * **取りに行く先** ── 打たれたものを畳んだ結果（`normalizeBublyOrigin`）。
   * 畳めなければ空。道もクエリも落ちるので、配信先のページをそのまま貼ってよい。
   */
  const origin = useMemo(() => normalizeBublyOrigin(bublyOrigin), [bublyOrigin]);

  const handleLoad = async () => {
    if (!origin) return;
    setIsLoading(true);
    try {
      const bubly = await loadBublyFromOrigin(origin);
      if (bubly) {
        setLoadedBublies(Object.keys(getAllBublies()));
        const url = toBublyRouteBase(bubly.name);
        if (launcher && !launcher.urls.includes(url)) update((l: Launcher) => l.add(url));
        alert(`バブリ "${bubly.name}" v${bubly.version} をロードしました`);
      } else {
        alert("バブリのロードに失敗しました");
      }
    } catch (error) {
      console.error("Bubly load error:", error);
      alert("バブリのロードに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnload = (name: string) => {
    unloadBubly(name);
    setLoadedBublies(Object.keys(getAllBublies()));
    const url = toBublyRouteBase(name);
    const entry = launcher?.entries.find((e) => e.url === url);
    if (entry) update((l: Launcher) => l.remove(entry.id));
  };

  return (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1, minWidth: 260 }}>
      <Typography variant="subtitle1" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <ExtensionIcon sx={{ fontSize: 18 }} />
        バブリ
      </Typography>
      {/*
        ★ **打った所と、取りに行く先を並べて見せる。** 前は打ったものをそのまま
          `{打ったもの}/bubly.js` にしていたので、コロンが 1 つ抜けただけで
          **OS 自身を**取りに行き、404 の HTML を JavaScript として読んでいた。
          いまは畳んだ結果を下に出すので、押す前に行き先が見える。
        ★ **Enter でも決まる。** 打ち終わったらそのまま決められる所に、
          わざわざボタンまで手を移さない。
      */}
      <TextField
        size="small"
        placeholder="オリジン (例: localhost:4001)"
        value={bublyOrigin}
        onChange={(e) => setBublyOrigin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading && origin) handleLoad();
        }}
        error={!!bublyOrigin.trim() && !origin}
        helperText={
          !bublyOrigin.trim()
            ? " "
            : origin
              ? `${origin}/bubly.js を取りに行く`
              : "オリジンの形になっていない"
        }
        sx={{
          "& input": { fontSize: "0.8rem", py: 0.75 },
          "& .MuiFormHelperText-root": { fontSize: "0.7rem", mx: 0.5, mt: 0.25 },
        }}
      />
      <Button
        size="small"
        variant="contained"
        onClick={handleLoad}
        disabled={isLoading || !origin}
      >
        {isLoading ? <CircularProgress size={16} /> : "ロード"}
      </Button>
      {loadedBublies.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          <Typography variant="caption" color="text.secondary">ロード済</Typography>
          {loadedBublies.map((name) => (
            <Box key={name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
              <Typography variant="body2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleUnload(name)}
                title={`${name} を外す（次回の起動でも復元しない）`}
                sx={{ p: 0.25 }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};
