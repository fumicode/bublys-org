"use client";
import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import ExtensionIcon from "@mui/icons-material/Extension";
import { loadBublyFromOrigin, getLoadedBublies, toBublyRouteBase, bublyOriginCandidates, useBubbleRoutes, type BubbleContentRenderer } from "@bublys-org/bubbles-ui";
import { ListSpace } from "@bublys-org/bubble-layout-feature";
import { Launcher } from "@bublys-org/launcher-model";
import { useLauncher } from "@bublys-org/launcher-libs";
import { MAIN_LAUNCHER_ID } from "./launchTargets";
import { BUBLY_CARD_HEIGHT } from "./BublyCard";

/**
 * バブリをオリジンからロードするバブル（url: `bubly-loader`）。
 * 旧サイドバー下部の「バブリ」欄を独立させたもの。
 * ロードしたバブリは main ランチャーに呼び出しとして足す。外したら抜く。
 */
export const BublyLoaderBubble: BubbleContentRenderer = () => {
  const [bublyOrigin, setBublyOrigin] = useState(process.env.NEXT_PUBLIC_DEFAULT_BUBLY_ORIGIN ?? "");
  const [isLoading, setIsLoading] = useState(false);
  /**
   * **ロード済みの顔ぶれ** ── 札 1 枚ずつのバブルにして並べる（`ListSpace`）。
   *
   * ★ 足し引きに気づく合図はルートの一覧（`useBubbleRoutes`）。バブリをロードすれば
   *   ルートが増え、外せば減るので、**そこが動いたら数え直せばよい**
   *   ── ロード済みだけを見張る別の口を新しく作らない。
   */
  const routes = useBubbleRoutes();
  const loadedBublies = useMemo(() => getLoadedBublies(), [routes]);
  const members = useMemo(() => loadedBublies.map((b) => `bublies/${b.name}`), [loadedBublies]);
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

  return (
    /*
      ★ **上が入力、下が一覧。** 一覧は並びの空間（`ListSpace`）なので、札 1 枚ずつが
        バブルになり、ほかの一覧と同じ 7 つの並べ方がそのまま効く。
      ★ 高さは箱いっぱいに伸ばす ── 一覧は「残りぜんぶ」を使う（`flex: 1`）。
        伸ばさないと並びの空間が丈を持てず、札が 1 枚も置けない。
    */
    <Box sx={{ height: "100%", p: 2, pb: 1, display: "flex", flexDirection: "column", gap: 1, boxSizing: "border-box" }}>
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
      {members.length > 0 && (
        /* 一覧は**端まで**使う ── 自分の余白（p: 2）を打ち消す。
           内側に余白を重ねると、その分だけ札が細くなって字が詰まる */
        <Box sx={{ flex: 1, minHeight: 0, mx: -2, mb: -1 }}>
          <ListSpace members={members} itemHeight={BUBLY_CARD_HEIGHT} />
        </Box>
      )}
    </Box>
  );
};
