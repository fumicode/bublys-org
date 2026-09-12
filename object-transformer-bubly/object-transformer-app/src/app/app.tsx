import TransformIcon from '@mui/icons-material/Transform';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// ライブラリインポート（Redux slice注入の副作用を含む）
import '@bublys-org/object-transformer-libs';
import { TransformerProvider } from '@bublys-org/object-transformer-libs';

// ルート登録（app側で管理）
import { objectTransformerBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(objectTransformerBubbleRoutes);

// サイドバーのメニュー項目
const menuItems: { label: string; url: string; icon?: React.ReactNode }[] = [
  { label: '変換エディタ', url: 'object-transformer/editor', icon: <TransformIcon /> },
  { label: 'ルール一覧', url: 'object-transformer/rules' },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="object-transformer-standalone"
      initialBubbleUrls={['object-transformer/editor']}
    >
      <TransformerProvider>
        <BublyApp
          title="オブジェクト変換"
          subtitle="Standalone • Port 4201"
          menuItems={menuItems}
        />
      </TransformerProvider>
    </BublyStoreProvider>
  );
}

export default App;
