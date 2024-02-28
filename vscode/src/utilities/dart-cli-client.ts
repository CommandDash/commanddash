import * as child_process from 'child_process';
import { EventEmitter } from 'events';

export class DartCLIClient {
  private proc: child_process.ChildProcessWithoutNullStreams | undefined;
  private requestId = 0;
  private eventEmitter = new EventEmitter();

  constructor() {
    this.connect();
  }

  public connect() {
    // this.proc = child_process.spawn('path-to-exe/commanddash.exe', ['process']);
    this.proc = child_process.spawn('dart', ['run', 'path-to-cli/commanddash.dart', 'process']);

    this.proc.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString());
      const { id, method, params } = message;

      if (method==='result') {
        this.eventEmitter.emit(`result_${id}`, params);
      } else if (method==='error'){
        this.eventEmitter.emit(`error_${id}`, params);
      } else if (method==='get_additional_data') {
        // Handle additional data requirements from Dart CLI (e.g. get additional data)
        this.eventEmitter.emit(`get_additional_data_${params.kind}`, message);
      }
    });

    this.proc.stderr.on('data', (data) => {
      // TODO: Emit another error event (inability to find a task ID here)
      /// Pay high focus here since this could lead to ambigious and untracked failures
      /// The CLI should handle every error and report it with it's task ID.
      console.error('stderr -' + data.toString());
    });
  }
  
  public onAdditionalDataRequest(kind: string, handler: (message: any) => void): void {
    this.eventEmitter.on(`get_additional_data_${kind}`, handler);
  }
  
  /// Send required additional data to the CLI. 
  public sendAdditionalData(id: number, params: any): void {
    // Ensure to use the same 'id' to maintain consistency of the JSON-RPC protocol
    const method = 'additional_data';
    this.proc?.stdin.write(JSON.stringify({ id, method, params }) + "\n");
  }

  private send(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Increment requestId for each new request
      const id = ++this.requestId;
      
      const requestPayload = JSON.stringify({ ...request, id });
      
      // Listen for a response to this specific request
      this.eventEmitter.once(`result_${id}`, (response) => {
        resolve(response);
      });

      this.eventEmitter.once(`error_${id}`, (response) => {
          reject(response);
      });

      // Send the request to the Dart CLI
      this.proc?.stdin.write(requestPayload + "\n");
    });
  }

  // Public method to utilize from extension, for making requests to Dart CLI. Complete example:
  /*```typescript
  const client = new DartCLIClient();

    // Handle all additional requirements here. always define before initating the task.
    client.onAdditionalDataRequest('random_data_kind', (message) => {
        /// any complex interaction to come up with response data.
        const additionalData = { value: "unique_value_2" };
    
        // Respond with the additional data
        client.sendAdditionalData(message.id, additionalData);
    
        // Optionally, remove the listener if it's a one-time request
        // client.eventEmitter.removeListener(`get_additional_data_already_cached_files`, handler);
      });
    
    /// call the CLI method and handle response/error
    try {
        const response = await client.processTask({ kind: "random_task", data: {current_embeddings: {}} });
        console.log("Processing completed: ", response);
    } catch (error) {
        console.error("Processing error: ", error);
    }
  ```*/
  public processTask(params: any = {}): Promise<any> {
    const method: string = 'task_start';
    const request = { method, params };
    return this.send(request);
  }
}