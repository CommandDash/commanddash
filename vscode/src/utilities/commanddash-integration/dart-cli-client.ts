import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import { Task } from './task';
import { join } from 'path';
import { chmod, existsSync } from 'fs';
import { downloadFile, makeHttpRequest } from '../../repository/http-utils';
import { AxiosRequestConfig } from 'axios';
import * as vscode from 'vscode';
import path = require('path');
import * as os from 'os';
import { promisify } from 'util';

export async function installExecutable(clientVersion: string, executablePath: string, onProgress: (progress: number) => void) {
  const platform = os.platform();
  const slug = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : platform === 'linux' ? 'linux' : 'unsupported';
  const config: AxiosRequestConfig = {
    method: 'get',
    url: `http://api.commanddash.dev/executable/get-update/${clientVersion}/${slug}`
  };
  let response = await makeHttpRequest<{ url: string, version: string }>(config);
  await downloadFile(response['url'], executablePath, onProgress);
}

const exec = promisify(require('node:child_process').exec);

export class DartCLIClient {
  private proc: child_process.ChildProcessWithoutNullStreams | undefined;
  private requestId = 0;
  public eventEmitter = new EventEmitter();
  private static instance: DartCLIClient;
  private executablePath: string;

  private constructor(executablePath: string) {
    this.executablePath = executablePath;
  }

  public static getInstance(): DartCLIClient {
    return DartCLIClient.instance;
  }

  public static init(context: vscode.ExtensionContext): DartCLIClient {
    const platform = os.platform();
    const globalStoragePath = context.globalStorageUri;
    const fileName = platform === 'win32' ? 'commanddash.exe' : 'commanddash';
    const executablePath = path.dirname(join(globalStoragePath.path, fileName));
    DartCLIClient.instance = new DartCLIClient(executablePath);
    return DartCLIClient.instance;
  }

  public async executableVersion(): Promise<string | undefined> {
    if (!existsSync(this.executablePath)) {
      return;
    }
    const { stdout, stderr } = await exec(`${this.executablePath} --version`);
    if (stderr) {
      return;
    }
    const version = stdout?.toString().match(/(\d+\.\d+\.\d+)/);
    return version ? version[1] : undefined;
  }

  public async installExecutable(onProgress: (progress: number) => void) {
    await installExecutable('0.0.1', this.executablePath, onProgress);
  }

  public async backgroundUpdateExecutable(): Promise<void> {}


  public connect() {
    this.proc = child_process.spawn(this.executablePath, ['process']);
    // this.proc = child_process.spawn('dart', ['run', 'path-to-file/commanddash.dart', 'process']);

    this.proc.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString());
      const { id, method, params } = message;

