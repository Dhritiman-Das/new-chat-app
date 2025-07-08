import { tasks } from "@trigger.dev/sdk/v3";
import {
  SchedulerService,
  ScheduleTask,
  ScheduledTaskResult,
  CancelScheduleParams,
  ScheduleInfo,
} from "../types";
import { redis } from "@/lib/db/kv";

export class TriggerDevSchedulerService extends SchedulerService {
  private readonly REDIS_KEY_PREFIX = "trigger_schedule:";

  async scheduleTask(task: ScheduleTask): Promise<ScheduledTaskResult> {
    try {
      // Generate a unique schedule ID
      const scheduleId = `sched_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Trigger the task with delay
      const handle = await tasks.trigger(
        task.taskId,
        {
          ...task.payload,
          __scheduleId: scheduleId,
          __metadata: task.metadata,
        },
        { delay: task.delay }
      );

      const scheduledAt =
        typeof task.delay === "string"
          ? new Date(Date.now() + this.parseDelayToMs(task.delay))
          : task.delay;

      // Store schedule info in Redis for tracking
      const scheduleInfo: ScheduleInfo = {
        scheduleId,
        taskId: task.taskId,
        triggerHandle: handle.id,
        scheduledAt: scheduledAt.toISOString(),
        metadata: task.metadata,
        contactId: task.metadata?.contactId,
        provider: task.metadata?.provider,
        triggerType: task.metadata?.triggerType,
        cancelled: false, // Initialize as not cancelled
      };

      await redis.set(
        `${this.REDIS_KEY_PREFIX}${scheduleId}`,
        JSON.stringify(scheduleInfo),
        { ex: 7 * 24 * 60 * 60 } // Expire after 7 days
      );

      // Also store by contactId, provider, and triggerType for easy lookup
      if (
        task.metadata?.contactId &&
        task.metadata?.provider &&
        task.metadata?.triggerType
      ) {
        const contactKey = `${this.REDIS_KEY_PREFIX}contact:${task.metadata.contactId}:${task.metadata.provider}:${task.metadata.triggerType}`;
        await redis.set(contactKey, scheduleId, { ex: 7 * 24 * 60 * 60 });
      }

      return {
        scheduleId,
        scheduledAt,
        taskId: task.taskId,
        metadata: task.metadata,
      };
    } catch (error) {
      console.error("Error scheduling task with trigger.dev:", error);
      throw new Error("Failed to schedule task");
    }
  }

  async cancelSchedule(params: CancelScheduleParams): Promise<boolean> {
    try {
      let scheduleId = params.scheduleId;

      // If no scheduleId provided, try to find it by contactId, provider, and triggerType
      if (
        !scheduleId &&
        params.contactId &&
        params.provider &&
        params.triggerType
      ) {
        const contactKey = `${this.REDIS_KEY_PREFIX}contact:${params.contactId}:${params.provider}:${params.triggerType}`;
        const foundScheduleId = await redis.get(contactKey);
        if (foundScheduleId && typeof foundScheduleId === "string") {
          scheduleId = foundScheduleId;
          await redis.del(contactKey);
        }
      }

      if (!scheduleId) {
        return false;
      }

      // Get schedule info
      const scheduleInfoStr = await redis.get(
        `${this.REDIS_KEY_PREFIX}${scheduleId}`
      );
      if (!scheduleInfoStr || typeof scheduleInfoStr !== "string") {
        return false;
      }

      const scheduleInfo: ScheduleInfo = JSON.parse(scheduleInfoStr);

      // Note: trigger.dev doesn't have a direct cancel API for delayed tasks
      // The task will still run, but we'll mark it as cancelled in our metadata
      // The task implementation should check this status before executing
      scheduleInfo.cancelled = true;
      await redis.set(
        `${this.REDIS_KEY_PREFIX}${scheduleId}`,
        JSON.stringify(scheduleInfo),
        { ex: 7 * 24 * 60 * 60 }
      );

      return true;
    } catch (error) {
      console.error("Error cancelling schedule:", error);
      return false;
    }
  }

  async listSchedules(
    contactId?: string,
    provider?: string
  ): Promise<ScheduledTaskResult[]> {
    try {
      if (contactId) {
        // Get schedules for specific contact (optionally filtered by provider)
        const pattern = provider
          ? `${this.REDIS_KEY_PREFIX}contact:${contactId}:${provider}:*`
          : `${this.REDIS_KEY_PREFIX}contact:${contactId}:*`;
        const keys = await redis.keys(pattern);
        const scheduleIds = await Promise.all(
          keys.map(async (key) => await redis.get(key))
        );

        const schedules = await Promise.all(
          scheduleIds
            .filter((id): id is string => id !== null)
            .map(async (id) => {
              const scheduleInfoStr = await redis.get(
                `${this.REDIS_KEY_PREFIX}${id}`
              );
              return scheduleInfoStr && typeof scheduleInfoStr === "string"
                ? (JSON.parse(scheduleInfoStr) as ScheduleInfo)
                : null;
            })
        );

        return schedules
          .filter(
            (schedule): schedule is ScheduleInfo =>
              schedule !== null && schedule.cancelled !== true
          )
          .map((schedule) => ({
            scheduleId: schedule.scheduleId,
            scheduledAt: new Date(schedule.scheduledAt),
            taskId: schedule.taskId,
            metadata: schedule.metadata,
          }));
      }

      // Get all schedules (not recommended for production with many schedules)
      const pattern = `${this.REDIS_KEY_PREFIX}sched_*`;
      const keys = await redis.keys(pattern);
      const schedules = await Promise.all(
        keys.map(async (key) => {
          const scheduleInfoStr = await redis.get(key);
          return scheduleInfoStr && typeof scheduleInfoStr === "string"
            ? (JSON.parse(scheduleInfoStr) as ScheduleInfo)
            : null;
        })
      );

      return schedules
        .filter(
          (schedule): schedule is ScheduleInfo =>
            schedule !== null && schedule.cancelled !== true
        )
        .map((schedule) => ({
          scheduleId: schedule.scheduleId,
          scheduledAt: new Date(schedule.scheduledAt),
          taskId: schedule.taskId,
          metadata: schedule.metadata,
        }));
    } catch (error) {
      console.error("Error listing schedules:", error);
      return [];
    }
  }

  private parseDelayToMs(delay: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = delay.match(regex);

    if (!match) {
      throw new Error(
        `Invalid delay format: ${delay}. Use format like "1h", "30m", "2d"`
      );
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value * 1000;
      case "m":
        return value * 60 * 1000;
      case "h":
        return value * 60 * 60 * 1000;
      case "d":
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid delay unit: ${unit}`);
    }
  }

  // Helper method to check if a schedule is cancelled
  async isScheduleCancelled(scheduleId: string): Promise<boolean> {
    try {
      const scheduleInfoStr = await redis.get(
        `${this.REDIS_KEY_PREFIX}${scheduleId}`
      );

      if (!scheduleInfoStr) {
        return true; // Consider missing schedules as cancelled
      }

      const scheduleInfo = scheduleInfoStr as ScheduleInfo;
      return scheduleInfo.cancelled === true;
    } catch (error) {
      console.error("Error checking schedule status:", error);
      return true; // Assume cancelled on error to be safe
    }
  }
}
