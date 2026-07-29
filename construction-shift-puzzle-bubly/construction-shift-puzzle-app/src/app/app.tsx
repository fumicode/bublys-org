import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import GridOnIcon from '@mui/icons-material/GridOn';
import {
  BublyApp,
  BublyStoreProvider,
  BubbleRouteRegistry,
  BUBBLE_ARRANGEMENT_DOMAIN,
  makeSnapshotCodec,
  type BublyMenuItem,
} from '@bublys-org/bubbles-ui';

// construction-shift-puzzle-libs のslices等をimport（副作用で自動注入される）
import '@bublys-org/construction-shift-puzzle-libs';

// ルート登録（app側で管理）
import { constructionShiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(constructionShiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目（ルートを追加したらここに対応エントリーを足す）
const menuItems: BublyMenuItem[] = [
  { label: '配置表', url: 'construction-shift-puzzle/board', icon: <GridOnIcon /> },
  { label: '現場', url: 'construction-shift-puzzle/sites', icon: <LocationOnIcon /> },
  { label: '社員', url: 'construction-shift-puzzle/employees', icon: <PersonIcon /> },
  { label: '機械', url: 'construction-shift-puzzle/machines', icon: <LocalShippingIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="construction-shift-puzzle-standalone"
      initialBubbleUrls={['construction-shift-puzzle/board']}
      enableWorldLine
      domainRegistry={BUBBLE_ARRANGEMENT_DOMAIN}
      urlBinding={makeSnapshotCodec('universe')}
    >
      <BublyApp
        title="Construction Shift Puzzle"
        subtitle="Standalone • Port 4006"
        menuItems={menuItems}
        backdropColor="hsl(20, 40%, 22%)"
      />
    </BublyStoreProvider>
  );
}

export default App;
