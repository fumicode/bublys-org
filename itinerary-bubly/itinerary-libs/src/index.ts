// 自分の型と形を名乗る（副作用）
import "./object-type-registration.js";

// Domain
export * from './domain/ItineraryItem.domain.js';
export * from './domain/Itinerary.domain.js';

// Slice（入れ物）
export * from './slice/itinerary-slice.js';

// UI
export { ItineraryView } from './ui/ItineraryView.js';
export { ItineraryCard } from './ui/ItineraryCard.js';

// Feature
export { ItineraryDetail } from './feature/ItineraryDetail.js';
export { useSeedItinerary, SAMPLE_ITINERARY_ID } from './feature/useSeedItinerary.js';

// Registration（バブルルート）
export { itineraryBubbleRoutes } from './registration/bubbleRoutes.js';
