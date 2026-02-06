"use client";

import ChatIcon from "@mui/icons-material/Chat";
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
];

function TailorGenieApp() {
  return (
    <BublyApp
      title="Tailor Genie"
      subtitle="会話アプリ"
      menuItems={menuItems}
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
