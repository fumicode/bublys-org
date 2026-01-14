import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface GenerateCodeRequest {
  prompt: string;
  availableObjects: Array<{
    name: string;
    type: string;
    methods: string[];
    currentValue?: unknown;
  }>;
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const body: GenerateCodeRequest = await request.json();
  const { prompt, availableObjects } = body;

  const systemPrompt = `あなたはユーザーの自然言語の指示をJavaScriptコードに変換するアシスタントです。

以下のオブジェクトが利用可能です:
${availableObjects
  .map(
    (obj) =>
      `- ${obj.name} (${obj.type}): メソッド: ${obj.methods.join(', ')}${obj.currentValue !== undefined ? ` | 現在の値: ${JSON.stringify(obj.currentValue)}` : ''}`
  )
  .join('\n')}

ルール:
1. JavaScriptの実行コードのみを出力してください（説明不要）
2. 利用可能なオブジェクトとメソッドのみを使用してください
3. 複数の操作は ; で区切ってください
4. コードブロックやマークダウンは使わないでください

例:
ユーザー: "カウンターを3回増やして"
出力: counter_123.countUp(); counter_123.countUp(); counter_123.countUp()

ユーザー: "全部のカウンターを1増やして"
出力: counter_1.countUp(); counter_2.countUp()`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedCode = data.choices[0]?.message?.content?.trim() || '';

    return NextResponse.json({ code: generatedCode });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate code: ${error}` },
      { status: 500 }
    );
  }
}
