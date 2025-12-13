import { Serializable } from '../../../object-shell/domain/Serializable';

/**
 * Counter クラス
 * カウンターの値を管理し、不変性を保つ
 */
export class Counter implements Serializable<{ value: number }> {
    public readonly value: number;
    constructor(value: number = 0) {
      this.value = value;
    }

    /**
     * カウンターを増加させる（新しいインスタンスを返す）
     */
    public countUp(): Counter {
      return new Counter(this.value + 1);
    }

    /**
     * カウンターを減少させる（新しいインスタンスを返す）
     */
    public countDown(): Counter {
      return new Counter(this.value - 1);
    }

    /**
     * JSON形式に変換
     */
    public toJSON(): { value: number } {
      return {
        value: this.value,
      };
    }

    /**
     * 後方互換性のため
     * @deprecated toJSON()を使用してください
     */
    public toJson(): { value: number } {
      return this.toJSON();
    }

    /**
     * JSONからCounterインスタンスを作成
     */
    public static fromJSON(json: { value: number }): Counter {
      return new Counter(json.value || 0);
    }

    /**
     * 後方互換性のため
     * @deprecated fromJSON()を使用してください
     */
    public static fromJson(json: any): Counter {
      return Counter.fromJSON(json);
    }
  }
