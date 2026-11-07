/**
 * **AI を呼ぶ口。**
 *
 * ここから先が AI。ゲームのどこからも、この 1 本だけを通して呼ぶ。
 * 送り先が変わっても、直すのはこのファイルだけで済むようにしてある。
 *
 * ★ **フロントだけで完結させる。** ブラウザから OpenAI を直に叩く。
 *   鍵はこのライブラリが自分で読みに行かない。入口（henge-app）が
 *   `configureAI()` で渡す。ライブラリは Next の OS からも読まれるので、
 *   どこの env を見るかは入口が決める。
 *
 * ★ 渡した鍵は配信される JS に載る。公開する URL では誰でも取り出せる。
 */

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-6.1-terra";

let apiKey = "";
let defaultModel = DEFAULT_MODEL;

/** 鍵と既定のモデルを渡す。入口で 1 度だけ呼ぶ */
export function configureAI(config: { apiKey?: string; model?: string }): void {
  apiKey = config.apiKey ?? "";
  defaultModel = config.model || DEFAULT_MODEL;
}

/** 鍵が渡されているか。無いときは AI を使う操作を出さない判断に使う */
export function isAIConfigured(): boolean {
  return apiKey.length > 0;
}

export type AskAIRequest = {
  /** 本文。文字列でも、役割つきの配列でもよい */
  input: unknown;
  /** 役回りの指示。毎回同じことはこちらに置く */
  instructions?: string;
  /** 既定のモデルを上書きしたいときだけ */
  model?: string;
  signal?: AbortSignal;
};

export class AIError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly hint?: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AIError";
  }
}

/** 素の文字列で返す */
export async function askAI(req: AskAIRequest): Promise<string> {
  if (!apiKey) {
    throw new AIError(
      "OPENAI_API_KEY がありません",
      undefined,
      "henge-bubly/henge-app/.env.local に OPENAI_API_KEY=sk-... を書いて、dev サーバーを起動し直してください",
    );
  }

  let res: Response;
  try {
    res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: req.model ?? defaultModel,
        input: req.input,
        ...(req.instructions ? { instructions: req.instructions } : {}),
      }),
      signal: req.signal,
    });
  } catch (e) {
    throw new AIError("OpenAI に繋がりませんでした", undefined, undefined, String(e));
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AIError("OpenAI がエラーを返しました", res.status, undefined, detail.slice(0, 600));
  }
  return extractText((await res.json()) as Record<string, unknown>);
}

/** Responses API の返りから本文だけ取り出す（形が揺れるので両方見る） */
function extractText(json: Record<string, unknown>): string {
  if (typeof json.output_text === "string") return json.output_text;
  const out: string[] = [];
  const output = json.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const c of content) {
        const t = (c as { text?: unknown }).text;
        if (typeof t === "string") out.push(t);
      }
    }
  }
  return out.join("");
}

/**
 * JSON で返させる。
 *
 * ★ モデルは前後に説明やコードブロックを付けてくることがあるので、
 *   最初の `{...}` だけを拾う。
 */
export async function askAIForJson<T>(req: AskAIRequest): Promise<T> {
  const text = await askAI(req);
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) {
    throw new AIError("AI の返事を JSON として読めませんでした", undefined, undefined, text.slice(0, 300));
  }
  try {
    return JSON.parse(m[0]) as T;
  } catch (e) {
    throw new AIError("AI の返事が JSON として壊れていました", undefined, String(e), m[0].slice(0, 300));
  }
}
