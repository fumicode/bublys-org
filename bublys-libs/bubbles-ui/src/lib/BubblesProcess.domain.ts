import { produce } from "immer";
import { Bubble, BubbleState } from "./Bubbles.domain.js";

// Redux ストアに保持する型（純粋なプレーンオブジェクト）
export interface BubblesProcessState {
  layers: BubbleState[][];
}

// 内部で保持する state オブジェクトの型
interface BubblesProcessInternalState {
  layers: Bubble[][];
}

export class BubblesProcess {
  private constructor(private state: BubblesProcessInternalState) {}

  /** JSON からインスタンス作成 */
  static fromJSON(state: BubblesProcessState): BubblesProcess {
    const layers = state.layers.map(layer =>
      layer.map(bState => Bubble.fromJSON(bState))
    );
    return new BubblesProcess({ layers });
  }

  get layers(): Bubble[][] {
    return this.state.layers;
  }
  get surface(): Bubble[] | undefined {
    return this.state.layers[0];
  }

  /** プレーンオブジェクトへシリアライズ (外部用) */
  toJSON(): BubblesProcessState {
    return {
      layers: this.state.layers.map(layer =>
        layer.map(bubble => bubble.toJSON())
      )
    };
  }

  /** Immer で draft 操作し、新インスタンス返却 */
  private apply(
    producer: (draft: BubblesProcessInternalState) => void
  ): BubblesProcess {
    const nextState = produce(this.state, producer);
    return new BubblesProcess(nextState);
  }

  deleteBubble(id: string): BubblesProcess {
    return this.apply(draft => {
      for (let i = draft.layers.length - 1; i >= 0; --i) {
        draft.layers[i] = draft.layers[i].filter(b => b.id !== id);
        if (draft.layers[i].length === 0) draft.layers.splice(i, 1);
      }
    });
  }

  layerDown(id: string): BubblesProcess {
    return this.apply(draft => {
      const layerIdx = draft.layers.findIndex(layer =>
        layer.some(b => b.id === id)
      );
      if (layerIdx < 0 || layerIdx >= draft.layers.length - 1) return;
      const idx = draft.layers[layerIdx].findIndex(b => b.id === id);
      const [bubble] = draft.layers[layerIdx].splice(idx, 1);
      draft.layers[layerIdx + 1].push(bubble);
    });
  }

  layerUp(id: string): BubblesProcess {
    return this.apply(draft => {
      const layerIdx = draft.layers.findIndex(layer =>
        layer.some(b => b.id === id)
      );
      if (layerIdx <= 0) return;
      const idx = draft.layers[layerIdx].findIndex(b => b.id === id);
      const [bubble] = draft.layers[layerIdx].splice(idx, 1);
      if (draft.layers[layerIdx].length === 0) draft.layers.splice(layerIdx, 1);
      draft.layers[layerIdx - 1].push(bubble);
    });
  }

  moveTo(id: string, position: { x: number; y: number }): BubblesProcess {
    return this.apply(draft => {
      for (const layer of draft.layers) {
        const idx = layer.findIndex(b => b.id === id);
        if (idx >= 0) {
          layer[idx] = layer[idx].moveTo(position);
          return;
        }
      }
    });
  }

  popChild(bubble: Bubble | BubbleState): BubblesProcess {
    return this.apply(draft => {
      const inst = bubble instanceof Bubble ? bubble : Bubble.fromJSON(bubble);
      draft.layers.unshift([inst]);
    });
  }

  joinSibling(bubble: Bubble | BubbleState): BubblesProcess {
    return this.apply(draft => {
      const inst = bubble instanceof Bubble ? bubble : Bubble.fromJSON(bubble);
      if (draft.layers.length === 0) {
        draft.layers.push([inst]);
      } else {
        draft.layers[0].push(inst);
      }
    });
  }

  renameBubble(id: string, newName: string): BubblesProcess {
    return this.apply(draft => {
      for (const layer of draft.layers) {
        const idx = layer.findIndex(b => b.id === id);
        if (idx >= 0) {
          layer[idx] = layer[idx].rename(newName);
          return;
        }
      }
    });
  }
}
