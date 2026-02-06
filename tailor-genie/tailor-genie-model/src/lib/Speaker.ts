/**
 * スピーカードメインオブジェクト
 */
export type SpeakerState = {
  readonly id: string;
  readonly name: string;
};

export class Speaker {
  constructor(readonly state: SpeakerState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  rename(name: string): Speaker {
    return new Speaker({ ...this.state, name });
  }
}
