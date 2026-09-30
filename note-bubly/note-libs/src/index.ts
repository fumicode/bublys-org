// 自分の型と形を名乗る（副作用）
import "./object-type-registration.js";

// Domain
export * from './domain/NoteLine.domain.js';
export * from './domain/Note.domain.js';

// 読み解き
export * from './domain/read/Approx.js';
export * from './domain/read/tokens.js';
export * from './domain/read/readNote.js';
export * from './domain/read/NoteItemPlain.js';

// Slice（入れ物）
export * from './slice/note-slice.js';

// UI
export { NoteView } from './ui/NoteView.js';
export { NoteItemCard } from './ui/NoteItemCard.js';

// Feature
export { NoteDetail } from './feature/NoteDetail.js';
export { NoteItemBubble } from './feature/NoteItemBubble.js';
export { useSeedNote, SAMPLE_NOTE_ID } from './feature/useSeedNote.js';

// Registration（バブルルート）
export { noteBubbleRoutes } from './registration/bubbleRoutes.js';
