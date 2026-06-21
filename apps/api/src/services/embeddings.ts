import OpenAI from "openai";
import { config } from "../config.js";

const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(text: string) {
  if (config.OPENAI_MOCK_RESPONSES || !config.OPENAI_API_KEY) {
    return mockEmbedding(text);
  }

  const client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const response = await client.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: text
  });

  return response.data[0].embedding;
}

export function toVectorLiteral(embedding: number[]) {
  return `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

function mockEmbedding(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);

  for (let index = 0; index < text.length; index += 1) {
    const bucket = (text.charCodeAt(index) * (index + 1)) % EMBEDDING_DIMENSIONS;
    vector[bucket] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}
