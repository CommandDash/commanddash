import * as child_process from 'child_process';
import { EventEmitter } from 'events';
import { Task } from './task';
import { join } from 'path';
import { chmod, chmodSync, existsSync, renameSync, unlink } from 'fs';
import { downloadFile, makeHttpRequest } from '../../repository/http-utils';
import { AxiosRequestConfig } from 'axios';
import * as vscode from 'vscode';
import path = require('path');
import * as os from 'os';
import { promisify } from 'util';
import { ExtensionVersionManager } from '../update-check';
import { logError, logEvent } from '../telemetry-reporter';
import { error } from 'console';

async function setupExecutable(clientVersion: string, executablePath: string, executableVersion: string | undefined, onProgress: (progress: number) => void) {
  const platform = os.platform();
  const slug = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'macos' : platform === 'linux' ? 'linux' : 'unsupported';
  const config: AxiosRequestConfig = {
    method: 'get',
    url: `https://api.commanddash.dev/executable/get-update/${clientVersion}/${slug}`
  };
  let response = await makeHttpRequest<{ url: string, version: string }>(config);
  if (executableVersion && compareVersions(response['version'], executableVersion) <= 0) {
    console.log('Executable is already up to date.');
    return;
  }
  await downloadFile(response['url'], executablePath, onProgress);
}

export async function deleteExecutable(executablePath: string): Promise<void> {
  return new Promise((resolve, _) => {
    unlink(executablePath, (_) => {
      resolve();
    });
  });
}

