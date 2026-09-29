// 自分の型と形を名乗る（副作用）
import "./object-type-registration.js";

// Domain
export * from './domain/Activity.domain.js';

// Slice（入れ物）
export * from './slice/activity-slice.js';

// UI
export { ActivityCard } from './ui/ActivityCard.js';
export { ActivityDetailView } from './ui/ActivityDetailView.js';

// Feature
export { ActivityDetail } from './feature/ActivityDetail.js';
export { useSeedActivities, HAKONE_ACTIVITIES } from './feature/useSeedActivities.js';
export { useVisibleActivities, type VisibleActivities } from './feature/useVisibleActivities.js';

// Registration（バブルルート）
export { activityBubbleRoutes } from './registration/bubbleRoutes.js';
