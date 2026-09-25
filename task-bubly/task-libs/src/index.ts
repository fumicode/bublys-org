// 自分の型と形を名乗る（副作用。`object-type-registration.ts` の註）
import "./object-type-registration.js";

// Domain
export * from './domain/Task.domain.js';

// Slice（入れ物）
export * from './slice/task-slice.js';

// UI
export { TaskCard } from './ui/TaskCard.js';
export { TaskDetailView } from './ui/TaskDetailView.js';
export { TaskListView } from './ui/TaskListView.js';

// Feature
export { TaskDetail } from './feature/TaskDetail.js';
export { useSeedTasks } from './feature/useSeedTasks.js';

// Registration（バブルルート）
export { taskManagementBubbleRoutes } from './registration/bubbleRoutes.js';
