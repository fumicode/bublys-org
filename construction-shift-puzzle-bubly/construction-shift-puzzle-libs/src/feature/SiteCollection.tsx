'use client';

import { FC } from "react";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { Site } from "@bublys-org/construction-shift-puzzle-model";
import { EntityListView } from "../ui/EntityListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import { SITE_TYPE } from "../objects/constructionObjects.js";

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `site-${Date.now()}`;

export const SiteCollection: FC = () => {
  useSeedConstructionData();
  const sites = useObjects<Site>(SITE_TYPE);
  const actions = useObjectRepo<Site>(SITE_TYPE);

  return (
    <EntityListView
      title="現場"
      icon={<LocationOnIcon fontSize="small" />}
      rows={sites.map((s) => ({ id: s.id, name: s.name }))}
      emptyLabel="現場がありません"
      nameLabel="現場名"
      onCreate={(name) => actions.save(new Site({ id: newId(), name }))}
      onRename={(id, name) => {
        const s = sites.find((x) => x.id === id);
        if (s) actions.save(s.rename(name));
      }}
      onRemove={(id) => actions.remove(id)}
    />
  );
};
