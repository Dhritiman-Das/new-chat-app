import md5 from "md5";
import { Document } from "./types";
import { RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";

/**
 * Truncate a string to a maximum byte length
 * @param str - The string to truncate
 * @param maxBytes - The maximum byte length
 * @returns The truncated string
 */
export function truncateStringByBytes(str: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  if (bytes.length <= maxBytes) {
    return str;
  }

  // Binary search to find the maximum string length that fits within maxBytes
  let low = 0;
  let high = str.length;

  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    const slice = str.slice(0, mid);
    const byteLength = encoder.encode(slice).length;

    if (byteLength <= maxBytes) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return str.slice(0, low);
}

/**
 * Create a hash of a string
 * @param text - The string to hash
 * @param salt - Optional salt to add to the hash
 * @returns The MD5 hash of the string
 */
export function hashText(text: string, salt = ""): string {
  return md5(text + salt);
}

/**
 * Split a document into chunks
 * @param text - The text to split
 * @param chunkSize - The size of each chunk
 * @param chunkOverlap - The overlap between chunks
 * @returns A promise that resolves to an array of Document objects
 */
export async function splitDocument(
  text: string,
  chunkSize = 500,
  chunkOverlap = 20
): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitDocuments([
    {
      pageContent: text,
      metadata: {
        text: truncateStringByBytes(text, 36000),
      },
    },
  ]);
}

/**
 * Chunks an array into smaller arrays of a specified size
 * @param arr - The array to chunk
 * @param chunkSize - The size of each chunk
 * @returns An array of chunked arrays
 */
export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );
}
