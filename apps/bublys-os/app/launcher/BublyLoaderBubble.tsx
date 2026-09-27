"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup, TextField, Tooltip, Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import ExtensionIcon from "@mui/icons-material/Extension";
import { loadBublyFromOrigin, unloadBubly, getLoadedBublies, toBublyRouteBase, bublyOriginCandidates, type LoadedBubly, type BubbleContentRenderer } from "@bublys-org/bubbles-ui";
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
  const [loadedBublies, setLoadedBublies] = useState<LoadedBubly[]>(() => getLoadedBublies());
  /** 外してよいか訊いている相手（null なら訊いていない） */
  const [asking, setAsking] = useState<LoadedBubly | null>(null);
  /** いまコピーしたばかりのオリジン（印を出すのに使う） */
  const [copied, setCopied] = useState<string | null>(null);
  /** 写せなかったオリジン。黙って失敗せず、そう言う */
  const [copyFailed, setCopyFailed] = useState<string | null>(null);
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
        setLoadedBublies(getLoadedBublies());
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
    setLoadedBublies(getLoadedBublies());
    const url = toBublyRouteBase(name);
    const entry = launcher?.entries.find((e) => e.url === url);
    if (entry) update((l: Launcher) => l.remove(entry.id));
    setAsking(null);
  };

  /** オリジンを写す。写せたかどうかは印で返す（黙って失敗しない） */
  const handleCopy = async (origin: string) => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(origin);
      setTimeout(() => setCopied((c) => (c === origin ? null : c)), 1500);
    } catch {
      // クリップボードが使えない所（許しが無い・安全でない配信）もある。
      // 黙って何も起きないと「押したのに写っていない」になるので、そう言う
      // ── 字そのものは選んで写せる（`user-select: text`）
      setCopyFailed(origin);
      setTimeout(() => setCopyFailed((c) => (c === origin ? null : c)), 2500);
    }
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Typography variant="caption" color="text.secondary">ロード済</Typography>
          {/*
            ★ **ここは url を入れる所なので、url も出す。** 前は名前だけ並べていたが、
              もう一度入れ直すにも、別の窓へ移すにも、要るのは取ってきた先のほう。
              字は選べるようにし、写す口も付ける（クリップボードが無い所では選んで写す）。
            ★ **外す口は「×」ではなく字で。** ×だけでは、アプリを消すのか記録を消すのか
              分からない。何が起きるかは押したあとの問い（下の `Dialog`）で全部言う。
          */}
          {loadedBublies.map((bubly) => (
            <Box
              key={bubly.name}
              sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 0.5 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                  {bubly.label}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    {bubly.name} v{bubly.version}
                  </Typography>
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    userSelect: "text",
                    wordBreak: "break-all",
                  }}
                >
                  {bubly.origin ?? "取ってきた先は分からない"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
                {bubly.origin && (
                  <Tooltip
                    title={
                      copied === bubly.origin
                        ? "写した"
                        : copyFailed === bubly.origin
                          ? "写せなかった ── 字を選んで写して"
                          : "オリジンを写す"
                    }
                  >
                    <IconButton size="small" onClick={() => handleCopy(bubly.origin as string)} sx={{ p: 0.25 }}>
                      {copied === bubly.origin
                        ? <CheckIcon sx={{ fontSize: 14 }} />
                        : <ContentCopyIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  </Tooltip>
                )}
                <Button size="small" color="inherit" onClick={() => setAsking(bubly)} sx={{ minWidth: 0, px: 0.75, fontSize: "0.7rem" }}>
                  外す
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/*
        ★ **外す前に、何が起きるかを全部言う。** 前は×を押した瞬間に外れていた。
          消えるもの（呼び出し・次からの復元）と、消えないもの（このバブリが書いたもの）を
          分けて言えば、押す前に取り返しがつくかどうかが分かる。
      */}
      <Dialog open={!!asking} onClose={() => setAsking(null)}>
        <DialogTitle sx={{ fontSize: "1rem" }}>
          「{asking?.label}」を OS から外す
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ fontSize: "0.85rem" }}>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>ランチャーからこの呼び出しが消える</li>
              <li>
                次に立ち上げても復元しない（
                <Box component="span" sx={{ fontFamily: "monospace" }}>{asking?.origin ?? "取ってきた先"}</Box>
                を忘れる）
              </li>
              <li>開いたままの泡は残るが、中身は出なくなる（閉じれば消える）</li>
              <li>
                <strong>このバブリが書いたものは消えない</strong>
                ── 同じオリジンを入れ直せば戻る
              </li>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>やめる</Button>
          <Button color="error" onClick={() => asking && handleUnload(asking.name)}>外す</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
