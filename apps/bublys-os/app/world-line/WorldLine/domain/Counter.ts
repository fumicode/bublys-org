/**
 * Counter クラス
 * カウンターの値を管理し、不変性を保つ
 */
export class Counter {
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
    public toJson(): object {
      return {
        value: this.value,
      };
    }
  
    /**
     * JSONからCounterインスタンスを作成
     */
    public static fromJson(json: any): Counter {
      return new Counter(json.value || 0);
    }
  }