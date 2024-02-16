/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import path = require('path');
import { extractDartCode } from '../utilities/code-processing';
import { promptGithubLogin } from '../extension'
import { makeAuthorizedHttpRequest, makeHttpRequest } from '../repository/http-utils';
import TelemetryReporter from '@vscode/extension-telemetry';
import { logEvent } from '../utilities/telemetry-reporter';
import { get } from 'http';
import { GeminiRepository } from '../repository/gemini-repository';
import { SecretApiKeyManager } from '../utilities/secret-storage-manager';

export class PebblePanelViewProvider implements vscode.WebviewViewProvider {

    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionPath: vscode.Uri,
        private context: vscode.ExtensionContext,
        private geminiRepo: GeminiRepository
    ) { }

    public async refresh() {
        const refresh_token = this.context.globalState.get('refresh_token');
        if (refresh_token === undefined) {
            var authPageHtml = fs.readFileSync(path.join(this.context.extensionPath, 'assets', 'pebbles', 'auth_page.html'), 'utf8');
            this._view!.webview.html = authPageHtml;

        } else {
            const apiJsUri = this._view!.webview.asWebviewUri(vscode.Uri.file(
                path.join(this.context.extensionPath, 'assets', 'pebbles', 'api.js')
            ));
            const searchPanelHtml = fs.readFileSync(path.join(this.context.extensionPath, 'assets', 'pebbles', 'searchPebblePanel.html'), 'utf8');
            var htmlWithScript = searchPanelHtml.replace('%API_JS_URI%', apiJsUri.toString());
            htmlWithScript = htmlWithScript.replace('%HOST%', process.env["HOST"]!);
            this._view!.webview.html = htmlWithScript;
            console.log('resolveWebviewView done');
        }



        const envConfig = process.env;


        this._view!.webview.postMessage({
            type: 'keys',
            keys: await this.getConfigs(this.context),
            env: envConfig
        });
    }


    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        console.log('resolveWebviewView');
        this._view = webviewView;
        // log open pebble panel event with user details
        logEvent('openPebblePanel', { 'type': 'pebbles', "loggedIn": (this.context.globalState.get('refresh_token') !== undefined).toString() });

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionPath, 'assets', 'pebbles')
            ]
        };

        const apiJsUri = webviewView.webview.asWebviewUri(vscode.Uri.file(
            path.join(this.context.extensionPath, 'assets', 'pebbles', 'api.js')
        ));
        console.log(apiJsUri);
        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'customize':
                        this.customizeCode(message.code, this.geminiRepo, this.context);
                        return;
                    case 'add':
                        const data = message.code;
                        this.copyCode(data.code, data.pebble_id, data.search_query_pk, data.customization_prompt, data.project_name, this.context);
                        return;
                    case 'saveAccessToken':
                        this.context.globalState.update('access_token', message.access_token);
                        return;
                    case 'savePebbleSuccess':
                        vscode.window.showInformationMessage("Pebble saved successfully");
                        return;
                    case 'savePebbleError':
                        vscode.window.showErrorMessage(message.message);
                        return;
                    case 'login':
                        try {
                            logEvent('login-clicked', { "from": "pebble-panel" });
                            const url = process.env["HOST"]! + process.env["github_oauth"]!;
                            const github_oauth_url = await makeHttpRequest<{ github_oauth_url: string }>({ url: url });
                            vscode.env.openExternal(vscode.Uri.parse(github_oauth_url.github_oauth_url));
                        } catch (error) {
                            vscode.window.showErrorMessage('Error logging in to fluttergpt',);
                        }
                        return;
                    case 'openGithub':
                        vscode.env.openExternal(vscode.Uri.parse("https://www.github.com/" + message.publisher));
                        return;
                    case 'getKeys':
                        this._view!.webview.postMessage({
                            type: 'keys',
                            keys: await this.getConfigs(this.context),
                            env: process.env
                        });
                        return;
                    case 'logout':
                        this.context.globalState.update('refresh_token', undefined);
                        this.context.globalState.update('access_token', undefined);
                        this.refresh();
                }
            },
            undefined,
            this.context.subscriptions
        );
        var projectName;
        try {
            projectName = await this.getProjectName();
        } catch (error) {

        }
        const refresh_token = this.context.globalState.get('refresh_token');
        if (refresh_token === undefined) {
            var authPageHtml = fs.readFileSync(path.join(this.context.extensionPath, 'assets', 'pebbles', 'auth_page.html'), 'utf8');
            webviewView.webview.html = authPageHtml;

        } else {
            if (projectName === undefined) {
                // show not a flutter project in html
                var notFlutterProjectHtml = `<html>
                <body>
                <h1>Not a Flutter Project</h1>
                    <p>Pebbles only works with Flutter projects. Please open a Flutter project to use Pebbles.</p>
                    </body>
                    </html>`;
                webviewView.webview.html = notFlutterProjectHtml;
            }
            else {
                const searchPanelHtml = fs.readFileSync(path.join(this.context.extensionPath, 'assets', 'pebbles', 'searchPebblePanel.html'), 'utf8');
                var htmlWithScript = searchPanelHtml.replace('%API_JS_URI%', apiJsUri.toString());
                htmlWithScript = htmlWithScript.replace('%HOST%', process.env["HOST"]!);
                webviewView.webview.html = htmlWithScript;
                console.log('resolveWebviewView done');
            }

        }



        const envConfig = process.env;

        if (projectName !== undefined) {
            this._view.webview.postMessage({
                type: 'keys',
                keys: await this.getConfigs(this.context),
                env: envConfig
            });
        }
        this._view = webviewView;
    }

    public async getConfigs(context: vscode.ExtensionContext): Promise<Record<string, unknown>> {
        const access_token = context.globalState.get('access_token');
        const refresh_token = context.globalState.get('refresh_token');
        
        var apiKey = await SecretApiKeyManager.instance.getApiKey();


        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "openai_key": apiKey,
            "project_name": await this.getProjectName(),
        };

    }

    //get project name from pubspec.yaml
    public async getProjectName() {
        if (vscode.workspace.workspaceFolders === undefined) {
            vscode.window.showErrorMessage(' No active workspace found');
            return;
        }

        const pubspecPath = vscode.workspace.workspaceFolders[0].uri.fsPath + '/pubspec.yaml';
        if (!fs.existsSync(pubspecPath)) {
            throw new Error('No pubspec.yaml found');
        }
        type Pubspec = {
            dependencies: Record<string, unknown>;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            dev_dependencies: Record<string, unknown>;
            name: string;
        };
        const pubspec = yaml.load(fs.readFileSync(pubspecPath, 'utf-8')) as Pubspec;

        return pubspec.name;

    }



    public async customizeCode(data: { code: string; pebble_id: string; search_query_pk: string; customization_prompt: string; project_name: string; }, openAIRepo: GeminiRepository, context: vscode.ExtensionContext) {

        let prompt = "Change the following code according to given instructions. Give out just the modified code. Avoid any text other than the code. Give out the code in a single codeblock.";
        prompt += "\n\n Code:\n```dart\n" + data.code + "\n```\n\nInstructions:\n" + data.customization_prompt + "\n\nModified Code:";
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
            try {
                const result = await this.geminiRepo.getCompletion([{
                    'role': 'user',
                    'parts': prompt
                }]);
                clearInterval(progressInterval);
                progress.report({ increment: 100 });

                const dartCode = extractDartCode(result);
                this.copyCode(dartCode, data.pebble_id, data.search_query_pk, data.customization_prompt, data.project_name, context);

            } catch (error) {
                logEvent('pebble-customization-failed', {
                    'type': 'pebbles',
                    'pebble_id': data.pebble_id,
                    'search_query_pk': data.search_query_pk,
                    'customization_prompt': data.customization_prompt,
                    'project_name': data.project_name,
                    'error': `${error}`,
                });
                vscode.window.showErrorMessage('Failed to customize code');
            }
        });
    }

    public async copyCode(code: string,
        pebble_id: string,
        search_query_pk: string,
        customization_prompt: string,
        project_name: string,
        context: vscode.ExtensionContext,
    ) {

        logEvent('pebble-used', {
            'type': 'pebbles',
            'customized': (customization_prompt !== undefined).toString(),
            'pebble_id': pebble_id,
            'search_query_pk': search_query_pk,
            'customization_prompt': customization_prompt,
            'project_name': project_name
        },);

        // add code to the cursor position
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selection = editor.selection;
        const currentDocument = editor.document;
        editor.edit(editBuilder => {
            editBuilder.replace(selection, code);
        });



        this.addPebbleUsage(pebble_id, search_query_pk, customization_prompt, project_name, context);

    }


    async addPebbleUsage(
        pebbleId: string,
        searchQueryPk: string,
        customizationPrompt: string,
        projectName: string,
        context: vscode.ExtensionContext
    ): Promise<any> {
        const params = {
            pebble_id: pebbleId,
            search_query_pk: searchQueryPk,
            customization_prompt: customizationPrompt,
            project_name: projectName
        };
        const config = {
            method: 'post',
            url: process.env["HOST"]! + process.env["pebble_used"],
            data: params,
        };
        const response = await makeAuthorizedHttpRequest(config, context);
    }

}
