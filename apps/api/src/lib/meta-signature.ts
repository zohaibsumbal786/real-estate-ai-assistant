import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(input: {
  appSecret: string;
  rawBody: Buffer | undefined;
  signatureHeader: string | undefined;
}) {
  if (!input.rawBody || !input.signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", input.appSecret)
    .update(input.rawBody)
    .digest("hex");
  const provided = input.signatureHeader.slice("sha256=".length);

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");

  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}
