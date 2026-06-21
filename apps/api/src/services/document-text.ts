import mammoth from "mammoth";

export async function extractTextFromDocument(input: {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}) {
  const lowerName = input.filename.toLowerCase();

  if (input.mimetype === "application/pdf" || lowerName.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: input.buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    input.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    return result.value;
  }

  throw new Error("Only PDF and DOCX files are supported");
}