      if (method === 'result') {
        this.eventEmitter.emit(`result_${id}`, params);
      } else if (method === 'error') {
        this.eventEmitter.emit(`error_${id}`, params);
      } else if (method === 'step') {
        // Handle additional data requirements from Dart CLI (e.g. get additional data)
        this.eventEmitter.emit(`step_${params.kind}_${id}`, message);
      } else if (method === 'operation') {
        this.eventEmitter.emit(`operation_${params.kind}`, message);
      } if (method === 'log') {
        console.log(params);
      }
    });

    this.proc.stderr.on('data', (data) => {
      // TODO: Emit another error event (inability to find a task ID here)
      /// Pay high focus here since this could lead to ambigious and untracked failures
      /// The CLI should handle every error and report it with it's task ID.
      console.error('stderr -' + data.toString());
    });

    this.proc.on('error', (err) => {
      // Listens to the `error` event on the child process to catch spawning errors, such as the command not being found.
      // TODO: Show an error message on the UI
      console.error('Failed to start subprocess.', err);
    });

    this.proc.on('exit', (code) => {
      console.log(`Child process exited with code ${code}`);
      this.eventEmitter.removeAllListeners();
      // Perform other cleanup actions here
    });
  }
  /* For non-task related communication. Like refreshing access token.
  ```typescript
    const client = new DartCLIClient();
    client.onProcessOperation('operation_data_kind', (message)=>{
      const operationData = { value: "unique_value" };
      client.sendOperationResponse('operation_data_kind', operationData);
    });
    const task = client.newTask();

    try {
        /// Request the client to process the task and handle result or error
        const response = await task.run({ kind: "random_task_with_side_operation", data: {} });
        console.log("Processing completed: ", response);
    } catch (error) {
        console.error("Processing error: ", error);
    }
    ```*/
  public onProcessOperation(kind: string, handler: (message: any) => void) {
    const eventName = `operation_${kind}`;
    this.eventEmitter.on(eventName, handler);
  }

  /// Send required additional data to the CLI. 
  public sendOperationResponse(kind: string, data: any): void {
    // Ensure to use the same 'id' to maintain consistency of the JSON-RPC protocol
    const method = 'operation_response';
    console.log(JSON.stringify({ method, kind, data }));
    this.proc?.stdin.write(JSON.stringify({ method, kind, data }) + "\n");
  }

  /// Send required additional data to the CLI. 
  public sendStepResponse(id: number, kind: string, data: any): void {
    // Ensure to use the same 'id' to maintain consistency of the JSON-RPC protocol
    const method = 'step_response';
    this.proc?.stdin.write(JSON.stringify({ id, method, kind, data }) + "\n");
  }



  private send(request: any, id: number): Promise<any> {
    return new Promise((resolve, reject) => {
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


  public processTask(taskId: number, params: any = {}): Promise<any> {
    const method: string = 'task_start';
    const request = { method, params }; // Assuming the Dart CLI can handle clientId
    return this.send(request, taskId);
  }

  // Public method to create a new task, for making requests to Dart CLI. Complete example:
  /*```typescript
  const client = new DartCLIClient();
  const task = client.newTask();
  // Handle client side steps during task processing. 
  task.onProcessStep('step_data_kind', (message) => {
      /// any complex interaction to come up with response data.
      const additionalData = { value: "unique_value_2" };
  
      // Respond back to CLI in every case. Either with data if required or just a confirmation.
      client.sendStepResponse(message.id, 'step_data_kind', additionalData);
  
      // /// [Optional] Listeners are disposed on their own once the task is completed. But if some task is continued for entire lifecycle, we may disconnect the listeners if the one-time process step is handled.
      // client.eventEmitter.removeListener(`get_additional_data_already_cached_files`, handler);
      });

  try {
      /// Request the client to process the task and handle result or error
      const response = await task.run({ kind: "random_task_with_step", data: {current_embeddings: {}} });
      console.log("Processing completed: ", response);
  } catch (error) {
      console.error("Processing error: ", error);
  }
  ```*/
  public newTask(): Task {
    const taskId = ++this.requestId; // Use requestId or generate a unique ID some other way
    return new Task(this, taskId);
  }


  public disconnect() {
    if (this.proc) {
      this.proc.kill(); // Optionally send a more graceful shutdown command before this
    }
  }
}

/// To be used for quick understanding of the integration with the CLI. Move to the test suite later.
/// [add it to extension.ts activate and run the extension]
export async function testTaskWithSideOperation(context: vscode.ExtensionContext) {
  const client = DartCLIClient.getInstance();
  client.onProcessOperation('operation_data_kind', (message) => {
    const operationData = { value: "unique_value" };
    task.sendStepResponse(message, operationData);
  });
  const task = client.newTask();

  try {
    /// Request the client to process the task and handle result or error
    const response = await task.run({ kind: "random_task_with_side_operation", data: {} });
    console.log("Processing completed: ", response);
  } catch (error) {
    console.error("Processing error: ", error);
  }
}


/// To be used for quick understanding of the integration with the CLI. Move to the test suite later.
/// [add it to extension.ts activate and run the extension]
export async function testTaskWithSteps(context: vscode.ExtensionContext) {
  const client = DartCLIClient.getInstance();
  const task = client.newTask();
  // Handle client side steps during task processing. 
  task.onProcessStep('step_data_kind', (message) => {
    /// any complex interaction to come up with response data.
    const additionalData = { value: "unique_value" };

    // Respond back to CLI in every case. Either with data if required or just a confirmation.
    client.sendStepResponse(message.id, 'step_data_kind', additionalData);

    // /// [Optional] Listeners are disposed on their own once the task is completed. But if some task is continued for entire lifecycle, we may disconnect the listeners if the one-time process step is handled.
    // client.eventEmitter.removeListener(`get_additional_data_already_cached_files`, handler);
  });

  try {
    /// Request the client to process the task and handle result or error
    const response = await task.run({ kind: "random_task_with_step", data: { current_embeddings: {} } });
    console.log("Processing completed: ", response);
  } catch (error) {
    console.error("Processing error: ", error);
  }
}
/// There can't be multiple tasks messages in parallel
export async function handleAgents(context: vscode.ExtensionContext) {
  const client = DartCLIClient.getInstance();
  const task = client.newTask();

  task.onProcessStep('append_to_chat', (message) => {
    console.log(`append to chat:\n${message}`);
    task.sendStepResponse(message, { 'result': 'success' });
  });
  task.onProcessStep('loader_update', (message) => {
    console.log('Received loader of kind: ' + message['kind']);
    // message['kind']; // ['loader','message', 'message_with_files_list']
    // message['data']; // data depending upon kind.
    console.log(`${message}`);
    task.sendStepResponse(message, { 'result': 'success' });
  });
  try {
    /// Request the client to process the task and handle result or error
    const response = await task.run({
      kind: "agent-execute", data: {
        "authdetails": {
          "type": "gemini",
          "key": "AIzaSyCUgTsTlr_zgfM7eElSYC488j7msF2b948",
          "githubToken": ""
        },
        "inputs": [
          {
            "id": "736841542",
            "type": "string_input",
            "value":
              "Where do you think AI is heading in the field of programming? Give a short answer."
          }
        ],
        "outputs": [
          { "id": "90611917", "type": "default_output" }
        ],
        "steps": [
          {
            "type": "prompt_query",
            "query": "736841542",
            "post_process": { "type": "raw" },
            "output": "90611917"
          },
          {
            "type": "append_to_chat",
            "message": "<90611917>",
          }
        ]
      }
    });
    console.log("Processing completed: ", response);
  } catch (error) {
    console.error("Processing error: ", error);
  }

}