import { SchedulerService, SchedulerProvider } from "./types";
import { TriggerDevSchedulerService } from "./providers/trigger-dev";

export class SchedulerServiceFactory {
  private static instance: SchedulerService;

  static getInstance(
    provider: SchedulerProvider = "trigger.dev"
  ): SchedulerService {
    if (!this.instance) {
      this.instance = this.createService(provider);
    }
    return this.instance;
  }

  private static createService(provider: SchedulerProvider): SchedulerService {
    switch (provider) {
      case "trigger.dev":
        return new TriggerDevSchedulerService();
      case "node-cron":
        throw new Error("Node-cron provider not implemented yet");
      case "bull":
        throw new Error("Bull provider not implemented yet");
      case "agenda":
        throw new Error("Agenda provider not implemented yet");
      default:
        throw new Error(`Unsupported scheduler provider: ${provider}`);
    }
  }
}

// Export convenience function
export function getSchedulerService(
  provider?: SchedulerProvider
): SchedulerService {
  return SchedulerServiceFactory.getInstance(provider);
}

// Export types for external use
export type {
  ScheduleTask,
  ScheduledTaskResult,
  CancelScheduleParams,
} from "./types";
