import { configureStore, combineReducers } from '@reduxjs/toolkit';
import storage from 'redux-persist/es/storage';
import { persistStore, persistReducer } from 'redux-persist';
import memoReducer from './memoSlice';

const rootPersistConfig = {
  key: 'root',
  storage,
  blacklist: [] // Add slice names you don’t want persisted
};

const rootReducer = combineReducers({
  memo: memoReducer
});

const persistedReducer = persistReducer(rootPersistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
