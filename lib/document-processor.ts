/**
 * This file contains implementations of document processing functions
 * for extracting text content from various file types.
 */

// Using dynamic import for pdf-parse to avoid the test file loading issue
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";

/**
 * Process a PDF file and extract its text content
 */
export async function processPdf(buffer: ArrayBuffer): Promise<string> {
  try {
    // Convert ArrayBuffer to Buffer for pdf-parse
    const data = await pdfParse(Buffer.from(buffer));
    return data.text || ""; // Return empty string if text is undefined
  } catch (error) {
    console.error("Error processing PDF:", error);
    throw new Error(
      `Failed to process PDF file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Process a text file and extract its content
 */
export async function processTextFile(buffer: ArrayBuffer): Promise<string> {
  try {
    // Convert the buffer to a string
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
  } catch (error) {
    console.error("Error processing text file:", error);
    throw new Error(
      `Failed to process text file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Process a Word document and extract its text content
 */
export async function processWordDocument(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    // Use mammoth to extract text from the Word document
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || ""; // Return empty string if value is undefined
  } catch (error) {
    console.error("Error processing Word document:", error);
    throw new Error(
      `Failed to process Word document: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Process an Excel file and extract its text content
 */
export async function processExcelFile(buffer: ArrayBuffer): Promise<string> {
  try {
    // Use XLSX to read the Excel file
    const workbook = XLSX.read(buffer, { type: "array" });
    let result = "";

    // Process each sheet
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      // Convert to JSON with options
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: null, // Set default value for empty cells to null
        raw: false, // This ensures dates and numbers are parsed
      });

      // Add the sheet name as a header and stringify the JSON
      result += `Sheet: ${sheetName}\n${JSON.stringify(jsonData, null, 2)}\n\n`;
    });

    return result;
  } catch (error) {
    console.error("Error processing Excel file:", error);
    throw new Error(
      `Failed to process Excel file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Process a file based on its MIME type
 */
export async function processFile(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ content: string; characterCount: number }> {
  let content: string;

  switch (mimeType) {
    case "application/pdf":
      content = await processPdf(buffer);
      break;
    case "text/plain":
      content = await processTextFile(buffer);
      break;
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      content = await processWordDocument(buffer);
      break;
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      content = await processExcelFile(buffer);
      break;
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }

  // Calculate character count
  const characterCount = content.length;

  return { content, characterCount };
}
