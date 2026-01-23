import {environmentSlice} from "./slices/environment-slice.js";
import { combineSlices, configureStore } from "@reduxjs/toolkit";

import { persistStore, persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import storage from "redux-persist/es/storage"; // defaults to localStorage for web

import { counterSlice } from "./slices/counter-slice.js";
import {
  bubblesSlice,
} from "@bublys-org/bubbles-ui-state";
import { bubblesListener, shellBubbleListener, shellDeletionListener } from "@bublys-org/bubbles-ui-state";
import { worldSlice } from "./slices/world-slice.js";
import { memoSlice } from "./slices/memo-slice.js";
import { pocketSlice } from "./slices/pocket-slice.js";
import { gakkaiShiftSlice } from "./slices/gakkai-shift-slice.js";
import { shiftPlanSlice } from "./slices/shift-plan-slice.js";
import { taskSlice } from "./slices/task-slice.js";
import { userSlice } from "./slices/user-slice.js";
import { userGroupSlice } from "./slices/user-group-slice.js";

//iframe-slices
import appReducer from './iframe-slices/apps.slice.js';
import exportDataReducer from './iframe-slices/exportData.slice.js';
import massageReducer from './iframe-slices/massages.slice.js';
import bublysContainersReducer from './iframe-slices/bublysContainers.slice.js';

// Reducers 定義（combineSlicesを使用）
const rootReducer = combineSlices(
  counterSlice,
  bubblesSlice,
  worldSlice,
  environmentSlice,
  memoSlice,
  pocketSlice,
  gakkaiShiftSlice,
  shiftPlanSlice,
  taskSlice,
  userSlice,
  userGroupSlice,
  // iframe-slices（単純なreducer）
  {
    app: appReducer,
    exportData: exportDataReducer,
    massage: massageReducer,
    bublysContainers: bublysContainersReducer,
  }
);

const persistConfig = {
  key: 'root',
  storage,
  blacklist: [bubblesSlice.reducerPath, environmentSlice.reducerPath ],
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

// RootState を rootReducer から推論
export type RootState = ReturnType<typeof rootReducer>;

// Store 作成関数
export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer ,
    middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware( {
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
    })
      .prepend(bubblesListener.middleware)
      .prepend(shellBubbleListener.middleware)
      .prepend(shellDeletionListener.middleware),
  });
  console.log("Store created:", store);
  

  const persistor = persistStore(store);

  return {
    store,
    persistor
  };
};


// ストア、ディスパッチ型
export type AppStore = ReturnType<typeof makeStore>["store"];
export type AppDispatch = AppStore['dispatch'];
