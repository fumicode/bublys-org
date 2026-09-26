"use client";
/**
 * **他のデモへ行く口** ── 1 つの泡にして、岸に貼る。
 *
 * ★ 画面に固定した面にはしない。新しい模型に固定の置き場所は無いし、
 *   固定すると海の上に居座って、動かすことも消すこともできない。
 *   見え方の口（{@link SpaceViewBubble}）やポケットと**同じ扱い**にしておけば、
 *   引き剥がして海に浮かべることも、要らなければ閉じることもできる。
 * ★ 中身（どのデモがあるか）は `bubbles-ui` の `DEMO_SITES` 1 か所から来る
 *   ── アプリごとに書くと、url が増えたときにどれか 1 つだけ古いまま残る。
 */
import { FC } from "react";
import { Box } from "@mui/material";
import { DemoSwitcher } from "@bublys-org/bubbles-ui";

export const DemoSitesBubble: FC = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      height: "100%",
      px: 0.5,
      color: "#dce8ff",
    }}
  >
    {/* ★ ここは OS の画面の中なので、自分（bublys OS）は出さない（`exclude` の註） */}
    <DemoSwitcher variant="bar" exclude="os" />
  </Box>
);

export default DemoSitesBubble;
