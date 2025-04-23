import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export async function DELETE(request: Request) {
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

    if (!provider) {
      return NextResponse.json(
        { success: false, error: { message: "Provider is required" } },
        { status: 400 }
      );
    }

    // Find the credential
    const credential = await prisma.credential.findFirst({
      where: {
        userId,
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
    await prisma.credential.delete({
      where: {
        id: credential.id,
      },
    });

    // Update any related bot tools to remove the credential ID
    await prisma.botTool.updateMany({
      where: {
        credentialId: credential.id,
      },
      data: {
        credentialId: null,
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
