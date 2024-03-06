import { DartCLIClient } from "./dart-cli-client";

export class Task {
    private taskId: number;
    private dartClient: DartCLIClient;
    private handlers: Map<string, (message: any) => void> = new Map();
  
    constructor(dartClient: DartCLIClient, taskId: number) {
      this.dartClient = dartClient;
      this.taskId = taskId;
    }
  
    public onProcessStep(kind: string, handler: (message: any) => void) {
      const eventName = `process_step_${kind}_${this.taskId}`;
      this.handlers.set(eventName, handler);
      this.dartClient.eventEmitter.on(eventName, handler);
    }
  
    public async run(params: any = {}): Promise<any> {
      try {
        const result = await this.dartClient.processTask(this.taskId, params);
        // Task completed successfully
        this.dispose();
        return result;
      } catch (error) {
        // Task encountered an error
        this.dispose();
        throw error;
      }
    }
  
    private dispose() {
      // Remove all event listeners associated with this task
      this.handlers.forEach((handler, eventName) => {
        this.dartClient.eventEmitter.removeListener(eventName, handler);
      });
    }
  }