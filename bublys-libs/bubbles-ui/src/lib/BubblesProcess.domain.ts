import { produce } from "immer";

// Redux store representation: process holds only Bubble IDs
export interface BubblesProcessState {
  layers: string[][];
}

// Internal state: same shape, IDs only
interface BubblesProcessInternalState {
  layers: string[][];
}

export class BubblesProcess {
  private constructor(private state: BubblesProcessInternalState) {}

  /** Create from JSON with ID layers */
  static fromJSON(state: BubblesProcessState): BubblesProcess {
    // layers is string[][]
    return new BubblesProcess({ layers: state.layers.map(layer => [...layer]) });
  }

  /** Expose layers of IDs */
  get layers(): string[][] {
    // return deep copy to preserve immutability
    return this.state.layers.map(layer => [...layer]);
  }

  /** Convenience: first layer of IDs */
  get surface(): string[] | undefined {
    return this.layers[0];
  }

  /** Serialize to JSON */
  toJSON(): BubblesProcessState {
    return { layers: this.layers.map(layer => [...layer]) };
  }

  /** Immer producer helper */
  private apply(
    producer: (draft: BubblesProcessInternalState) => void
  ): BubblesProcess {
    const nextState = produce(this.state, producer);
    return new BubblesProcess(nextState);
  }

  deleteBubble(id: string): BubblesProcess {
    return this.apply(draft => {
      for (let i = draft.layers.length - 1; i >= 0; --i) {
        draft.layers[i] = draft.layers[i].filter(bId => bId !== id);
        if (draft.layers[i].length === 0) draft.layers.splice(i, 1);
      }
    });
  }

  layerDown(id: string): BubblesProcess {
    return this.apply(draft => {
      const layerIdx = draft.layers.findIndex(layer =>
        layer.includes(id)
      );
      if (layerIdx < 0 || layerIdx >= draft.layers.length - 1) return;
      const idx = draft.layers[layerIdx].indexOf(id);
      const [bId] = draft.layers[layerIdx].splice(idx, 1);
      draft.layers[layerIdx + 1].push(bId);
    });
  }

  layerUp(id: string): BubblesProcess {
    return this.apply(draft => {
      const layerIdx = draft.layers.findIndex(layer =>
        layer.includes(id)
      );
      if (layerIdx <= 0) return;
      const idx = draft.layers[layerIdx].indexOf(id);
      const [bId] = draft.layers[layerIdx].splice(idx, 1);
      if (draft.layers[layerIdx].length === 0) draft.layers.splice(layerIdx, 1);
      draft.layers[layerIdx - 1].push(bId);
    });
  }

  popChild(id: string): BubblesProcess {
    return this.apply(draft => {
      draft.layers.unshift([id]);
    });
  }

  joinSibling(id: string): BubblesProcess {
    return this.apply(draft => {
      if (draft.layers.length === 0) {
        draft.layers.push([id]);
      } else {
        draft.layers[0].push(id);
      }
    });
  }
}
