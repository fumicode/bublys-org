"use client";

import { FC, useState } from "react";
import { Turn, SpeakerRole } from "@bublys-org/tailor-genie-model";
import { type ForkPreview } from "@bublys-org/world-line-graph";
import { TurnView } from "./TurnView.js";

export type GhostTurnsViewProps = {
  forkPreviews: ForkPreview<Turn[]>[];
  getSpeakerName: (speakerId: string) => string;
  getSpeakerRole: (speakerId: string) => SpeakerRole | undefined;
  getAlign: (speakerId: string) => "left" | "right";
};

export const GhostTurnsView: FC<GhostTurnsViewProps> = ({
  forkPreviews,
  getSpeakerName,
  getSpeakerRole,
  getAlign,
}) => {
  return (
    <div style={{ position: "relative" }}>
      {forkPreviews.map((fork) => (
        <GhostBranch
          key={fork.nodeId}
          fork={fork}
          getSpeakerName={getSpeakerName}
          getSpeakerRole={getSpeakerRole}
          getAlign={getAlign}
        />
      ))}
    </div>
  );
};

const GhostBranch: FC<{
  fork: ForkPreview<Turn[]>;
  getSpeakerName: (speakerId: string) => string;
  getSpeakerRole: (speakerId: string) => SpeakerRole | undefined;
  getAlign: (speakerId: string) => "left" | "right";
}> = ({ fork, getSpeakerName, getSpeakerRole, getAlign }) => {
  const [hovered, setHovered] = useState(false);
  const opacity = hovered ? 1 : 0.4;

  return (
    <div
      onClick={fork.onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity,
        transition: "opacity 0.2s",
        cursor: "pointer",
        borderTop: "1px dashed #ddd",
        paddingTop: 4,
        marginTop: 4,
      }}
    >
      {fork.preview.map((turn) => (
        <TurnView
          key={turn.id}
          turn={turn}
          speakerName={getSpeakerName(turn.speakerId)}
          speakerRole={getSpeakerRole(turn.speakerId)}
          align={getAlign(turn.speakerId)}
        />
      ))}
    </div>
  );
};
