'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { makeStore, AppStore } from "@bublys-org/state-management";
import { PersistGate } from 'redux-persist/integration/react'
import { Persistor } from 'redux-persist/lib/types';

export default function StoreProvider({
  children
}: {
  children: React.ReactNode
}) {
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  if (!storePersistorRef.current) {
    // Create the store instance the first time this renders
    storePersistorRef.current = makeStore();
  }

  const { store, persistor } = storePersistorRef.current;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}