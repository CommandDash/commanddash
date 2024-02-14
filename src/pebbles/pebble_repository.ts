/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import { extractDartCode } from '../utilities/code-processing';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import path = require('path');
import { promptGithubLogin } from '../extension'
import { makeAuthorizedHttpRequest, makeHttpRequest } from '../repository/http-utils';
import { logEvent } from '../utilities/telemetry-reporter';
import { GeminiRepository } from '../repository/gemini-repository';
import { SecretApiKeyManager } from '../utilities/secret-storage-manager';



async function getConfigs(context: vscode.ExtensionContext): Promise<Record<string, unknown>> {
    const access_token = context.globalState.get('access_token');
    const refresh_token = context.globalState.get('refresh_token');
    const config = vscode.workspace.getConfiguration('fluttergpt');
    var apiKey = await SecretApiKeyManager.instance.getApiKey();


    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "openai_key": apiKey,
        "project_name": await getProjectName(),
    };

}

//get project name from pubspec.yaml
async function getProjectName() {
    if (vscode.workspace.workspaceFolders === undefined) {
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


export async function savePebblePanel(geminiRepo: GeminiRepository, context: vscode.ExtensionContext): Promise<void> {
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

    let description = "";
    const ref = context.globalState.get('refresh_token');
    if (ref !== undefined) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating description for code",
            cancellable: false
        }, async (progress, token) => {
            progress.report({ increment: 20 });

            try {
                description = await geminiRepo.getCompletion([
                    {
                        role: "user",
                        parts: "Generate a 3 line short description for the following code in this format: A code to...:\n```dart\n" + selectedText + "\n```\n\nDescription:"
                    }
                ]);
                progress.report({ increment: 100 });
            } catch (error) {
                vscode.window.showErrorMessage("failed to generate description for code" + error);
            }
        });
    }


    const panel = vscode.window.createWebviewPanel(
        'pebblePanel',
        'Save Pebble Panel',
        vscode.ViewColumn.Beside,
        {}
    );
    panel.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extension.extensionUri, 'assets', 'pebbles')],
    };
    const apiJsUri = panel.webview.asWebviewUri(vscode.Uri.file(
        path.join(context.extensionPath, 'assets', 'pebbles', 'api.js')
    ));
    panel.webview.onDidReceiveMessage(
        async message => {
            switch (message.command) {
                case 'saveAccessToken':
                    context.globalState.update('access_token', message.access_token);
                    return;
                case 'savePebbleSuccess':
                    logEvent('pebble-saved', { 'type': 'pebbles' });
                    vscode.window.showInformationMessage("Pebble saved successfully");
                    panel.dispose();
                    return;
                case 'savePebbleError':
                    logEvent('pebble-save-error', { 'type': 'pebbles' });
                    vscode.window.showErrorMessage("Failed to save pebble");
                    return;
                case 'auth':
                    panel.dispose();
                    const refresh_token = context.globalState.get('refresh_token');
                    if (refresh_token) {
                        panel.webview.postMessage({
                            type: 'keys',
                            keys: await getConfigs(context),
                            env: envConfig
                        });
                    }
                    else {
                        promptGithubLogin(context);
                        vscode.window.showInformationMessage("Please login to use pebbles");
                    }
                    return;
                case 'login':
                    try {
                        logEvent('login-clicked', { 'from': 'save-pebble-panel' });
                        const url = process.env["HOST"]! + process.env["github_oauth"]!;
                        const github_oauth_url = await makeHttpRequest<{ github_oauth_url: string }>({ url: url });
                        vscode.env.openExternal(vscode.Uri.parse(github_oauth_url.github_oauth_url));
                    } catch (error) {
                        vscode.window.showErrorMessage('Error logging in to fluttergpt',);
                    }
                    return;

            }
        },
        undefined,
        context.subscriptions
    );
    let htmlPath = vscode.Uri.file(
        path.join(context.extensionPath, 'assets', 'pebbles', 'savePebblePanel.html')
    );
    const html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    //get access and refresh tokens from configs
    const access_token = context.globalState.get('access_token');
    const refresh_token = context.globalState.get('refresh_token');

    if (refresh_token === undefined) {
        panel.webview.html = fs.readFileSync(path.join(context.extensionPath, 'assets', 'pebbles', 'auth_page.html'), 'utf8');
        return;
    }


    let htmlWithScript = html.replace('%API_JS_URI%', apiJsUri.toString());
    htmlWithScript = htmlWithScript.replace('%HOST%', process.env["HOST"]!);
    htmlWithScript = htmlWithScript.replace('%DESCRIPTION%', description.toString());
    htmlWithScript = htmlWithScript.replace('%CODE%', selectedText.toString());
    htmlWithScript = htmlWithScript.replace('%CODE%', selectedText.toString());


    panel.webview.html = htmlWithScript;
    const envConfig = process.env;

    panel.webview.postMessage({
        type: 'keys',
        keys: await getConfigs(context),
        env: envConfig
    });
}

async function addPebbleUsage(
    pebbleId: string,
    searchQueryPk: string,
    customizationPrompt: string,
    projectName: string,
    context: vscode.ExtensionContext
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
    const response = await makeAuthorizedHttpRequest(config, context);
}