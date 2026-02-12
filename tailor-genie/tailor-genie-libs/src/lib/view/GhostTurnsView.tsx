"use client";

import { FC, useState } from "react";
import { Turn, SpeakerRole } from "@bublys-org/tailor-genie-model";
import { TurnView } from "./TurnView.js";

export type BranchPreview = {
  childId: string;
  isSameLine: boolean;
  newTurns: Turn[];
  onSelect: () => void;
};

export type GhostTurnsViewProps = {
  branchPreviews: BranchPreview[];
  getSpeakerName: (speakerId: string) => string;
  getSpeakerRole: (speakerId: string) => SpeakerRole | undefined;
  getAlign: (speakerId: string) => "left" | "right";
};

export const GhostTurnsView: FC<GhostTurnsViewProps> = ({
  branchPreviews,
  getSpeakerName,
  getSpeakerRole,
  getAlign,
}) => {
  return (
    <div style={{ position: "relative" }}>
      {branchPreviews.map((branch) => (
        <GhostBranch
          key={branch.childId}
          branch={branch}
          getSpeakerName={getSpeakerName}
          getSpeakerRole={getSpeakerRole}
          getAlign={getAlign}
        />
      ))}
    </div>
  );
};

const GhostBranch: FC<{
  branch: BranchPreview;
  getSpeakerName: (speakerId: string) => string;
  getSpeakerRole: (speakerId: string) => SpeakerRole | undefined;
  getAlign: (speakerId: string) => "left" | "right";
}> = ({ branch, getSpeakerName, getSpeakerRole, getAlign }) => {
  const [hovered, setHovered] = useState(false);
  const baseOpacity = branch.isSameLine ? 0.7 : 0.4;
  const opacity = hovered ? 1 : baseOpacity;

  return (
    <div
      onClick={branch.onSelect}
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
      {branch.newTurns.map((turn) => (
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
