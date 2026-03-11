"use client";

import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import StorageIcon from "@mui/icons-material/Storage";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
} from "@bublys-org/bubbles-ui";
import {
  initWorldLineGraph,
  startServerSync,
} from "@bublys-org/world-line-graph";
import { TailorGenieProvider } from "@bublys-org/tailor-genie-libs";

// worldLineGraph slice を注入
initWorldLineGraph();

// サーバーとの世界線状態同期（Push + Pull定期ポーリング）
startServerSync("/api/wlg/sync");

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
  {
    label: "Server State",
    url: "tailor-genie/server-state",
    icon: <StorageIcon />,
  },
  {
    label: "World-Line Graph",
    url: "tailor-genie/wlg-view",
    icon: <AccountTreeIcon />,
  },
];

const handleClearLocalStorage = () => {
  if (window.confirm("ローカルストレージをクリアしますか？")) {
    localStorage.clear();
    window.location.reload();
  }
};

const sidebarFooter = (
  <Button
    variant="outlined"
    size="small"
    startIcon={<DeleteIcon />}
    onClick={handleClearLocalStorage}
    sx={{
      color: "rgba(255,255,255,0.6)",
      borderColor: "rgba(255,255,255,0.3)",
      fontSize: 12,
      width: "100%",
      "&:hover": {
        borderColor: "rgba(255,255,255,0.5)",
        backgroundColor: "rgba(255,255,255,0.1)",
      },
    }}
  >
    キャッシュクリア
  </Button>
);

function TailorGenieApp() {
  return (
    <BublyApp
      title="Tailor Genie"
      subtitle="会話アプリ"
      menuItems={menuItems}
      sidebarFooter={sidebarFooter}
    />
  );
}

export default function Index() {
  return (
    <BublyStoreProvider
      persistKey="tailor-genie"
      initialBubbleUrls={["tailor-genie/conversations"]}
    >
      <TailorGenieProvider>
        <TailorGenieApp />
      </TailorGenieProvider>
    </BublyStoreProvider>
  );
}
