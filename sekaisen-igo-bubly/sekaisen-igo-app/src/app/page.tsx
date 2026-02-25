"use client";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button } from "@mui/material";
import {
  BublyApp,
  BublyStoreProvider,
  BublyMenuItem,
} from "@bublys-org/bubbles-ui";
import { initWorldLineGraph } from "@bublys-org/world-line-graph";
import { IgoGameProvider } from "@bublys-org/sekaisen-igo-libs";

// worldLineGraph slice を注入
initWorldLineGraph();

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

function SekaisenIgoApp() {
  return (
    <BublyApp
      title="世界線囲碁"
      menuItems={menuItems}
      sidebarFooter={sidebarFooter}
    />
  );
}

export default function Index() {
  return (
    <BublyStoreProvider
      persistKey="sekaisen-igo"
      initialBubbleUrls={["sekaisen-igo/games"]}
    >
      <IgoGameProvider>
        <SekaisenIgoApp />
      </IgoGameProvider>
    </BublyStoreProvider>
  );
}
