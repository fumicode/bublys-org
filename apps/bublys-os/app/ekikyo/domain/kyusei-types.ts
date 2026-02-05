export type KyurekiYear = number;

export const calcKyuseiFromKyurekiYear = (
  kyurekiYear: KyurekiYear
): KyuseiName => {
  const amari = (kyurekiYear - 2) % KyuseiNameList.length; //0〜8
  const kyuseiIndex = 9 - 1 - amari; //9〜1

  return KyuseiNameList[kyuseiIndex];
};

// type Jikkan = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
// type Juunishi = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

export type KyuseiName =
  | "一白"
  | "二黒"
  | "三碧"
  | "四緑"
  | "五黄"
  | "六白"
  | "七赤"
  | "八白"
  | "九紫";

export const KyuseiNameList: KyuseiName[] = [
  "一白",
  "二黒",
  "三碧",
  "四緑",
  "五黄",
  "六白",
  "七赤",
  "八白",
  "九紫",
];

export const KyuseiYomiMap: Record<KyuseiName, string> = {
  一白: "いっぱく",
  二黒: "じこく",
  三碧: "さんぺき",
  四緑: "しろく",
  五黄: "ごおう",
  六白: "ろっぱく",
  七赤: "しちせき",
  八白: "はっぱく",
  九紫: "きゅうし",
};

export class Kyusei {
  name: KyuseiName;
  kyuseiIndex: number; //1〜9

  constructor(name: KyuseiName) {
    this.name = name;
    this.kyuseiIndex = KyuseiNameList.indexOf(name) + 1; //1〜9
  }

  get gogyo(): GogyoName {
    return kyuseiGogyoMap[this.name];
  }

  get yomi() {
    return KyuseiYomiMap[this.name];
  }
}

export const KyuseiRepository = KyuseiNameList.reduce((acc, kyuseiName) => {
  acc[kyuseiName] = new Kyusei(kyuseiName);
  return acc;
}, {} as Record<KyuseiName, Kyusei>);

export type GogyoName = "木" | "火" | "土" | "金" | "水";
export const kyuseiGogyoMap: Record<KyuseiName, GogyoName> = {
  一白: "水",
  二黒: "土",
  三碧: "木",
  四緑: "木",
  五黄: "土",
  六白: "金",
  七赤: "金",
  八白: "土",
  九紫: "火",
};
