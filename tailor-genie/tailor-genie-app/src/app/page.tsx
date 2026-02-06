"use client";

import ChatIcon from "@mui/icons-material/Chat";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
} from "@bublys-org/bubbles-ui";
import { injectSlice } from "@bublys-org/state-management";
// tailor-genie-libsをimportすると自動でbubbleRoutesが登録される
import { conversationsSlice } from "@bublys-org/tailor-genie-libs";

// sliceを早期に注入
injectSlice(conversationsSlice);

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
      <TailorGenieApp />
    </BublyStoreProvider>
  );
}
