import { BubblesProcess } from "./BubblesProcess.domain.js";
import { Bubble } from "./Bubble.domain.js";

export class BubblesProcessDPO {
  private process: BubblesProcess;
  private bubbleMap: Record<string, Bubble>;

  // キャッシュ済みのlayersとsurface（毎回新しい配列を作成しないように）
  private _layers: Bubble[][];
  private _surface: Bubble[] | undefined;

  /**
   * @param processInstance BubblesProcess のインスタンス
   * @param bubblesArray Bubble のインスタンス配列
   */
  constructor(processInstance: BubblesProcess, bubblesArray: Bubble[]) {
    this.process = processInstance;
    // Bubble インスタンスを ID をキーにマッピング
    this.bubbleMap = bubblesArray.reduce<Record<string, Bubble>>((map, b) => {
      map[b.id] = b;
      return map;
    }, {});

    // コンストラクタでlayersとsurfaceを事前計算してキャッシュ
    this._layers = this.process.layers.map((layerIds) =>
      layerIds.map((id) => {
        const bubble = this.bubbleMap[id];
        if (!bubble) {
          throw new Error(`Bubble with id "${id}" not found in DPO context.`);
        }
        return bubble;
      })
    );

    const firstLayer = this.process.layers[0];
    this._surface = firstLayer?.map((id) => {
      const bubble = this.bubbleMap[id];
      if (!bubble) {
        throw new Error(`Bubble with id "${id}" not found in DPO context.`);
      }
      return bubble;
    });
  }

  /**
   * ID レイヤーを元に、Bubble インスタンスのネスト配列を返却
   * キャッシュ済みの配列を返す（毎回新しい配列を作成しない）
   */
  get layers(): Bubble[][] {
    return this._layers;
  }

  /**
   * 1st レイヤーのみ取得
   * キャッシュ済みの配列を返す（毎回新しい配列を作成しない）
   */
  get surface(): Bubble[] | undefined {
    return this._surface;
  }
}
