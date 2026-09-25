"use client";
/**
 * **大元の海の世界線を開く口** ── 1 つの泡にして、岸に貼る。
 *
 * ★ 画面に固定した面にはしない（デモへ行く口・見え方の口・ポケットと同じ扱い）。
 *   引き剥がして海に浮かべることも、要らなければ閉じることもできる。
 * ★ ここが開くのは**この海そのものの世界線**（`world-lines`）── 泡ひとつの履歴ではなく、
 *   「どう並んでいたか」の移り変わり。開く先は普通の泡なので、大きさも置き場所も
 *   海の決まりに従う。
 */
import { FC, useContext } from "react";
import { IconButton, Tooltip } from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import { BubblesContext } from "@bublys-org/bubbles-ui";
import { useCurrentBubble } from "@bublys-org/bubble-layout-feature";

export const WorldLineOpenerBubble: FC = () => {
  const { openBubble } = useContext(BubblesContext);
  /**
   * 開いた先が「どこから出たか」を辿れるように、自分を親として渡す。
   * 岸に貼られているときは自分の id が判るので、帯はこの口から伸びる。
   */
  const me = useCurrentBubble() ?? "root";
  return (
    <Tooltip title="この海の世界線を開く" placement="left">
      <IconButton
        size="small"
        sx={{ width: "100%", height: "100%", color: "#9ec1ff" }}
        onClick={() => openBubble("world-lines", me)}
      >
        <AccountTreeIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
};

export default WorldLineOpenerBubble;
