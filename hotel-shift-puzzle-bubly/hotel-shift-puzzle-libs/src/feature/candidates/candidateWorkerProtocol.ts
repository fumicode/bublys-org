/**
 * candidateWorkerProtocol — 候補集合 worker とのやり取りの型
 *
 * worker の実体（new Worker(...)）は bundler ごとの書き方に依存するので app 層に置き、
 * libs は「この形のメッセージを投げると、この形で返ってくる」という約束だけを持つ。
 *
 * 依頼は2種類ある:
 *   - candidates : 未定セルに入れられる値の計算。編集のたびに走る（速い）
 *   - diagnose   : 詰みセルの診断（なぜ入らないか・どう直せるか）。盤面を総当たりするので
 *                  重く、人が求めたときだけ走らせる
 */
import type {
  DeadCellDiagnosisPlain,
  ScheduleCandidatesPlain,
} from "@bublys-org/hotel-shift-puzzle-model";
import type { CandidateCellRefPlain, CandidateRequest } from "./candidateRequest.js";

export type CandidateWorkerRequest =
  | {
      kind: "candidates";
      /** 応答の順序が入れ替わったとき、古い結果を捨てるための連番 */
      requestId: number;
      request: CandidateRequest;
    }
  | {
      kind: "diagnose";
      requestId: number;
      request: CandidateRequest;
      /** 診断したい詰みセル */
      deadCell: CandidateCellRefPlain;
    };

export type CandidateWorkerResponse =
  | { kind: "candidates"; requestId: number; candidates: ScheduleCandidatesPlain }
  | { kind: "diagnose"; requestId: number; diagnosis: DeadCellDiagnosisPlain };
