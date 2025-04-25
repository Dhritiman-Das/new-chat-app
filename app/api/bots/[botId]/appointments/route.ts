import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

interface Params {
  params: Promise<{ botId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { botId } = await params;

    // Get pagination params from URL
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Count total appointments for pagination
    const totalAppointments = await prisma.appointment.count({
      where: { botId },
    });

    // Get appointments for the bot with pagination
    const appointments = await prisma.appointment.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        appointments,
        totalCount: totalAppointments,
        page,
        totalPages: Math.ceil(totalAppointments / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch appointments",
      },
      { status: 500 }
    );
  }
}
