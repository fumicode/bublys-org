import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TaskIcon from '@mui/icons-material/Task';
import CalendarViewWeekIcon from '@mui/icons-material/CalendarViewWeek';
import GridOnIcon from '@mui/icons-material/GridOn';
import { BublyApp, BublyStoreProvider, BubbleRouteRegistry } from '@bublys-org/bubbles-ui';

// shift-puzzle-libs のslicesをimport（自動注入される）
import '@bublys-org/shift-puzzle-libs';

// ルート登録（app側で管理）
import { shiftPuzzleBubbleRoutes } from '../registration/index.js';

BubbleRouteRegistry.registerRoutes(shiftPuzzleBubbleRoutes);

// サイドバーのメニュー項目
const menuItems = [
  { label: '局員一覧', url: 'shift-puzzle/members', icon: <PeopleIcon /> },
  { label: 'タスク一覧', url: 'shift-puzzle/tasks', icon: <TaskIcon /> },
  { label: 'シフト配置表', url: 'shift-puzzle/shift-plans', icon: <EventNoteIcon /> },
  { label: 'ガント配置', url: 'shift-puzzle/shift-plans/default/gantt', icon: <CalendarViewWeekIcon /> },
  { label: 'プリミティブガント', url: 'shift-puzzle/shift-plans/default/primitive-gantt', icon: <GridOnIcon /> },
];

export function App() {
  return (
    <BublyStoreProvider
      persistKey="shift-puzzle-standalone"
      initialBubbleUrls={['shift-puzzle/shift-plans/default/primitive-gantt', 'shift-puzzle/tasks']}
    >
      <BublyApp
        title="シフトパズル"
        subtitle="Standalone • Port 4002"
        menuItems={menuItems}
      />
    </BublyStoreProvider>
  );
}

export default App;
