"use client";

import { FC } from "react";
import { useSelector } from "react-redux";
import { ObjectView, registerObjectType } from "@bublys-org/bubbles-ui";
import { SpeakerDetailView } from "../view/SpeakerDetailView.js";
import { selectSpeakerById } from "../slice/conversation-slice.js";

// Speakerをオブジェクト型として登録
registerObjectType("Speaker");

export type SpeakerDetailFeatureProps = {
  speakerId: string;
};

export const SpeakerDetailFeature: FC<SpeakerDetailFeatureProps> = ({
  speakerId,
}) => {
  const speaker = useSelector((state: any) =>
    selectSpeakerById(state, speakerId)
  );

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
