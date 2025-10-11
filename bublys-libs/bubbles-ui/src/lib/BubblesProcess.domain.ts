import { Bubble, BubbleState } from "./Bubbles.domain.js";

// Redux ストアに保持する型（純粋なプレーンオブジェクトの二次元配列）
export type BubblesProcessState = BubbleState[][];

export class BubblesProcess {
  private layers: Bubble[][];

  constructor(state: BubblesProcessState) {
    this.layers = state.map(layer =>
      layer.map(bubbleState => Bubble.fromJSON(bubbleState))
    );
  }

  static fromJSON(state: BubblesProcessState): BubblesProcess {
    return new BubblesProcess(state);
  }

  toJSON(): BubblesProcessState {
    return this.layers.map(layer =>
      layer.map(bubble => bubble.toJSON())
    );
  }

  deleteBubble(id: string): BubblesProcess {
    const newLayers = this.layers
      .map(layer => layer.filter(bubble => bubble.id !== id))
      .filter(layer => layer.length > 0);
    return new BubblesProcess(
      newLayers.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  layerDown(id: string): BubblesProcess {
    const layersCopy = this.layers.map(layer => [...layer]);
    const layerIdx = layersCopy.findIndex(layer =>
      layer.some(bubble => bubble.id === id)
    );
    if (layerIdx < 0 || layerIdx >= layersCopy.length - 1) {
      return this;
    }
    const bubbleIdx = layersCopy[layerIdx].findIndex(
      bubble => bubble.id === id
    );
    if (bubbleIdx < 0) {
      return this;
    }
    const [bubble] = layersCopy[layerIdx].splice(bubbleIdx, 1);
    layersCopy[layerIdx + 1].push(bubble);
    return new BubblesProcess(
      layersCopy.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  layerUp(id: string): BubblesProcess {
    const layersCopy = this.layers.map(layer => [...layer]);
    const layerIdx = layersCopy.findIndex(layer =>
      layer.some(bubble => bubble.id === id)
    );
    if (layerIdx <= 0) {
      return this;
    }
    const bubbleIdx = layersCopy[layerIdx].findIndex(
      bubble => bubble.id === id
    );
    if (bubbleIdx < 0) {
      return this;
    }
    const [bubble] = layersCopy[layerIdx].splice(bubbleIdx, 1);
    if (layersCopy[layerIdx].length === 0) {
      layersCopy.splice(layerIdx, 1);
    }
    layersCopy[layerIdx - 1].push(bubble);
    return new BubblesProcess(
      layersCopy.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  moveTo(id: string, position: { x: number; y: number }): BubblesProcess {
    const newLayers = this.layers.map(layer =>
      layer.map(bubble =>
        bubble.id === id ? bubble.moveTo(position) : bubble
      )
    );
    return new BubblesProcess(
      newLayers.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  popChild(bubble: Bubble): BubblesProcess {
    const layersCopy = this.layers.map(layer => [...layer]);
    layersCopy.unshift([bubble]);
    return new BubblesProcess(
      layersCopy.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  joinSibling(bubble: Bubble): BubblesProcess {
    const layersCopy = this.layers.map(layer => [...layer]);
    if (layersCopy.length === 0) {
      layersCopy.push([bubble]);
    } else {
      layersCopy[0].push(bubble);
    }
    return new BubblesProcess(
      layersCopy.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }

  renameBubble(id: string, newName: string): BubblesProcess {
    const newLayers = this.layers.map(layer =>
      layer.map(bubble =>
        bubble.id === id ? bubble.rename(newName) : bubble
      )
    );
    return new BubblesProcess(
      newLayers.map(layer => layer.map(bubble => bubble.toJSON()))
    );
  }
}
