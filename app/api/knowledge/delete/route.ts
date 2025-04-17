import { NextRequest, NextResponse } from "next/server";
import { deleteFileAndVectors } from "@/lib/knowledge-service";
import { requireAuth } from "@/utils/auth";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    await requireAuth();

    const data = await request.json();
    const { fileId, botId, knowledgeBaseId } = data;

    if (!fileId || !botId || !knowledgeBaseId) {
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

    // Delete the file and its vectors
    const result = await deleteFileAndVectors(fileId, botId, knowledgeBaseId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: { success: true },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DELETION_ERROR",
            message: result.error || "Failed to delete file",
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error in knowledge file deletion:", error);
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