function compareVersions(v1: string, v2: string) {
  const v1Arr = v1.split('.');
  const v2Arr = v2.split('.');
  for (let i = 0; i < Math.max(v1Arr.length, v2Arr.length); i++) {
    const n1 = parseInt(v1Arr[i] || '0', 10);
    const n2 = parseInt(v2Arr[i] || '0', 10);
    if (n1 > n2) { return 1; }
    if (n2 > n1) { return -1; }
  }
  return 0;
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

  public executableExists(): boolean {
    if (existsSync(this.executablePath)) {
      return true;
    }
    return false;
  }

  public static init(context: vscode.ExtensionContext): DartCLIClient {
    const platform = os.platform();
    const globalStoragePath = context.globalStorageUri;
    const fileName = platform === 'win32' ? 'commanddash.exe' : 'commanddash';
    const executablePath = join(globalStoragePath.fsPath, fileName);;
    DartCLIClient.instance = new DartCLIClient(executablePath);
    return DartCLIClient.instance;
  }

  public async executableVersion(): Promise<string> {
    if (!this.executableExists()) {
       throw Error('Request engine version, but engine is not available');
    }
    const { stdout, stderr } = await exec(`${this.executablePath.replace(/ /g, '\\ ')} version`);
    if (stderr) {
      throw Error('Failed to fetch the engine version');
    }
    return stdout?.toString().replace(/\n$/, '');
  }

  public async installExecutable(onProgress: (progress: number) => void) {
    await setupExecutable(ExtensionVersionManager.getExtensionVersion(), this.executablePath, undefined, onProgress);
  }

  // Install the updated executable in the background which will be kicked off on next extension activation.
  public async backgroundUpdateExecutable(): Promise<void> {
    let currentVersion = await this.executableVersion();
    await setupExecutable(ExtensionVersionManager.getExtensionVersion(), this.executablePath, currentVersion, () => { });
    if (compareVersions(currentVersion, '0.1.3')<0) {
      // Reconnect the engine if the current executable is less than the minimum required one.
      // TODO: [show the onboarding screen itself if the engine needs to be force updated]
      this.connect();
    }
  }

  public async deleteExecutable(): Promise<void> {
    await deleteExecutable(this.executablePath);
  }

  private renameTempToExecutable(tempFilePath: string) {
    renameSync(tempFilePath, this.executablePath);
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      // Downloaded file is required to be coverted to an executable.
      chmodSync(this.executablePath, '755');
    }
  }

  public connect() {
    // Verify the presence of the temporary file, indicating a downloaded update during the last IDE session. 
    // Proceed with updating the executable if applicable.
    const tempFilePath = `${this.executablePath}.pre-downloaded`;

    if (existsSync(tempFilePath)) {
      this.renameTempToExecutable(tempFilePath);
    }

    // this.proc = child_process.spawn(this.executablePath, ['process']);
    this.proc = child_process.spawn('dart', ['run', '/Users/fisclouds/Documents/commanddash/commanddash/bin/commanddash.dart', 'process']);

    let buffer = '';

    this.proc.stdout.on('data', (data) => {
      buffer += data.toString();

      let incoming = buffer.split(/\r?\n/);
      try {
        // verifies if the last message is a complete JSON
        JSON.parse(incoming[incoming.length - 1]);
        buffer = '';
      } catch {
        /// [rare case] handles if an incomplete JSON is received in received.
        buffer = incoming.pop() ?? '';
      }

      incoming = incoming.filter(m => m); // remove any empty strings
      for (const incomingMessage of incoming) {
        const message = JSON.parse(incomingMessage);
        const { id, method, params } = message;

        if (method === 'result') {
          this.eventEmitter.emit(`result_${id}`, params);
        } else if (method === 'error') {
          this.eventEmitter.emit(`error_${id}`, params);
        } else if (method === 'step') {

          // Validate if a handler is available to process the fetch step request.
          if (!this.eventEmitter.eventNames().includes(`step_${params.kind}_${id}`)) {
            console.log(`No handler found for fetch: step_${params.kind}_${id}`);
            // Inform CLI that there was no available handler to proess it's request
            this.sendStepResponse(message.id, message.params['kind'], { 'result': 'error', 'message': `Step kind: ${message.params['kind']} is missing a handler.` }, true);
          }

          // Handle task specific process requests from Dart CLI (e.g. get additional data)
          this.eventEmitter.emit(`step_${params.kind}_${id}`, message);

        } else if (method === 'operation') {

          // Validate if a handler is available to process the fetch operation request.
          if (!this.eventEmitter.eventNames().includes(`operation_${params.kind}`)) {
            // Inform CLI that there was no available handler to proess it's request
            console.log(`No handler found for fetch: operation_${params.kind}`);
            this.sendOperationResponse(message.params['kind'], { 'result': 'error', 'message': `Process Operation kind: ${message.params['kind']} is missing a handler.` });
          }

          // Handle task independent process requests from Dart CLI (e.g. get additional data)
          this.eventEmitter.emit(`operation_${params.kind}`, message);

        } if (method === 'log') {
          console.log(params);
        } if (method === 'debug_message') {
          console.log('debug_message: ' + JSON.stringify(params));
        }
      }

    });

    this.proc.stderr.on('data', (data) => {
      /// Failures from CLI that couldn't be mapped to a specific task.
      this.eventEmitter.emit('global_error', data.toString());
      console.error('stderr -' + data.toString());
    });

    this.proc.on('exit', (code) => {
      console.log(`Child process exited with code ${code}`);
      this.eventEmitter.removeAllListeners();
      this.connect(); // Reconnect if CLI exited due to unhandled failures.
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
  public sendOperationResponse(message: any, response: any, error: boolean = false): void {
    // Ensure to use the same 'id' to maintain consistency of the JSON-RPC protocol
    const method = 'operation_response';
    let data = { 'result': error ? 'error' : 'success', ...response };
    console.log(JSON.stringify({ method, kind: message.params['kind'], data }));
    this.proc?.stdin.write(JSON.stringify({ method, kind: message.params['kind'], data }) + "\n");
  }

  /// TODO: Warn user about a global error 
  public onGlobalError(handler: (error: string) => void) {
    this.eventEmitter.on('global_error', handler);
  }
  /// Send required additional data to the CLI. 
  public sendStepResponse(id: number, kind: string, response: any, error: boolean = false): void {
    // Ensure to use the same 'id' to maintain consistency of the JSON-RPC protocol
    const method = 'step_response';
    let data = { 'result': error ? 'error' : 'success', ...response };
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
        try {
          const myError = new Error(response['message']);
          myError.stack = response['data']?.['stack'];
          logError('server_error', myError);
        } catch (e) {
          console.log('Unable to send server error: ' + e);
        }
        reject(Error(response['message']));
      });

      console.log(requestPayload);
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
export async function testTaskWithSideOperation() {
  const client = DartCLIClient.getInstance();
  client.onProcessOperation('operation_data_kind', (message) => {
    const operationData = { value: "unique_value" };
    client.sendOperationResponse(message, operationData);
  });
  const task = client.newTask();

  try {
    /// Request the client to process the task and handle result or error
    const response = await task.run({ kind: "random_task_with_side_operation", data: { 'success': true } });
    console.log("Processing completed: ", response);
  } catch (error) {
    console.error("Processing error: ", error);
  }
}


/// To be used for quick understanding of the integration with the CLI. Move to the test suite later.
/// [add it to extension.ts activate and run the extension]
export async function testTaskWithSteps() {
  const client = DartCLIClient.getInstance();
  const task = client.newTask();
  // Handle client side steps during task processing. 
  task.onProcessStep('step_data_kind', async (message) => {
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

  task.onProcessStep('append_to_chat', async (message) => {
    console.log(`append to chat:\n${message}`);
    task.sendStepResponse(message, {});
  });
  task.onProcessStep('loader_update', async (message) => {
    console.log('Received loader of kind: ' + message['kind']);
    // message['kind']; // ['loader','message', 'message_with_files_list']
    // message['data']; // data depending upon kind.
    console.log(`${message}`);
    task.sendStepResponse(message, {});
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

export async function testGlobalErrorReporting() {
  const client = DartCLIClient.getInstance();
  client.onGlobalError((error) => {

    vscode.window.showInformationMessage('Error processing an open task. Please consider closing existing tasks or restart IDE if there is trouble using CommandDash', {
      detail: error
    });
    console.log(error);
  });
  const task = client.newTask();

  try {
    /// Request the client to process the task and handle result or error
    const response = await task.run({ kind: "random_task_global_error", data: { 'success': true } });
    console.log("Processing completed: ", response);
  } catch (error) {
    console.error("Processing error: ", error);
  }
}

