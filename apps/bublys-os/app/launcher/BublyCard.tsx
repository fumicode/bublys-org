"use client";
/**
 * ロード済みのバブリ 1 つぶんの札 ── **一覧の中のバブル**。
 *
 * ★ ほかの一覧（説明・囲碁・ユーザー）と同じく、札は 1 枚ずつバブル。
 *   だから 7 つの並べ方がそのまま効くし、ダブルクリックで開くのも同じ手ざわりになる
 *   ── 開く先は**そのバブリの窓**（`<name>-bubly`）。
 * ★ **ここは url を入れる所の一覧なので、url も出す。** 名前だけでは、入れ直すにも
 *   別の窓へ移すにも辿れない。字は選べるようにし、写す口も付ける。
 */
import { FC, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { getLoadedBublies, toBublyRouteBase, unloadBubly } from "@bublys-org/bubbles-ui";
import { ObjectView } from "@bublys-org/bubble-layout-feature";
import { Launcher } from "@bublys-org/launcher-model";
import { useLauncher } from "@bublys-org/launcher-libs";
import { MAIN_LAUNCHER_ID } from "./launchTargets";

/** 札 1 枚の丈 ── 名前の行 ＋ オリジンの行 */
export const BUBLY_CARD_HEIGHT = 56;

export const BublyCard: FC<{ name: string }> = ({ name }) => {
  const bubly = getLoadedBublies().find((b) => b.name === name);
  const { launcher, update } = useLauncher(MAIN_LAUNCHER_ID);
  const [asking, setAsking] = useState(false);
  /** 写した／写せなかった。黙って何も起きない、にはしない */
  const [copy, setCopy] = useState<"done" | "failed" | null>(null);

  if (!bubly) return null;
  const url = toBublyRouteBase(bubly.name);

  const handleCopy = async () => {
    if (!bubly.origin) return;
    try {
      await navigator.clipboard.writeText(bubly.origin);
      setCopy("done");
    } catch {
      // クリップボードが使えない所もある（許しが無い・安全でない配信）。
      // 字そのものは選んで写せる（`user-select: text`）
      setCopy("failed");
    }
    setTimeout(() => setCopy(null), 2000);
  };

  const handleUnload = () => {
    unloadBubly(bubly.name);
    const entry = launcher?.entries.find((e) => e.url === url);
    if (entry) update((l: Launcher) => l.remove(entry.id));
    setAsking(false);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, width: "100%", height: "100%", px: 1.5, boxSizing: "border-box", color: "#1b2029" }}>
      {/*
        開くのは外の空間の仕事。ここは「何か」が読めればよい。
        ★ **譲るのは字のほう。** 箱が細ければ名前もオリジンも詰める（`minWidth: 0`）
          ── 札が幅を要求すると、一覧のほうに横スクロールが生える。
      */}
      {/* ★ `ObjectView` の包み（`.bl-object`）は中身なりの幅を持つので、
             そのままだと字のほうが譲らない。箱に合わせて細くなるよう言っておく */}
      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", "& .bl-object": { maxWidth: "100%", minWidth: 0 } }}>
      <ObjectView url={url} label={bubly.label}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bubly.label}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {bubly.name} v{bubly.version}
            </Typography>
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontFamily: "monospace", fontSize: "0.7rem", userSelect: "text", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {bubly.origin ?? "取ってきた先は分からない"}
          </Typography>
        </Box>
      </ObjectView>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0 }}>
        {bubly.origin && (
          <Tooltip title={copy === "done" ? "写した" : copy === "failed" ? "写せなかった ── 字を選んで写して" : "オリジンを写す"}>
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
              {copy === "done" ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
        )}
        <Button size="small" color="inherit" onClick={() => setAsking(true)} sx={{ minWidth: 0, px: 0.75, fontSize: "0.7rem" }}>
          外す
        </Button>
      </Box>

      {/*
        ★ **外す前に、何が起きるかを全部言う。** 「×」1 つでは、アプリを消すのか
          記録を消すのかが分からない。消えるもの（呼び出し・次からの復元）と
          消えないもの（このバブリが書いたもの）を分けて言う。
      */}
      <Dialog open={asking} onClose={() => setAsking(false)}>
        <DialogTitle sx={{ fontSize: "1rem" }}>「{bubly.label}」を OS から外す</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ fontSize: "0.85rem" }}>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>ランチャーからこの呼び出しが消える</li>
              <li>
                次に立ち上げても復元しない（
                <Box component="span" sx={{ fontFamily: "monospace" }}>{bubly.origin ?? "取ってきた先"}</Box>
                を忘れる）
              </li>
              <li>開いたままの泡は残るが、中身は出なくなる（閉じれば消える）</li>
              <li><strong>このバブリが書いたものは消えない</strong> ── 同じオリジンを入れ直せば戻る</li>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(false)}>やめる</Button>
          <Button color="error" onClick={handleUnload}>外す</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
