import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// ルート登録（app側で管理）
import { ekikyoBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(ekikyoBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: '九星盤（五黄中心）', url: 'ekikyo/kyuseis/五黄', icon: <AutoAwesomeIcon /> },
  { label: '九星盤（一白中心）', url: 'ekikyo/kyuseis/一白', icon: <AutoAwesomeIcon /> },
  { label: '九星盤（九紫中心）', url: 'ekikyo/kyuseis/九紫', icon: <AutoAwesomeIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="ekikyo-standalone"
      initialBubbleUrls={['ekikyo/kyuseis/五黄']}
    >
      <BublyApp
        title="易経 - 九星盤"
        subtitle="Standalone • Port 4002"
        menuItems={menuItems}
      />
    </BublyStoreProvider>
  );
}

export default App;
