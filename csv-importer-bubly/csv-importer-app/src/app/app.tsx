import TableChartIcon from '@mui/icons-material/TableChart';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';
import { initWorldLineGraph } from '@bublys-org/world-line-graph';

// ライブラリインポート（Redux slice注入の副作用を含む）
import '@bublys-org/csv-importer-libs';
import { CsvSheetProvider } from '@bublys-org/csv-importer-libs';

// ルート登録（app側で管理）
import { csvImporterBubbleRoutes } from '../registration/index.js';

// worldLineGraph slice を注入
initWorldLineGraph();

BubbleRouteRegistry.registerRoutes(csvImporterBubbleRoutes);

// サイドバーのメニュー項目
const menuItems: { label: string; url: string; icon?: React.ReactNode }[] = [
  { label: 'シート一覧', url: 'csv-importer/sheets', icon: <TableChartIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="csv-importer-standalone"
      initialBubbleUrls={['csv-importer/sheets']}
    >
      <CsvSheetProvider>
        <BublyApp
          title="表計算"
          subtitle="Standalone • Port 4200"
          menuItems={menuItems}
        />
      </CsvSheetProvider>
    </BublyStoreProvider>
  );
}

export default App;
