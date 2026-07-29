'use client';

import { FC } from "react";
import PersonIcon from "@mui/icons-material/Person";
import { Employee } from "@bublys-org/construction-shift-puzzle-model";
import { EntityListView } from "../ui/EntityListView.js";
import { useObjects, useObjectRepo } from "../objects/repository.js";
import { useSeedConstructionData } from "../objects/seed.js";
import { EMPLOYEE_TYPE } from "../objects/constructionObjects.js";

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `emp-${Date.now()}`;

export const EmployeeCollection: FC = () => {
  useSeedConstructionData();
  const employees = useObjects<Employee>(EMPLOYEE_TYPE);
  const actions = useObjectRepo<Employee>(EMPLOYEE_TYPE);

  return (
    <EntityListView
      title="社員"
      icon={<PersonIcon fontSize="small" />}
      rows={employees.map((e) => ({ id: e.id, name: e.name, sub: e.role, object: e }))}
      emptyLabel="社員がいません"
      nameLabel="社員名"
      subLabel="役割"
      onCreate={(name, role) =>
        actions.save(new Employee({ id: newId(), name, role: role || undefined }))
      }
      onRename={(id, name) => {
        const e = employees.find((x) => x.id === id);
        if (e) actions.save(e.rename(name));
      }}
      onRemove={(id) => actions.remove(id)}
    />
  );
};
