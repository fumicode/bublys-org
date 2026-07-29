'use client';

import { FC } from "react";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { Machine, MachineKind } from "@bublys-org/construction-shift-puzzle-model";
import { EntityListView } from "../ui/EntityListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import { MACHINE_TYPE } from "../objects/constructionObjects.js";

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `mac-${Date.now()}`;

const KIND_OPTIONS = [
  MachineKind.Truck,
  MachineKind.Excavator,
  MachineKind.Crane,
  MachineKind.Roller,
  MachineKind.Other,
];

export const MachineCollection: FC = () => {
  useSeedConstructionData();
  const machines = useObjects<Machine>(MACHINE_TYPE);
  const actions = useObjectRepo<Machine>(MACHINE_TYPE);

  return (
    <EntityListView
      title="機械"
      icon={<LocalShippingIcon fontSize="small" />}
      rows={machines.map((m) => ({ id: m.id, name: m.name, sub: m.kind, object: m }))}
      emptyLabel="機械がありません"
      nameLabel="機械名"
      subLabel="種別"
      subOptions={KIND_OPTIONS}
      onCreate={(name, kind) =>
        actions.save(new Machine({ id: newId(), name, kind: kind || MachineKind.Other }))
      }
      onRename={(id, name) => {
        const m = machines.find((x) => x.id === id);
        if (m) actions.save(m.rename(name));
      }}
      onRemove={(id) => actions.remove(id)}
    />
  );
};
