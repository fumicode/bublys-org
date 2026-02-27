/**
 * ハードコードのスタッフスキーマ（初期実装）
 */

import { DomainSchema } from "../DomainSchema.js";

export const STAFF_SCHEMA = new DomainSchema({
  id: "staff-schema",
  name: "Staff_スタッフ",
  properties: [
    { name: "name", type: "string", required: true, label: "名前" },
    { name: "furigana", type: "string", required: true, label: "フリガナ" },
    { name: "email", type: "string", required: true, label: "メール" },
    { name: "phone", type: "string", required: true, label: "電話" },
    { name: "school", type: "string", required: true, label: "学校" },
    { name: "grade", type: "string", required: true, label: "学年" },
    {
      name: "gender",
      type: "enum",
      required: true,
      label: "性別",
      enumValues: ["male", "female", "other", "prefer_not_to_say"],
    },
    { name: "notes", type: "string", required: false, label: "備考" },
  ],
});
