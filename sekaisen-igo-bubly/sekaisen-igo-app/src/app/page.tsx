"use client";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
} from "@bublys-org/bubbles-ui";
import { IgoGameProvider } from "@bublys-org/sekaisen-igo-libs";

const menuItems: BublyMenuItem[] = [
  {
    label: "対局一覧",
    url: "sekaisen-igo/games",
    icon: <SportsEsportsIcon />,
  },
];

const handleClearLocalStorage = () => {
  if (window.confirm("ローカルストレージをクリアしますか？")) {
    localStorage.clear();
    window.location.reload();
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
