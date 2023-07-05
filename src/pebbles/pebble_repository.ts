import * as vscode from 'vscode';
import { OpenAIRepository } from '../repository/openai-repository';
import { extractDartCode } from '../utilities/code-processing';
import * as fs from 'fs';
import * as yaml from 'js-yaml'; 
import path = require('path');
import {promptGithubLogin} from '../extension'
import { makeAuthorizedHttpRequest } from '../repository/http-utils';


export async function showPebblePanel(context:vscode.ExtensionContext,openAIRepo:OpenAIRepository): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
        'pebblePanel',
        'Pebble Panel',
        vscode.ViewColumn.Beside,
        {}
    );
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extension.extensionUri, 'src', 'pebbles')],
    };
    const apiJsUri = panel.webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, 'src', 'pebbles', 'api.js')
      ));
    panel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case 'customize':
                customizeCode(message.code,openAIRepo,context);
              return;
            case 'add':
                const data = message.code;
                copyCode(data.code,data.pebble_id,data.search_query_pk,data.customization_prompt,data.project_name,context);
              return;
            case 'saveAccessToken':
                context.globalState.update('access_token',message.access_token);
                return;
            case 'savePebbleSuccess':
                vscode.window.showInformationMessage("Pebble saved successfully");
                return;
            case 'savePebbleError':
                vscode.window.showErrorMessage(message.message);
                return;
          }
        },
        undefined,
        context.subscriptions
      );
    
      // read html file ./searchPebblePanel.html
        const html = fs.readFileSync(context.asAbsolutePath('./src/pebbles/searchPebblePanel.html'), 'utf8');
      
        var htmlWithScript = html.replace('%API_JS_URI%', apiJsUri.toString());
        htmlWithScript = htmlWithScript.replace('%%HOST%%', process.env["HOST"]!);
        panel.webview.html = htmlWithScript;

        //get access and refresh tokens from configs
        const access_token = context.globalState.get('access_token');
        const refresh_token = context.globalState.get<string>('refresh_token');
        panel.webview.html = htmlWithScript;
        const envConfig = process.env;
        
        panel.webview.postMessage({
            type:'keys',
            keys:await getConfigs(context),
            env: envConfig
        });
}

async function getConfigs(context:vscode.ExtensionContext):Promise<Record<string,unknown>>{
    const access_token = context.globalState.get('access_token');
    const refresh_token = context.globalState.get('refresh_token');
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');


    return {
        "access_token":access_token,
        "refresh_token":refresh_token,
        "openai_key":apiKey,
        "project_name": await getProjectName(),
    };
    
}

//get project name from pubspec.yaml
async function getProjectName(){
    if(vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(' No active workspace found');
        return;
      }
      
      const pubspecPath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/pubspec.yaml';
      type Pubspec = {
        dependencies: Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        dev_dependencies: Record<string, unknown>;
        name: string;
      };
      const pubspec = yaml.load(fs.readFileSync(pubspecPath, 'utf-8')) as Pubspec;

      return pubspec.name;

}



async function customizeCode(data: { code: string; pebble_id: string; search_query_pk: string; customization_prompt: string; project_name: string; },openAIRepo:OpenAIRepository,context:vscode.ExtensionContext){
    // show text field to ask for instructions
    // const instructions =await  vscode.window.showInputBox({ prompt: "Enter refactor instructions" });
    // if(!instructions){
    //     return;
    // }
    // data.customization_prompt=instructions;
    // send instructions to openAI
    let prompt = "Change the following code according to given instructions. Give out just the modified code. Avoid any text other than the code. Give out the code in a single codeblock.";
    prompt +="\n\n Code:\n```dart\n"+data.code+"\n```\n\nInstructions:\n"+data.customization_prompt+"\n\nModified Code:";
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Creating Code",
        cancellable: false
    }, async (progress) => {
        let progressPercentage = 0;
        let prevProgressPercentage = 0;
        const progressInterval = setInterval(() => {
            prevProgressPercentage = progressPercentage;
            progressPercentage = (progressPercentage + 10) % 100;
            const increment = progressPercentage - prevProgressPercentage;
            progress.report({ increment });
        }, 200);
        const result = await openAIRepo.getCompletion([{
            'role': 'user',
            'content': prompt
        }]);
        clearInterval(progressInterval);
        progress.report({ increment: 100 });

        const dartCode = extractDartCode(result);
        copyCode(dartCode,data.pebble_id,data.search_query_pk,data.customization_prompt,data.project_name,context);
    });
}

