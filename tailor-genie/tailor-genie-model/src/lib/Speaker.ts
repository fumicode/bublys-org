/**
 * スピーカーの役割
 * - host: テイラー（スーツを提案する側）
 * - guest: ゲスト（提案を受ける側）
 */
export type SpeakerRole = "host" | "guest";

/**
 * スピーカードメインオブジェクト
 */
export type SpeakerState = {
  readonly id: string;
  readonly name: string;
  readonly role: SpeakerRole;
};

export class Speaker {
  constructor(readonly state: SpeakerState) {}

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get role(): SpeakerRole {
    return this.state.role;
  }

  get isHost(): boolean {
    return this.state.role === "host";
  }

  get isGuest(): boolean {
    return this.state.role === "guest";
  }

  rename(name: string): Speaker {
    return new Speaker({ ...this.state, name });
  }
}
