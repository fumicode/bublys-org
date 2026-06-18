export type RowAvailability = 'available' | 'warning' | 'unavailable';

export interface GanttConfig {
  /** 1時間あたりピクセル幅 (デフォルト: 60) */
  hourPx?: number;
  /**
   * グリッド粒度（分）
   * - 60: 1時間ごとのグリッド（デフォルト）
   * - 30: 30分ごとのグリッド
   * - 15: 15分ごとのグリッド（15分単位オプション）
   */
  minuteGranularity?: 60 | 30 | 15;
}
