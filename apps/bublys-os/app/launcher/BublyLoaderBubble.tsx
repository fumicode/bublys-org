"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, FormControlLabel, IconButton, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExtensionIcon from "@mui/icons-material/Extension";
import { loadBublyFromOrigin, unloadBubly, getAllBublies, toBublyRouteBase, bublyOriginCandidates, type BubbleContentRenderer } from "@bublys-org/bubbles-ui";
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
   * **取りに行けそうな先**（`bublyOriginCandidates`）。畳めたものが先、打ったそのままが後。
   * 打った字は捨てないので、ここが空になるのは**何も打っていないとき**だけ。
   */
  const candidates = useMemo(() => bublyOriginCandidates(bublyOrigin), [bublyOrigin]);
  /** そのうち、どれで取りに行くか。打ち直したら先頭（畳めたほう）に戻る */
  const [picked, setPicked] = useState(0);
  useEffect(() => setPicked(0), [bublyOrigin]);
  const origin = candidates[picked] ?? candidates[0] ?? "";

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
        ★ **打った字は弾かない。** こちらが読めなかっただけで打ち間違いとは限らない。
          畳めたものを先に出しつつ、打ったそのままも候補に残して**選べる**ようにする
          ── 「形になっていない」と止めるのは、打った人にはただ開けないのと同じ。
        ★ **Enter でも決まる。** 打ち終わった所から、わざわざボタンまで手を移さない。
      */}
      <TextField
        size="small"
        placeholder="オリジン (例: localhost:4001)"
        value={bublyOrigin}
        onChange={(e) => setBublyOrigin(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading && origin) handleLoad();
        }}
        sx={{ "& input": { fontSize: "0.8rem", py: 0.75 } }}
      />
      {/*
        取りに行く先。候補が 1 つなら選ぶ所は出さず、行き先だけ見せる
        ── 選べないものを選ばせる形にしない。
      */}
      {candidates.length === 1 && (
        <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
          {candidates[0]}/bubly.js を取りに行く
        </Typography>
      )}
      {candidates.length > 1 && (
        <RadioGroup value={picked} onChange={(e) => setPicked(Number(e.target.value))} sx={{ mx: 0.5 }}>
          {candidates.map((c, i) => (
            <FormControlLabel
              key={c}
              value={i}
              control={<Radio size="small" sx={{ p: 0.25, mr: 0.5 }} />}
              label={`${c}/bubly.js`}
              slotProps={{ typography: { fontSize: "0.7rem", sx: { wordBreak: "break-all" } } }}
              sx={{ m: 0, alignItems: "flex-start" }}
            />
          ))}
        </RadioGroup>
      )}
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
