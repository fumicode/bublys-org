import { configureStore } from "@reduxjs/toolkit";
import { conversationsReducer } from "@bublys-org/tailor-genie-libs";

export const store = configureStore({
  reducer: {
    conversations: conversationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
