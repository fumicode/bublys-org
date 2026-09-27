"use client";

/**
 * **住所は `/universe@<節>` になる。** 世界線は現在地をブラウザの url に書くので
 * （`makeSnapshotCodec("universe")`）、`page.tsx` のままだと**そこで読み直した
 * 瞬間に 404** ── その道を受ける所が無い。保存を消したあとの読み直しで踏んだ。
 *
 * OS のレイヤー時代の海と同じ形にする（`apps/bublys-os/app/bubble-ui/[[...slug]]`）。
 * `[[...slug]]` は `/` そのものにも当たるので、入口の url は変わらない。
 */

import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { BublyApp, BublyStoreProvider, BUBBLE_ARRANGEMENT_DOMAIN, makeSnapshotCodec } from "@bublys-org/bubbles-ui";
import { IgoGameProvider } from "@bublys-org/sekaisen-igo-libs";

/** 開けるものは**バブリが名乗る**（`bubly.ts`）── 単体でも OS の中でも同じ 1 つ */
import { menuItems } from "../../bubly";


/**
 * 保存を消して、入口からやり直す。
 *
 * ★ **読み直しではなく、入口へ戻す。** 住所は `/universe@<節>` ── 世界線の
 *   現在地なので、保存を消した時点で**その節はもう無い**。同じ住所を読み直すのは
 *   「消したはずの所へ戻れ」と言うことで、意味がない。
 */
const handleClearLocalStorage = () => {
  if (window.confirm("保存を消して、最初からやり直しますか？")) {
    localStorage.clear();
    window.location.href = "/";
  }
};

/**
 * 保存を消してやり直す口 ── **アイコン 1 つ**。
 *
 * 脇の帯はアイコン 1 列ぶんの幅しかないので、字の入った箱を置くと切れる
 * （実測：「キャッシュクリア」が読めなかった）。上の並びと同じ姿にする。
 */
const sidebarFooter = (
  <Tooltip title="保存を消してやり直す" placement="right" arrow>
    <IconButton
      size="small"
      onClick={handleClearLocalStorage}
      sx={{
        color: "rgba(255,255,255,0.6)",
        "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
      }}
    >
      <DeleteIcon fontSize="small" />
    </IconButton>
  </Tooltip>
);

function SekaisenIgoApp() {
  return (
    <BublyApp
      title="世界線囲碁"
      menuItems={menuItems}
      sidebarFooter={sidebarFooter}
      backdropColor="hsl(155, 30%, 18%)"
    />
  );
}

export default function Index() {
  return (
    <BublyStoreProvider
      persistKey="sekaisen-igo"
      initialBubbleUrls={["sekaisen-igo/games"]}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec("universe")}
    >
      <IgoGameProvider>
        <SekaisenIgoApp />
      </IgoGameProvider>
    </BublyStoreProvider>
  );
}
