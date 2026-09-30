/**
 * 読み解きのテスト。
 *
 * 見ているのは 3 つ:
 *   1. **構造**（見出しの下・字下げ・数だけの行）が、狙いどおり主語を継ぐか
 *   2. **曖昧な数が曖昧なまま**残るか（一点に丸めていないか）
 *   3. **拾わないと決めたもの**（取り消し線・引用）を本当に拾わないか
 */
import { describe, expect, it } from "vitest";
import { Note_メモ, type NotePlain } from "../Note.domain.js";
import type { LineMark } from "../NoteLine.domain.js";
import { readNote } from "./readNote.js";
import { isRange, isVague } from "./Approx.js";

let seq = 0;
const line = (
  text: string,
  opts: { heading?: number; indent?: number; marks?: LineMark[] } = {},
) => ({
  id: `l${++seq}`,
  text,
  heading: opts.heading ?? 0,
  indent: opts.indent ?? 0,
  marks: opts.marks ?? [],
});

const noteOf = (lines: ReturnType<typeof line>[]): Note_メモ =>
  Note_メモ.fromPlain({ id: "n1", title: "箱根メモ", lines } as NotePlain);

describe("上の行が、下の行の主語になる", () => {
  it("見出しの日付を、下の行が継ぐ", () => {
    const items = readNote(
      noteOf([
        line("5/17", { heading: 1 }),
        line("箱根神社に行きたい"),
        line("湯本で昼食"),
      ]),
    );
    expect(items).toHaveLength(2);
    expect(items[0].date?.month).toBe(5);
    expect(items[0].date?.day).toBe(17);
    expect(items[1].date?.day).toBe(17);
  });

  it("深い見出しが浅い見出しに勝つ（近いほうが主語）", () => {
    const items = readNote(
      noteOf([
        line("5/17", { heading: 1 }),
        line("5/18", { heading: 2 }),
        line("箱根神社"),
      ]),
    );
    expect(items[0].date?.day).toBe(18);
  });

  it("見出しは、それ自身では 1 件にならない", () => {
    const items = readNote(noteOf([line("1日目", { heading: 1 })]));
    expect(items).toHaveLength(0);
  });

  it("字下げした行は、上の行の属性になる", () => {
    const items = readNote(noteOf([line("芦ノ湖遊覧船"), line("¥1,500 1時間", { indent: 1 })]));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("芦ノ湖遊覧船");
    expect(items[0].money?.min).toBe(1500);
    expect(items[0].duration?.min).toBe(60);
  });

  it("**字下げを忘れても**、数と印だけの行は上に付く（近さ）", () => {
    const items = readNote(noteOf([line("彫刻の森美術館"), line("¥1,600")]));
    expect(items).toHaveLength(1);
    expect(items[0].money?.min).toBe(1600);
  });

  it("空行で続きが切れる（別のものになる）", () => {
    const items = readNote(noteOf([line("彫刻の森美術館"), line(""), line("¥1,600")]));
    expect(items).toHaveLength(2);
  });

  it("あとから足した行は、先に書いたものを上書きしない", () => {
    const items = readNote(noteOf([line("昼食 ¥1,500"), line("¥3,000", { indent: 1 })]));
    expect(items[0].money?.min).toBe(1500);
  });
});

describe("曖昧なまま持つ", () => {
  it("幅のある時間は幅のまま", () => {
    const items = readNote(noteOf([line("大涌谷 2〜3時間")]));
    const d = items[0].duration!;
    expect(d.min).toBe(120);
    expect(d.max).toBe(180);
    expect(isRange(d)).toBe(true);
    expect(d.raw).toBe("2〜3時間");
  });

  it("幅のある金額は幅のまま", () => {
    const items = readNote(noteOf([line("夕食 1500〜2000円")]));
    expect(items[0].money?.min).toBe(1500);
    expect(items[0].money?.max).toBe(2000);
  });

  it("「くらい」は曖昧の印として残る", () => {
    const items = readNote(noteOf([line("宿 1.5万くらい")]));
    expect(items[0].money?.min).toBe(15000);
    expect(isVague(items[0].money!)).toBe(true);
  });

  it("ざっくりした時刻も幅で持つ", () => {
    const items = readNote(noteOf([line("夕方 チェックイン")]));
    expect(items[0].startMin?.min).toBe(16 * 60);
    expect(items[0].startMin?.max).toBe(18 * 60);
  });

  it("「1時間」は長さであって 1 時ではない", () => {
    const items = readNote(noteOf([line("参拝 1時間")]));
    expect(items[0].duration?.min).toBe(60);
    expect(items[0].startMin).toBeUndefined();
  });

  it("時刻と長さが両方あれば、両方取れる", () => {
    const items = readNote(noteOf([line("9:30 箱根神社 1時間")]));
    expect(items[0].startMin?.min).toBe(9 * 60 + 30);
    expect(items[0].duration?.min).toBe(60);
  });
});

describe("拾わないと決めたもの", () => {
  it("取り消した行は拾わない（やめたものだから）", () => {
    const items = readNote(noteOf([line("大涌谷"), line("ロープウェイ", { marks: ["strike"] })]));
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("大涌谷");
  });

  it("引用は拾わない（人の言葉だから）", () => {
    const items = readNote(noteOf([line("行きたい"), line("おすすめです", { marks: ["quote"] })]));
    expect(items).toHaveLength(1);
  });

  it("チェックの付いた行は、予定ではなくやること", () => {
    const items = readNote(
      noteOf([line("宿を予約する", { marks: ["todo"] }), line("切符を買う", { marks: ["done"] })]),
    );
    expect(items[0].kind).toBe("task");
    expect(items[0].done).toBeUndefined();
    expect(items[1].kind).toBe("task");
    expect(items[1].done).toBe(true);
  });
});

