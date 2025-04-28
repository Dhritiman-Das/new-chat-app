import { NextResponse } from "next/server";
import { getUserTemplates } from "@/lib/queries/templates";
import { getSession } from "@/utils/auth";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user ID
    const userId = session.user.id;

    // Get search query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    // Get user templates
    const templatesResponse = await getUserTemplates(userId, search);

    if (!templatesResponse.success) {
      return NextResponse.json(
        { success: false, error: templatesResponse.error },
        { status: 500 }
      );
    }

    // Filter by category if specified
    let templates = templatesResponse.data;
    if (category) {
      templates = templates?.filter((template) =>
        template.categories.some((cat) => cat.slug === category)
      );
    }

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Error in user templates API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
