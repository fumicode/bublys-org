import { type Serializable, type DomainEntity } from '@bublys-org/object-shell';

/**
 * Counter クラス
 * カウンターの値を管理し、不変性を保つ
 */
export class Counter implements Serializable<{ id: string; value: number }>, DomainEntity {
    public readonly id: string;
    public readonly value: number;

    constructor(id: string, value: number = 0) {
      this.id = id;
      this.value = value;
    }

    /**
     * カウンターを増加させる（新しいインスタンスを返す）
     */
    public countUp(): Counter {
      return new Counter(this.id, this.value + 1);
    }

    /**
     * カウンターを減少させる（新しいインスタンスを返す）
     */
    public countDown(): Counter {
      return new Counter(this.id, this.value - 1);
    }

    /**
     * JSON形式に変換
     */
    public toJSON(): { id: string; value: number } {
      return {
        id: this.id,
        value: this.value,
      };
    }

    /**
     * 後方互換性のため
     * @deprecated toJSON()を使用してください
     */
    public toJson(): { id: string; value: number } {
      return this.toJSON();
    }

    /**
     * JSONからCounterインスタンスを作成
     */
    public static fromJSON(json: { id: string; value: number }): Counter {
      return new Counter(json.id || 'counter-unknown', json.value || 0);
    }

    /**
     * 後方互換性のため
     * @deprecated fromJSON()を使用してください
     */
    public static fromJson(json: any): Counter {
      return Counter.fromJSON(json);
    }
  }
