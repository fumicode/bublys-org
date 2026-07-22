import type { ShiftCell } from "./MonthlyStaffSchedule.js";

export type ScheduleForecastIntent = "constraint-safe" | "wish-first" | "demand-first";
export type ScheduleForecastRisk = "safe" | "concession" | "risky" | "dead-end";
export type ScheduleForecastNodeKind = "decision" | "forecast" | "forecast-end";

export type ScheduleForecastNodeLabel = {
  kind: ScheduleForecastNodeKind;
  cacheKey: string;
  intent: ScheduleForecastIntent;
  displayLabel: string;
};

export type ScheduleForecastMetrics = {
  violationCount: number;
  concessionCount: number;
  staffingGap: number;
  undecidedCount: number;
  wishSatisfiedCount: number;
};

export type ScheduleForecastState = {
  id: string;
  version: string;
  scheduleId: string;
  baseNodeId: string;
  staffId: string;
  dayKey: string;
  intent: ScheduleForecastIntent;
  decision: ShiftCell;
  before: ScheduleForecastMetrics;
  afterDecision: ScheduleForecastMetrics;
  projected: ScheduleForecastMetrics;
  risk: ScheduleForecastRisk;
  reasons: string[];
};

/**
 * 現在地点からあるセルを選んだ先の「見通し」。
 * 実際の Schedule は世界線に載せ、この値は比較・説明に必要な plain state だけを持つ。
 */
export class ScheduleForecast {
  constructor(readonly state: ScheduleForecastState) {}

  get id(): string {
    return this.state.id;
  }

  get intent(): ScheduleForecastIntent {
    return this.state.intent;
  }

  get decision(): ShiftCell {
    return this.state.decision;
  }

  get risk(): ScheduleForecastRisk {
    return this.state.risk;
  }

  get reasons(): string[] {
    return this.state.reasons;
  }

  static cacheKey(args: {
    scheduleId: string;
    baseNodeId: string;
    staffId: string;
    dayKey: string;
    version: string;
  }): string {
    return [
      args.scheduleId,
      args.baseNodeId,
      args.staffId,
      args.dayKey,
      args.version,
    ].join(":");
  }

  static nodeLabel(args: ScheduleForecastNodeLabel): string {
    return `[${args.kind}|${encodeURIComponent(args.cacheKey)}|${args.intent}] ${args.displayLabel}`;
  }

  static parseNodeLabel(label: string | undefined): ScheduleForecastNodeLabel | null {
    if (!label) return null;
    const match = label.match(
      /^\[(decision|forecast|forecast-end)\|([^|]+)\|(constraint-safe|wish-first|demand-first)\]\s*(.*)$/
    );
    if (!match) return null;
    return {
      kind: match[1] as ScheduleForecastNodeKind,
      cacheKey: decodeURIComponent(match[2]),
      intent: match[3] as ScheduleForecastIntent,
      displayLabel: match[4],
    };
  }

  toPlain(): ScheduleForecastState {
    return this.state;
  }

  static fromPlain(state: ScheduleForecastState): ScheduleForecast {
    return new ScheduleForecast(state);
  }
}
