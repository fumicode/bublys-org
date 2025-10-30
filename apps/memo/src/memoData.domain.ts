export interface MemoData {
  lineDatas: LineData[];
}

export interface LineData {
  lineUUID: string;
  contents: InlineContent[];
}

export type InlineContent =
  | { type: 'text'; text: string }
  | { type: 'ref'; refUUID: string; displayText: string };

export function stringToContents(text: string): InlineContent[] {
  return [{ type: 'text', text: text }];
}

export function contentsToString(contents: InlineContent[]): string {
  return contents
    .map((content) => {
      if (content.type === 'text') {
        return content.text;
      } else {
        return content.displayText;
      }
    })
    .join('');
}

export function insertReference(
  contents: InlineContent[],
  startOffset: number,
  endOffset: number,
  refUUID: string
): InlineContent[] {
  const result: InlineContent[] = [];
  let currentOffset = 0;

  for (const content of contents) {
    const contentLength =
      // contentがテキストの場合
      content.type === 'text'
        ? content.text.length
        : // contentが参照の場合
          content.displayText.length;

    const contentStart = currentOffset;
    const contentEnd = currentOffset + contentLength;

    // このcontentが挿入範囲と重ならない場合
    if (contentEnd <= startOffset || contentStart >= endOffset) {
      result.push(content);
    }
    // このcontentが挿入範囲と重なる場合
    else {
      // 参照の挿入範囲が重なっているcontentがテキストの場合
      if (content.type === 'text') {
        const localStart = Math.max(0, startOffset - contentStart);
        const localEnd = Math.min(contentLength, endOffset - contentStart);

        // このcontent内の参照と重なっていない前部分のtextを切り出してpush
        if (localStart > 0) {
          result.push({
            type: 'text',
            text: content.text.slice(0, localStart),
          });
        }

        // 参照部分
        if (contentStart === startOffset && contentEnd === endOffset) {
          // このcontentの全体が範囲内
          result.push({
            type: 'ref',
            refUUID,
            displayText: content.text,
          });
        } else if (contentStart <= startOffset && contentEnd >= endOffset) {
          // このcontentの一部が範囲
          // localOffsetはstartOffset - contentStartなので
          // localOffsetが1以上の場合はすでに前部分がpushされている
          result.push({
            type: 'ref',
            refUUID,
            displayText: content.text.slice(localStart, localEnd),
          });
        }

        // 後部分
        if (localEnd < contentLength) {
          result.push({
            type: 'text',
            text: content.text.slice(localEnd),
          });
        }
      } else {
        // 既存の参照はそのまま保持（範囲外の場合のみ）
        if (contentStart < startOffset || contentEnd > endOffset) {
          result.push(content);
        }
      }
    }

    currentOffset = contentEnd;
  }

  return result;
}
