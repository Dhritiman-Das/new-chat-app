import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

interface Params {
  params: Promise<{ toolId: string }>;
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    // Get the authenticated user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { message: "User not authenticated" } },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const { toolId } = await params;

    if (!provider) {
      return NextResponse.json(
        { success: false, error: { message: "Provider is required" } },
        { status: 400 }
      );
    }

    // Find the credential
    const credential = await prisma.toolCredential.findFirst({
      where: {
        userId,
        toolId,
        provider,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, error: { message: "Credential not found" } },
        { status: 404 }
      );
    }

    // Delete the credential
    await prisma.toolCredential.delete({
      where: {
        id: credential.id,
      },
    });

    // Update any related bot tools to remove the credential ID
    await prisma.botTool.updateMany({
      where: {
        toolCredentialId: credential.id,
      },
      data: {
        toolCredentialId: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to delete credential",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
