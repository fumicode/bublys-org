/**
 * candidateWorkerProtocol — 候補集合 worker とのやり取りの型
 *
 * worker の実体（new Worker(...)）は bundler ごとの書き方に依存するので app 層に置き、
 * libs は「この形のメッセージを投げると、この形で返ってくる」という約束だけを持つ。
 */
import type { ScheduleCandidatesPlain } from "@bublys-org/hotel-shift-puzzle-model";
import type { CandidateRequest } from "./candidateRequest.js";

export type CandidateWorkerRequest = {
  /** 応答の順序が入れ替わったとき、古い結果を捨てるための連番 */
  requestId: number;
  request: CandidateRequest;
};

export type CandidateWorkerResponse = {
  requestId: number;
  candidates: ScheduleCandidatesPlain;
};
