import { NextResponse } from "next/server";
import { getTemplateById } from "@/lib/queries/templates";
import { getSession } from "@/utils/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get template ID from params
    const { id } = await params;

    // Get template
    const templateResponse = await getTemplateById(id);

    if (!templateResponse.success) {
      return NextResponse.json(
        { success: false, error: templateResponse.error },
        { status: templateResponse.error === "Template not found" ? 404 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: templateResponse.data,
    });
  } catch (error) {
    console.error("Error in template API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
