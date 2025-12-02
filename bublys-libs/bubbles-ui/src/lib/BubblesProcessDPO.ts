import { BubblesProcess } from "./BubblesProcess.domain.js";
import { Bubble } from "./Bubble.domain.js";

export class BubblesProcessDPO {
  private process: BubblesProcess;
  private bubbleMap: Record<string, Bubble>;

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
  }

  /**
   * ID レイヤーを元に、Bubble インスタンスのネスト配列を返却
   */
  get layers(): Bubble[][] {
    return this.process.layers.map((layerIds) =>
      layerIds.map((id) => {
        const bubble = this.bubbleMap[id];
        if (!bubble) {
          throw new Error(`Bubble with id "${id}" not found in DPO context.`);
        }
        return bubble;
      })
    );
  }

  /**
   * 1st レイヤーのみ取得
   */
  get surface(): Bubble[] | undefined {
    const firstLayer = this.process.layers[0];
    return firstLayer?.map((id) => {
      const bubble = this.bubbleMap[id];
      if (!bubble) {
        throw new Error(`Bubble with id "${id}" not found in DPO context.`);
      }
      return bubble;
    });
  }
}
