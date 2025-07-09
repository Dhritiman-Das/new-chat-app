export interface ScheduleTask {
  taskId: string;
  delay: string | Date; // e.g., "1h", "30m", "2d" or specific Date
  payload: Record<string, unknown>;
  metadata?: ScheduleMetadata;
}

export interface ScheduleMetadata {
  contactId?: string;
  locationId?: string;
  provider?: string; // e.g., "gohighlevel", "hubspot", "salesforce"
  triggerType?: "no_show" | "unresponsive_message" | "follow_up";
  situationId?: string; // For follow_up type, identifies which situation
  [key: string]: unknown;
}

export interface ScheduleInfo {
  scheduleId: string;
  taskId: string;
  triggerHandle: string;
  scheduledAt: string; // ISO string when stored in Redis
  metadata?: ScheduleMetadata;
  contactId?: string;
  provider?: string;
  triggerType?: "no_show" | "unresponsive_message" | "follow_up";
  cancelled: boolean;
}

export interface ScheduledTaskResult {
  scheduleId: string;
  scheduledAt: Date;
  taskId: string;
  metadata?: ScheduleMetadata;
}

export interface CancelScheduleParams {
  scheduleId?: string;
  contactId?: string;
  provider?: string; // e.g., "gohighlevel", "hubspot", "salesforce"
  triggerType?: "no_show" | "unresponsive_message" | "follow_up";
  situationId?: string; // For follow_up type, identifies which situation to cancel
}

export abstract class SchedulerService {
  abstract scheduleTask(task: ScheduleTask): Promise<ScheduledTaskResult>;
  abstract cancelSchedule(params: CancelScheduleParams): Promise<boolean>;
  abstract listSchedules(
    contactId?: string,
    provider?: string
  ): Promise<ScheduledTaskResult[]>;
}

export type SchedulerProvider = "trigger.dev" | "node-cron" | "bull" | "agenda";
