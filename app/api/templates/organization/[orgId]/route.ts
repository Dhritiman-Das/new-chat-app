import { NextResponse } from "next/server";
import { getSession } from "@/utils/auth";
import { getOrganizationTemplates } from "@/lib/queries/templates";

interface Params {
  params: Promise<{ orgId: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get org ID from params
    const { orgId } = await params;

    // Get search query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;

    // Get organization templates
    const templatesResponse = await getOrganizationTemplates(orgId, search);

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
    console.error("Error in organization templates API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