async function copyCode(code:string,
    pebble_id:string,
    search_query_pk:string,
    customization_prompt:string,
    project_name:string,
    context:vscode.ExtensionContext,
    ){
       
    vscode.env.clipboard.writeText(code);
    vscode.window.showInformationMessage("Code copied to clipboard");
    // show it in a new temporary editor which has a copy button
    const document = await vscode.workspace.openTextDocument({
        content: code,
        language: 'dart',
    });
    await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
        
    });
    addPebbleUsage(pebble_id,search_query_pk,customization_prompt,project_name,context);

}

export async function savePebblePanel(openAIRepo:OpenAIRepository,context: vscode.ExtensionContext): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) {
        vscode.window.showErrorMessage('Please open a file first.');
        return;
    }
    const selection = vscode.window.activeTextEditor?.selection;
    if (!selection) {
        vscode.window.showErrorMessage('Please select some text first.');
        return;
    }
    const selectedText = document.getText(selection);
 
    let description ="";
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Generating description for code",
        cancellable: false
    }, async (progress, token) => {
        progress.report({ increment:20 });

        try {
            description = await openAIRepo.getCompletion([
                {
                    role: "user",
                    content: "Generate a 3 line short description for the following code in this format: A code to...:\n```dart\n" + selectedText + "\n```\n\nDescription:"
                }
            ]);
            progress.report({increment:100});
        } catch (error) {
            vscode.window.showErrorMessage("failed to generate description for code"+error);
        }
    });
    

    const panel = vscode.window.createWebviewPanel(
        'pebblePanel',
        'Save Pebble Panel',
        vscode.ViewColumn.Beside,
        {}
    );
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extension.extensionUri, 'src', 'pebbles')],
    };
    const apiJsUri = panel.webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, 'src', 'pebbles', 'api.js')
      ));
    panel.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case 'saveAccessToken':
                context.globalState.update('access_token',message.access_token);
                return;
            case 'savePebbleSuccess':
                vscode.window.showInformationMessage("Pebble saved successfully");
                panel.dispose();
                return;
            case 'savePebbleError':
                vscode.window.showErrorMessage("Failed to save pebble");
                return;
            case 'auth':
                panel.dispose();
                const refresh_token = context.globalState.get('refresh_token');
                if(refresh_token){
                    panel.webview.postMessage({
                        type:'keys',
                        keys:await getConfigs(context),
                        env: envConfig
                    });
                }
                else{
                promptGithubLogin(context);
                vscode.window.showInformationMessage("Please login to use pebbles");
                }
                return;
            
          }
        },
        undefined,
        context.subscriptions
      );
    
        const html = fs.readFileSync(context.asAbsolutePath('./src/pebbles/savePebblePanel.html'), 'utf8');
        //get access and refresh tokens from configs
        const access_token = context.globalState.get('access_token');
        const refresh_token = context.globalState.get('refresh_token');
   
   
        let htmlWithScript = html.replace('%API_JS_URI%', apiJsUri.toString());
        htmlWithScript = htmlWithScript.replace('%HOST%', process.env["HOST"]!);
        htmlWithScript = htmlWithScript.replace('%DESCRIPTION%', description.toString());
        htmlWithScript = htmlWithScript.replace('%CODE%', selectedText.toString());
        htmlWithScript = htmlWithScript.replace('%CODE%', selectedText.toString());
    
    
        panel.webview.html = htmlWithScript;
        const envConfig = process.env;
        
        panel.webview.postMessage({
            type:'keys',
            keys:await getConfigs(context),
            env: envConfig
        });
}

async function addPebbleUsage(
    pebbleId: string,
    searchQueryPk: string,
    customizationPrompt: string,
    projectName: string,
    context:vscode.ExtensionContext
  ): Promise<any> {
    const params = new URLSearchParams({
      pebble_id: pebbleId,
      search_query_pk: searchQueryPk,
      customization_prompt: customizationPrompt,
      project_name: projectName
    }).toString();
    const config = {
        method: 'post',
        url: process.env["pebble_used"],
        data: params,
    }
    const response = await makeAuthorizedHttpRequest(config,context);
  }