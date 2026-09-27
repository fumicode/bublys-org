"use client";

import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
} from "@bublys-org/bubbles-ui";
import { TailorGenieProvider } from "@bublys-org/tailor-genie-libs";

const menuItems: BublyMenuItem[] = [
  {
    label: "会話一覧",
    url: "tailor-genie/conversations",
    icon: <ChatIcon />,
  },
  {
    label: "スピーカー一覧",
    url: "tailor-genie/speakers",
    icon: <PersonIcon />,
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

function TailorGenieApp() {
  return (
    <BublyApp
      title="Tailor Genie"
      subtitle="会話アプリ"
      menuItems={menuItems}
      sidebarFooter={sidebarFooter}
      backdropColor="hsl(35, 50%, 22%)"
    />
  );
}

export default function Index() {
  return (
    <BublyStoreProvider
      persistKey="tailor-genie"
      initialBubbleUrls={["tailor-genie/conversations"]}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec("universe")}
    >
      <TailorGenieProvider>
        <TailorGenieApp />
      </TailorGenieProvider>
    </BublyStoreProvider>
  );
}
