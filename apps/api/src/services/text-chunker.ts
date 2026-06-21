export type TextChunk = {
  content: string;
  tokenCount: number;
  chunkIndex: number;
};

export function chunkText(text: string, targetTokens = 500, overlapTokens = 75): TextChunk[] {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (!words.length) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const step = Math.max(1, targetTokens - overlapTokens);

  for (let start = 0; start < words.length; start += step) {
    const selected = words.slice(start, start + targetTokens);
    chunks.push({
      content: selected.join(" "),
      tokenCount: selected.length,
      chunkIndex: chunks.length
    });

    if (start + targetTokens >= words.length) {
      break;
    }
  }

  return chunks;
}
