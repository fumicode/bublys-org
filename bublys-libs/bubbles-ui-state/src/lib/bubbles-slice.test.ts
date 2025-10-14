import { selectBubblesProcessDPO } from "./bubbles-slice.js";
import { Bubble, BubblesProcessDPO } from "@bublys-org/bubbles-ui";
import type { BubbleStateSlice } from "./bubbles-slice.js";

describe("selectBubblesProcessDPO", () => {
  it("returns a BubblesProcessDPO with correct Bubble layers", () => {
    // Arrange: create two Bubble instances
    const bubble1 = new Bubble({ name: "A", colorHue: 0, type: "normal" });
    const bubble2 = new Bubble({ name: "B", colorHue: 1, type: "normal" });

    // Build entities map
    const entities: Record<string, ReturnType<Bubble["toJSON"]>> = {
      [bubble1.id]: bubble1.toJSON(),
      [bubble2.id]: bubble2.toJSON(),
    };

    // Build process state with two layers
    const processState = { layers: [[bubble1.id], [bubble2.id]] };

    const state: { bubbleState: BubbleStateSlice } = {
      bubbleState: { entities, process: processState },
    };

    // Act: get DPO
    const dpo = selectBubblesProcessDPO(state);

    // Assert: instance and layers
    expect(dpo).toBeInstanceOf(BubblesProcessDPO);
    const layers = dpo.layers;
    expect(layers).toHaveLength(2);
    expect(layers[0]).toHaveLength(1);
    expect(layers[1]).toHaveLength(1);

    expect(layers[0][0]).toBeInstanceOf(Bubble);
    expect(layers[0][0].id).toBe(bubble1.id);

    expect(layers[1][0]).toBeInstanceOf(Bubble);
    expect(layers[1][0].id).toBe(bubble2.id);
  });
});
