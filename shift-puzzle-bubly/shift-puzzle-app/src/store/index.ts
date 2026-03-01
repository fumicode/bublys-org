// shift-puzzle-libs のsliceをimport（rootReducerへの自動注入が実行される）
// makeStore より前に import する必要がある
import '@bublys-org/shift-puzzle-libs';

import { makeStore } from '@bublys-org/state-management';

const { store, persistor } = makeStore({ persistKey: 'shift-puzzle-standalone' });

export { store, persistor };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