describe("どれくらい決まっているか", () => {
  it("言葉から読む", () => {
    expect(readNote(noteOf([line("箱根神社 予約済")]))[0].commitment).toBe("decided");
    expect(readNote(noteOf([line("大涌谷 行きたい")]))[0].commitment).toBe("want");
    expect(readNote(noteOf([line("彫刻の森 気になる")]))[0].commitment).toBe("maybe");
  });

  it("太字は、ほかに何も書いていなければ「行きたい」と読む", () => {
    expect(readNote(noteOf([line("箱根神社", { marks: ["strong"] })]))[0].commitment).toBe("want");
  });

  it("何も書いていなければ「かも」のまま（勝手に決めない）", () => {
    expect(readNote(noteOf([line("箱根神社")]))[0].commitment).toBe("maybe");
  });
});

describe("そのほかの印", () => {
  it("区間と移動手段", () => {
    const items = readNote(noteOf([line("新宿→箱根湯本 ロマンスカー 2480円")]));
    expect(items[0].leg).toEqual({ from: "新宿", to: "箱根湯本", raw: "新宿→箱根湯本" });
    expect(items[0].transport).toBe("train");
    expect(items[0].money?.min).toBe(2480);
  });

  it("要予約と営業時間", () => {
    const items = readNote(noteOf([line("そば屋 要予約 〜17時")]));
    expect(items[0].booking).toBe(true);
    expect(items[0].openingNote).toBe("〜17時");
  });

  it("人数と同行者", () => {
    const items = readNote(noteOf([line("2名 田中さんと")]));
    expect(items[0].people?.count).toBe(2);
    expect(items[0].people?.names).toEqual(["田中"]);
  });

  it("「AかB」は、どちらか一方として覚えておく", () => {
    expect(readNote(noteOf([line("そばかうどん")]))[0].alternatives).toEqual(["そば", "うどん"]);
  });

  it("掴んで挿した指は、場所として読む", () => {
    const items = readNote(noteOf([line("@{Spot:hakone-jinja} 1時間")]));
    expect(items[0].place).toEqual({ type: "Spot", id: "hakone-jinja" });
    // 指しか書いていないので題名は空。名前は持ち主に訊く
    expect(items[0].title).toBe("");
  });

  it("どの印から読んだかを言える（外れていたら直せるように）", () => {
    const items = readNote(noteOf([line("9:30 箱根神社 1時間 ¥0 要予約")]));
    expect(items[0].found).toEqual(expect.arrayContaining(["9:30", "1時間", "要予約"]));
    expect(items[0].title).toBe("箱根神社");
  });
});

describe("人が書いたとおりのメモ", () => {
  it("見出し・箇条書き・字下げが混ざったものを、そのまま読む", () => {
    const items = readNote(
      noteOf([
        line("5/17", { heading: 1 }),
        line("新宿→箱根湯本 ロマンスカー 8:30 ¥2,480"),
        line("箱根湯本 散策 1時間"),
        line("昼食", { marks: ["strong"] }),
        line("1500〜2000円", { indent: 1 }),
        line("@{Spot:motohakone} 遊覧船 13:30 1時間半 ¥1,500"),
        line(""),
        line("5/18", { heading: 1 }),
        line("箱根神社 9:30 参拝"),
        line("宿を予約する", { marks: ["todo"] }),
        line("大涌谷 気になる 2〜3時間"),
        line("ロープウェイ", { marks: ["strike"] }),
      ]),
    );

    const titles = items.map((i) => i.title);
    expect(titles).toContain("箱根湯本 散策");
    expect(titles).not.toContain("ロープウェイ");

    const lunch = items.find((i) => i.title === "昼食")!;
    expect(lunch.commitment).toBe("want"); // 太字
    expect(lunch.money?.max).toBe(2000); // 字下げした行から

    const day2 = items.filter((i) => i.date?.day === 18);
    expect(day2.map((i) => i.title)).toEqual(
      expect.arrayContaining(["箱根神社 参拝", "宿を予約する", "大涌谷"]),
    );
    expect(day2.find((i) => i.title === "宿を予約する")?.kind).toBe("task");
  });
});

describe("予定になれるかどうか", () => {
  it("言葉しか無い行は、ただのメモ", () => {
    expect(readNote(noteOf([line("箱根いいらしい")]))[0].kind).toBe("note");
  });

  it("下に数が書いてあれば、予定になれる", () => {
    const items = readNote(noteOf([line("昼食"), line("1500〜2000円", { indent: 1 })]));
    expect(items[0].kind).toBe("plan");
  });

  it("やることは、数が付いてもやることのまま", () => {
    const items = readNote(
      noteOf([line("宿を予約する", { marks: ["todo"] }), line("¥19,200", { indent: 1 })]),
    );
    expect(items[0].kind).toBe("task");
    expect(items[0].money?.min).toBe(19200);
  });
});

describe("似た形を取り違えない", () => {
  it("「2〜3時間」は滞在の長さ。店の閉まる時刻ではない", () => {
    const items = readNote(noteOf([line("大涌谷 2〜3時間")]));
    expect(items[0].duration?.max).toBe(180);
    expect(items[0].openingNote).toBeUndefined();
  });

  it("「〜17時」は閉まる時刻。滞在の長さではない", () => {
    const items = readNote(noteOf([line("そば屋 〜17時")]));
    expect(items[0].openingNote).toBe("〜17時");
    expect(items[0].duration).toBeUndefined();
  });

  it("「昼食」は時刻ではない（言葉の中に食い込まない）", () => {
    const items = readNote(noteOf([line("昼食 そば")]));
    expect(items[0].title).toBe("昼食 そば");
    expect(items[0].startMin).toBeUndefined();
  });
});
