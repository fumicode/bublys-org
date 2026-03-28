/**
 * サンプル局員データ
 */

import { Member } from "../domain/index.js";
import { createDefaultShifts } from "./sampleData.js";

const shifts = createDefaultShifts();
const allShiftIds = shifts.map((s) => s.id);

export function createSampleMemberList(): Member[] {
  return [
    Member.create("田中 太郎", "企画局", false),
    Member.create("佐藤 花子", "広報局", false),
    Member.create("鈴木 健太", "技術局", false),
    Member.create("高橋 美咲", "総務局", false),
    Member.create("伊藤 大輔", "企画局", true),
    Member.create("渡辺 さくら", "広報局", false),
    Member.create("山本 翔太", "技術局", false),
    Member.create("中村 愛", "総務局", true),
    Member.create("小林 誠", "企画局", false),
    Member.create("加藤 優子", "広報局", true),
    Member.create("吉田 拓也", "技術局", false),
    Member.create("山田 真由", "総務局", false),
    Member.create("松本 健一", "企画局", false),
    Member.create("井上 さやか", "広報局", true),
    Member.create("木村 雄大", "技術局", true),
    Member.create("林 美穂", "総務局", false),
    Member.create("清水 大地", "企画局", false),
    Member.create("森 彩香", "広報局", true),
    Member.create("池田 航", "技術局", false),
    Member.create("橋本 萌", "総務局", false),
  ].map((member, i) => {
    // 局員ごとに参加可能シフトをランダムっぽく割り当て
    const patterns = [
      allShiftIds,
      allShiftIds.slice(0, Math.floor(allShiftIds.length * 0.8)),
      allShiftIds.slice(Math.floor(allShiftIds.length * 0.2)),
      allShiftIds.slice(Math.floor(allShiftIds.length * 0.1), Math.floor(allShiftIds.length * 0.9)),
      allShiftIds.filter((_, idx) => idx % 2 === 0),
      allShiftIds.filter((_, idx) => idx % 2 === 1),
      allShiftIds.slice(Math.floor(allShiftIds.length * 0.3)),
      allShiftIds.slice(0, Math.floor(allShiftIds.length * 0.9)),
      allShiftIds.slice(Math.floor(allShiftIds.length * 0.2), Math.floor(allShiftIds.length * 0.9)),
      allShiftIds,
    ];
    const pattern = patterns[i % patterns.length];
    return new Member({
      ...member.state,
      availableShiftIds: pattern,
    });
  });
}
