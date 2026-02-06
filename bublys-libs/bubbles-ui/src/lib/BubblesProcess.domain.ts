import { produce } from "immer";

// Redux store representation: process holds only Bubble IDs
export interface BubblesProcessState {
  layers: string[][];
  // e.g.
  // [["A"], ["B", "C"], ["D"]]
}


export class BubblesProcess {
  private state: BubblesProcessState

  constructor(props: BubblesProcessState) {
    const layers = props.layers;
    //空のレイヤーがあったら削除する
    this.state = { layers: layers.filter(layer => layer.length > 0) };
  }

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
    producer: (draft: BubblesProcessState) => void
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
      if (layerIdx < 0) return;
      const idx = draft.layers[layerIdx].indexOf(id);
      const [bId] = draft.layers[layerIdx].splice(idx, 1);
      if (layerIdx >= draft.layers.length - 1) {
        draft.layers.push([bId]);
      } else {
        draft.layers[layerIdx + 1].push(bId);
      }
    });
  }

  layerUp(id: string): BubblesProcess {
    return this.apply(draft => {
      const layerIdx = draft.layers.findIndex(layer =>
        layer.includes(id)
      );
      if (layerIdx < 0) return;
      const idx = draft.layers[layerIdx].indexOf(id);
      const [bId] = draft.layers[layerIdx].splice(idx, 1);
      if (draft.layers[layerIdx].length === 0) draft.layers.splice(layerIdx, 1);
      if (layerIdx === 0) {
        draft.layers.unshift([bId]);
      } else {
        draft.layers[layerIdx - 1].push(bId);
      }
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
