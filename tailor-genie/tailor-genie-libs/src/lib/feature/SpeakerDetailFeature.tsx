"use client";

import { FC } from "react";
import { ObjectView, registerObjectType } from "@bublys-org/bubbles-ui";
import { SpeakerDetailView } from "../view/SpeakerDetailView.js";
import { useTailorGenie } from "./TailorGenieProvider.js";

// Speakerをオブジェクト型として登録
registerObjectType("Speaker");

export type SpeakerDetailFeatureProps = {
  speakerId: string;
};

export const SpeakerDetailFeature: FC<SpeakerDetailFeatureProps> = ({
  speakerId,
}) => {
  const { speakerShells } = useTailorGenie();
  const speaker =
    speakerShells.find((s) => s.id === speakerId)?.object ?? null;

  if (!speaker) {
    return (
      <div style={{ padding: 16, color: "#666" }}>
        スピーカーが見つかりません: {speakerId}
      </div>
    );
  }

  return (
    <ObjectView
      type="Speaker"
      url={`tailor-genie/speakers/${speakerId}`}
      label={speaker.name}
      fullWidth
    >
      <SpeakerDetailView speaker={speaker} />
    </ObjectView>
  );
};
