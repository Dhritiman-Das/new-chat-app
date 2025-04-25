"use server";

import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/utils/auth";
import { ActionResponse } from "@/app/actions/types";
import { Appointment } from "@/lib/generated/prisma";

interface AppointmentData {
  appointments: Array<Appointment>;
  totalPages: number;
  currentPage: number;
  total: number;
}

export async function getAppointments(
  botId: string,
  page = 1,
  limit = 10
): Promise<ActionResponse<AppointmentData>> {
  try {
    // Ensure user is authenticated and has access to this bot
    const user = await requireAuth();

    // Check if bot belongs to the user
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!bot) {
      return {
        success: false,
        error: {
          message: "Access denied",
          code: "UNAUTHORIZED",
        },
      };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get appointments with pagination
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { botId },
        orderBy: { startTime: "desc" },
        skip,
        take: limit,
      }),
      prisma.appointment.count({
        where: { botId },
      }),
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: {
        appointments,
        totalPages,
        currentPage: page,
        total,
      },
    };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return {
      success: false,
      error: {
        message: "Failed to fetch appointments",
        code: "INTERNAL_ERROR",
      },
    };
  }
}
