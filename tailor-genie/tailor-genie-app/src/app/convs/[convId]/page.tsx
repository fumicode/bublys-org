"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { makeStore, type AppStore } from "@bublys-org/state-management";
import { initWorldLineGraph } from "@bublys-org/world-line-graph";
import {
  TailorGenieProvider,
  SpeakerFeature,
} from "@bublys-org/tailor-genie-libs";
import type { Persistor } from "redux-persist/lib/types";

initWorldLineGraph();

function GuestView({ convId }: { convId: string }) {
  return (
    <TailorGenieProvider>
      <SpeakerFeature conversationId={convId} speakerId="speaker-2" />
    </TailorGenieProvider>
  );
}

export default function ConvPage() {
  const params = useParams<{ convId: string }>();
  const storePersistorRef = useRef<{ store: AppStore; persistor: Persistor }>(null);

  if (!storePersistorRef.current) {
    storePersistorRef.current = makeStore({ persistKey: "tailor-genie" });
  }

  const { store, persistor } = storePersistorRef.current;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <GuestView convId={params.convId} />
      </PersistGate>
    </Provider>
  );
}
