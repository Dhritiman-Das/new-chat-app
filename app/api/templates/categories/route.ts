import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { getTemplateCategories } from "@/lib/queries/templates";

export async function GET() {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get categories
    const categoriesResponse = await getTemplateCategories();

    if (!categoriesResponse.success) {
      return NextResponse.json(
        { success: false, error: categoriesResponse.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categoriesResponse.data,
    });
  } catch (error) {
    console.error("Error in template categories API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
