import {environmentSlice} from "./slices/environment-slice.js";
import { combineReducers, configureStore } from "@reduxjs/toolkit";

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
import { bubblesListener } from "@bublys-org/bubbles-ui-state";
import { worldSlice } from "./slices/world-slice.js";
import { memoSlice } from "./slices/memo-slice.js";

// Reducers 定義
const reducers = combineReducers({
  [counterSlice.reducerPath]: counterSlice.reducer,
  [bubblesSlice.reducerPath]: bubblesSlice.reducer,
  [worldSlice.reducerPath]: worldSlice.reducer,
  [environmentSlice.reducerPath]: environmentSlice.reducer
});

const persistConfig = {
  key: 'root',
  storage,
}

const persistedReducer = persistReducer(persistConfig, reducers)

// RootState を reducers から推論
export type RootState = ReturnType<typeof reducers>;

// Store 作成関数
export const makeStore = () => {
  const store = configureStore({
    reducer: persistedReducer ,
    middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware( {
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
    }).prepend(bubblesListener.middleware),
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
