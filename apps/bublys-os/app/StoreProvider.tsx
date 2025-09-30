'use client'
import { useRef } from 'react'
import { Provider } from 'react-redux'
import { stateManagement } from "@bublys-org/state-management";
import { makeStore, AppStore } from "@bublys-org/state-management";

export default function StoreProvider({
  children
}: {
  children: React.ReactNode
}) {
  console.log(stateManagement());
  
  const storeRef = useRef<AppStore | null>(null)
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore()
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}