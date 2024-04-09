import { DartCLIClient } from "./dart-cli-client";

export class Task {
  private taskId: number;
  private dartClient: DartCLIClient;
  private handlers: Map<string, (message: any) => void> = new Map();

  constructor(dartClient: DartCLIClient, taskId: number) {
    this.dartClient = dartClient;
    this.taskId = taskId;
  }

  public onProcessStep(kind: string, handler: (message: any) => Promise<void>) {
    const eventName = `step_${kind}_${this.taskId}`;
    this.handlers.set(eventName, handler);
    this.dartClient.eventEmitter.on(eventName, async (message) => {
      try {
        await handler(message);
      } catch (e) {
        // Inform CLI that client was unable to provide requested data
        this.sendStepResponse(message, { 'message': `Step kind: ${message.params['kind']} failed with error ${e}` });
      }
    });
  }

  public sendStepResponse(message: any, response: any, error: boolean = false): any {
    this.dartClient.sendStepResponse(message.id, message.params['kind'], response, error);
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

  public getTaskId(): number {
    return this.taskId;
  }
}