/**
 * Store — 店舗
 *
 * 勤務表の**外**にあるデータ。名前・形態・期の決め方（区切り方と起算日）を持つ。
 * 勤務表は店舗を storeId で指し、店舗の設定は**勤務表を作るときに読むだけ**。
 * できた勤務表は自分の期を持つので、あとで店舗の設定を変えても動かない。
 *
 * 勤務表の中のデータ（制約・勤務帯・名簿）はここに持たない。それは勤務表が生まれるときに
 * 写し取るもので、店舗ごとのテンプレートにするかは #225 で決める。
 *
 * **店舗が見つからない storeId は、ホテル形態・暦月の店舗として読む**（{@link Store.resolve}）。
 * 見つからない理由は2つあり、名前だけが違う:
 *   - 一度も記録していない（店舗を入れる前の "store-1" など）… 名前は ID のまま
 *   - 削除した … 名前は「（削除された店舗）」。勤務表から店舗の名前が消えたことが分かるように
 * どちらも勤務表には何も書き足さない。
 *
 * 不変。
 */
import type { WorkingDay } from "../schedule/WorkingDay.js";
import type { SchedulePeriod } from "../schedule/SchedulePeriod.js";
import { PeriodRule, type PeriodRulePlain } from "./PeriodRule.js";
import { HOTEL_FORMAT, StoreFormat } from "./StoreFormat.js";

export type StoreState = {
  id: string;
  name: string;
  /** 形態（コードで定義。既定値と言葉を決める） */
  format: StoreFormat;
  /** 期の決め方 */
  periodRule: PeriodRule;
};

/** シリアライズ用 */
export type StorePlain = {
  id: string;
  name: string;
  formatId: string;
  periodRule: PeriodRulePlain;
};

/** 削除した店舗の名前 */
export const REMOVED_STORE_NAME = "（削除された店舗）";

const NO_IDS: ReadonlySet<string> = new Set();

export class Store {
  constructor(readonly state: StoreState) {}

  /** 形態の既定で店舗を作る（期の決め方は形態の既定。today は起算日の初期値に使う） */
  static create(params: {
    id: string;
    name: string;
    format: StoreFormat;
    today: WorkingDay;
  }): Store {
    return new Store({
      id: params.id,
      name: params.name,
      format: params.format,
      periodRule: params.format.defaultRule(params.today),
    });
  }

  /** 店舗の記録が無い storeId の読み方：ホテル形態・暦月、名前は ID のまま */
  static fallback(id: string): Store {
    return new Store({ id, name: id, format: HOTEL_FORMAT, periodRule: PeriodRule.calendarMonth() });
  }

  /** 削除した店舗の読み方：{@link fallback} と同じで、名前だけ「（削除された店舗）」 */
  static removed(id: string): Store {
    return Store.fallback(id).rename(REMOVED_STORE_NAME);
  }

  /**
   * storeId から店舗を引く。見つからなければ、削除した店舗なら {@link removed}、
   * 一度も記録していない店舗なら {@link fallback}。
   */
  static resolve(
    stores: readonly Store[],
    id: string,
    removedIds: ReadonlySet<string> = NO_IDS
  ): Store {
    return (
      stores.find((s) => s.id === id) ??
      (removedIds.has(id) ? Store.removed(id) : Store.fallback(id))
    );
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get format(): StoreFormat {
    return this.state.format;
  }

  get periodRule(): PeriodRule {
    return this.state.periodRule;
  }

  rename(name: string): Store {
    return new Store({ ...this.state, name });
  }

  /** 形態を変える。期の決め方はそのまま（形態が決めるのは既定値だけなので） */
  withFormat(format: StoreFormat): Store {
    return new Store({ ...this.state, format });
  }

  withPeriodRule(periodRule: PeriodRule): Store {
    return new Store({ ...this.state, periodRule });
  }

  /** その日を含む期（この店舗の決め方で） */
  periodContaining(day: WorkingDay): SchedulePeriod {
    return this.state.periodRule.periodContaining(day);
  }

  toPlain(): StorePlain {
    return {
      id: this.state.id,
      name: this.state.name,
      formatId: this.state.format.id,
      periodRule: this.state.periodRule.toPlain(),
    };
  }

  static fromPlain(plain: StorePlain): Store {
    return new Store({
      id: plain.id,
      name: plain.name,
      format: StoreFormat.of(plain.formatId),
      periodRule: PeriodRule.fromPlain(plain.periodRule),
    });
  }
}
