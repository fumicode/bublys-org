'use client';

import { FC } from "react";
import styled from "styled-components";
import { useAppStore } from "@bublys-org/state-management";
import {
  ProfileItem,
  ProfileValue,
  StaffProfileDictionary,
  STAFF_PROFILE_DICTIONARY_ID,
  type ProfileCategoryKey,
  type ProfileChoice,
} from "../domain/index.js";
import { StaffProfileDictionaryView } from "../ui/StaffProfileDictionaryView.js";
import { useIsAbsent } from "../objects/repository.js";
import { saveObject } from "../objects/commit.js";
import { STAFF_PROFILE_DICTIONARY_TYPE } from "../objects/hotelObjects.js";
import { useStaffProfileDictionary } from "./staffProfile.js";

/** 項目・値の ID を作る（ドメインは採番しない） */
const newId = (prefix: string): string =>
  globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;

/**
 * スタッフプロファイルの辞書バブル（店舗共通。#236）。
 *
 * 辞書がまだ無いときは、最初の編集で空の辞書から作る。ただし**本当に無いときだけ**
 * （useIsAbsent）。メモリ上の CAS から追い出されて読めないだけの辞書を空で作り直すと、
 * 定義が全部消えるので、状態が分かるまでは編集させない。
 */
export const StaffProfileDictionaryEditor: FC = () => {
  const store = useAppStore();
  const dictionary = useStaffProfileDictionary();
  const absent = useIsAbsent(STAFF_PROFILE_DICTIONARY_TYPE, STAFF_PROFILE_DICTIONARY_ID);
  const editable = dictionary !== undefined || absent;

  const edit = (fn: (d: StaffProfileDictionary) => StaffProfileDictionary) => {
    const base = dictionary ?? (absent ? StaffProfileDictionary.empty() : undefined);
    if (!base) return;
    const next = fn(base);
    if (next !== base || !dictionary) saveObject(store, STAFF_PROFILE_DICTIONARY_TYPE, next);
  };

  return (
    <StyledContainer>
      <p className="e-lead">
        人に付くもの（経験・雇用形態・資格…）をここで1回だけ決め、人はスタッフ詳細でそれを選びます。
        名前の横の見せ方（出さない／そのまま／文字を囲む）も値ごとに決めます。
      </p>
      <StaffProfileDictionaryView
        dictionary={dictionary}
        editable={editable}
        onAddItem={(category: ProfileCategoryKey) =>
          edit((d) =>
            d.addItem(
              new ProfileItem({
                id: newId("item"),
                category,
                name: "新しい項目",
                choice: "one",
                values: [],
              })
            )
          )
        }
        onRenameItem={(itemId, name) => edit((d) => d.updateItem(itemId, (i) => i.rename(name)))}
        onChangeChoice={(itemId, choice: ProfileChoice) =>
          edit((d) => d.updateItem(itemId, (i) => i.withChoice(choice)))
        }
        onRemoveItem={(itemId) => edit((d) => d.removeItem(itemId))}
        onAddValue={(itemId) =>
          edit((d) =>
            d.updateItem(itemId, (i) =>
              i.addValue(new ProfileValue({ id: newId("value"), label: "新しい値" }))
            )
          )
        }
        onChangeValue={(itemId, valueId, { label, symbol, markStyle }) =>
          edit((d) =>
            d.updateItem(itemId, (i) =>
              i.updateValue(valueId, (v) => {
                let next = v;
                if (label !== undefined) next = next.withLabel(label);
                if (symbol !== undefined) next = next.withSymbol(symbol);
                if (markStyle !== undefined) next = next.withMarkStyle(markStyle);
                return next;
              })
            )
          )
        }
        onChangeBuiltInMark={(key, shown) => edit((d) => d.withBuiltInMark(key, shown))}
        onRemoveValue={(itemId, valueId) =>
          edit((d) => d.updateItem(itemId, (i) => i.removeValue(valueId)))
        }
      />
    </StyledContainer>
  );
};

const StyledContainer = styled.div`
  .e-lead {
    margin: 0 0 8px;
    font-size: 0.8em;
    color: #607d8b;
  }
`;
