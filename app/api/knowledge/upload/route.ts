import { NextRequest, NextResponse } from "next/server";
import { processAndStoreFile } from "@/lib/knowledge-service";
import { requireAuth } from "@/utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth();

    // Parse the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const botId = formData.get("botId") as string;
    const orgId = formData.get("orgId") as string;
    const knowledgeBaseId = formData.get("knowledgeBaseId") as string;

    if (!file || !botId || !orgId || !knowledgeBaseId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED_FIELDS",
            message: "Missing required fields",
          },
        },
        { status: 400 }
      );
    }

    // Convert the file to an ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Process and store the file
    const result = await processAndStoreFile(
      {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        botId,
        orgId,
        knowledgeBaseId,
        content: "", // Will be extracted from the file buffer
      },
      fileBuffer
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          fileId: result.fileId,
          fileName: file.name,
          characterCount: result.characterCount,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PROCESSING_ERROR",
            message: result.error || "Failed to process file",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error in knowledge upload:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
