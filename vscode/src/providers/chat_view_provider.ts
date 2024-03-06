import * as vscode from "vscode";
import * as fs from 'fs';
import { GeminiRepository } from "../repository/gemini-repository";
import { dartCodeExtensionIdentifier } from "../shared/types/constants";
import { logError, logEvent } from "../utilities/telemetry-reporter";
import { SecretApiKeyManager } from "../utilities/secret-storage-manager";

import { refactorCode } from "../tools/refactor/refactor_from_instructions";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { RefactorActionManager } from "../action-managers/refactor-agent";
import { DiffViewAgent } from "../action-managers/diff-view-agent";
import { shortcutInlineCodeRefactor } from "../utilities/shortcut-hint-utils";

export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "dashai.chatView";
    private _view?: vscode.WebviewView;
    private _currentMessageNumber = 0;
    aiRepo?: GeminiRepository;
    analyzer?: ILspAnalyzer;

    // In the constructor, we store the URI of the extension
    constructor(private readonly _extensionUri: vscode.Uri,
        private context: vscode.ExtensionContext,
        aiRepo?: GeminiRepository,
        analyzer?: ILspAnalyzer,
    ) {
        this.aiRepo = aiRepo;
        this.analyzer = analyzer;
    }

    // Public method to post a message to the webview
    public postMessageToWebview(message: any): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        // set options for the webview, allow scripts
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri,
            ],
        };

        // set the HTML for the webview
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // add an event listener for messages received by the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('data', data);
            switch (data.type) {
                case 'backFromProfile':
                    {
                        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                        break;
                    }
                case 'updateApiKey':
                    {
                        this.updateApiKey(data.value); 
                        break;
                    }
                case "codeSelected":
                    {
                        break;
                    }
                case "action":
                    {
                        this.handleAction(data.value);
                        break;
                    }

                case "prompt":
                    {
                        this.getResponse(data.value);
                        break;
                    }

                case "mergeCode":
                    {
                        const editor = vscode.window.activeTextEditor;
                        if (editor) {
                            editor.edit((builder) => {
                                if (editor.selection.isEmpty) {
                                    builder.insert(editor.selection.active, data.value);
                                } else {
                                    builder.replace(editor.selection, data.value);
                                }
                            });
                        }
                        logEvent('merge-code', { from: 'command-deck' });
                        break;
                    }
                case "copyCode":
                    {
                        logEvent('copy-code', { from: 'command-deck' });
                        break;
                    }
                case "clearChat":
                    {
                        this.clearConversationHistory();
                        break;
                    }
                case "gotoProfile":
                    {
                        webviewView.webview.html = this._getHtmlForProfileWebview(webviewView.webview);
                        break;
                    }
                case "validate":
                    {
                        webviewView.webview.postMessage({ type: "showValidationLoader" });
                        this.aiRepo = this.initGemini(data.value);
                        await this._validateApiKey(data.value);
                        await this._validateFlutterExtension();
                        webviewView.webview.postMessage({ type: "hideValidationLoader" });
                        break;
                    }
                case "updateSettings":
                    {
                       await SecretApiKeyManager.instance.setApiKey(data.value);
                        vscode.window.showInformationMessage(`Settings updated: Gemini API Key set`);
                        break;
                    }
                case "checkKeyIfExists":
                    {
                        this._checkIfKeyExists();
                        break;
                    }
                case "dashResponse":
                    {
                        const { agent, data: _data, messageId, buttonType } = JSON.parse(data.value);
                        console.log('agent', buttonType, _data, messageId, agent);
                        if (agent === "diffView") {
                            const updatedMessage = await DiffViewAgent.handleResponse(buttonType, _data, messageId);
                            // update the message with messageId
                            if (updatedMessage) {
                                this._publicConversationHistory[messageId] = updatedMessage;
                                this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
                            }
                        }
                    }

            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this._view) {
                this._view?.webview.postMessage({ type: 'focusChatInput' });
            }
        });

        vscode.window.onDidChangeActiveColorTheme(() => {
            webviewView.webview.postMessage({ type: 'updateTheme' });
        });

        webviewView.webview.postMessage({ type: 'shortCutHints', value: shortcutInlineCodeRefactor() });

        logEvent('new-chat-start', { from: 'command-deck' });
    }

     private async _checkIfKeyExists() {
        var apiKey = await SecretApiKeyManager.instance.getApiKey();
        if (apiKey) {
            this._view?.webview.postMessage({ type: "keyExists" });
        }
    }
    private async handleAction(input: string) {
        const data = JSON.parse(input);
        const actionType = data.message.startsWith('/') ? data.message.split('\u00A0')[0].substring(1) : '';
        const chipsData: object = data.chipsData;
        data.message = data.message.replace(`/${actionType}`, '').trim();
        data.instructions = data.instructions.replace(`/${actionType}`, '').trim();
        const chipIds: string[] = data.chipId;
        if (actionType === 'refactor') {
            this._publicConversationHistory.push({ role: 'user', parts: data.message, agent: '/refactor' });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            this._view?.webview.postMessage({ type: 'showLoadingIndicator' });
            const result = await RefactorActionManager.handleRequest(chipsData, chipIds, data, this.aiRepo!, this.context, this.analyzer!, this);
            this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });
            this._publicConversationHistory.push(result);
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            this._view?.webview.postMessage({ type: 'setPrompt', value: '' });

        }
    }


    private async updateApiKey(apiKey: string){
        //TODO: check for valid key before adding
        SecretApiKeyManager.instance.setApiKey(apiKey);
       let newApiKey = await SecretApiKeyManager.instance.getApiKey();
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const onboardingHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'onboarding', 'onboarding.html');
        const onboardingHtml = fs.readFileSync(onboardingHtmlPath.fsPath, 'utf8');
        const onboardingCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.css"));
        const prismCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "prismjs", "prism.min.css"));
        const onboardingJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.js"));
        const headerImageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "icon.png"));
        const loadingAnimationUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json"));

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;

        const updatedOnboardingChatHtml = onboardingHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{onboardingCssUri}}/g, onboardingCssUri.toString())
            .replace(/{{onboardingJsUri}}/g, onboardingJsUri.toString())
            .replace(/{{headerImageUri}}/g, headerImageUri.toString())
            .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
            .replace(/{{prismCssUri}}/g, prismCssUri.toString());
        

        return updatedOnboardingChatHtml;
    }

    private _getHtmlForProfileWebview(webview: vscode.Webview) {
        const onboardingJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.js"));
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <!--
                Use a content security policy to only allow loading styles from our extension directory,
                and only allow scripts that have a specific nonce.
                (See the 'webview-sample' extension sample for img-src content security policy examples)
            -->
            

            <meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
        .head-container {
            display: flex;
            align-items: center;
        }
        #back-button {
            margin-right: 10px;
            border: none;
            background: none;
            cursor: pointer;
        }
        #back-button svg {
            width: 20px;
            height: 20px;
            fill: #FFF; /* Adjust color as needed */
        }
        h2 {
            margin: 0;
        }
    </style>
           

            <title>Profile Page</title>
        </head>
        <body>
        <div class="container">
        <div class="head-container">
        <button id="back-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-left" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M10.646 2.646a.5.5 0 0 1 0 .708L6.707 8l3.939 3.939a.5.5 0 1 1-.708.708l-4.242-4.243a.5.5 0 0 1 0-.707L10.646 2.646zM4.5 8a.5.5 0 0 1 .5-.5h6.793a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
        </svg>
        </button>
        <h2>Profile Page</h2>
       </div>
        
            <input type="text" id="api-key" placeholder="Update api-key...">
            <button class="ml-2" id="update-api-key">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.000488281" width="31.9997" height="32" rx="2" fill="#3079D8" />
                    <path
                        d="M23.9531 16.3394L9.24951 9.84766L13.7983 16.3417L9.57198 23.1423L23.9531 16.3394Z"
                        fill="black" stroke="black" stroke-width="0.784"
                        stroke-linejoin="round" />
                    <path d="M12.4482 16.3418L15.6388 16.3418" stroke="#3079D8"
                        stroke-width="0.784" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
            
     
    </div>
            

            
            <script>
             const vscode = acquireVsCodeApi(); 
            const updateApiKeyButton = document.getElementById("update-api-key");
            const backButton = document.getElementById("back-button");
const apiKey = document.getElementById("api-key");
updateApiKeyButton.addEventListener("click", (event) => {
   
    updatedApiKey = apiKey.value;

 vscode.postMessage({ type: "updateApiKey", value:  updatedApiKey}); 
    
    
});

backButton.addEventListener("click", (event) => {
    vscode.postMessage({ type: "backFromProfile", value:  ''}); 
    
});
            
        </script>
            
        </body>
        </html>`;
        
    }

    private async _validateApiKey(apiKey: string) {
        try {
            await this.aiRepo?.validateApiKey(apiKey);
            this._view?.webview.postMessage({ type: 'apiKeyValidation', value: 'Gemini API Key is valid' });
        } catch (error) {
            console.log('gemini api error', error);
            this._view?.webview.postMessage({ type: 'apiKeyValidation', value: 'Gemini API Key is invalid' });
        }
    }

    private async _validateFlutterExtension() {
        const dartExt = vscode.extensions.getExtension(dartCodeExtensionIdentifier);
        if (!dartExt) {
            this._view?.webview.postMessage({ type: 'dependencyValidation', value: 'All dependencies are not installed' });
        } else {
            this._view?.webview.postMessage({ type: 'dependencyValidation', value: 'All dependencies are installed' });
        }
    }

    private _getChatWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chat", "scripts", "main.js"));
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "chat", "css", "chatpage.css"));
        const prismCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "prismjs", "prism.min.css"));
        const chatHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'chat', 'chat.html');
        const chatHtml = fs.readFileSync(chatHtmlPath.fsPath, 'utf8');

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;
        const contentSecurityPolicy = `
            default-src 'none';
            connect-src 'self' https://api.openai.com;
            img-src ${cspSource} https:;
            style-src 'unsafe-inline' ${cspSource};
            script-src 'unsafe-inline' ${cspSource} https: http:;
        `;

        const updatedChatHtml = chatHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{scriptUri}}/g, scriptUri.toString())
            .replace(/{{cssUri}}/g, cssUri.toString())
            .replace(/{{prismCssUri}}/g, prismCssUri.toString());

        return updatedChatHtml;
    }

    private initGemini(apiKey: string): GeminiRepository {
        return new GeminiRepository(apiKey);
    }

    private _publicConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any, buttons?: string[], agent?: string, }> = [];
    private _privateConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any }> = [];

    public addMessageToPublicConversationHistory(message: { role: string, parts: string, messageId?: string, data?: any, buttons?: string[], agent?: string, }) {
        this._publicConversationHistory.push(message);
        this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
    }

    private async getResponse(prompt: string) {
        if (!this._view) {
            await vscode.commands.executeCommand('dashai.chatView.focus');
        } else {
            this._view?.show?.(true);
        }

        // Initialize conversation history if it's the first time
        if (this._privateConversationHistory.length === 0) {
            this._privateConversationHistory.push(
                { role: 'user', parts: "You are a flutter/dart development expert who specializes in providing production-ready well-formatted code. Each response from you must be STRICTLY under 8192 characters. DO NOT MENTION EXTRA DETAILS APART FROMT THE QUERY ASKED BY THE USER.\n\n" },
                { role: 'model', parts: "I am a flutter/dart development expert who specializes in providing production-ready well-formatted code. Each response of mine will be STRICTLY under 8192 characters. How can I help you?\n\n" }
            );
        }
        let workspacePrompt = "";

        // Add a simplified version to the public history
        this._publicConversationHistory.push({ role: 'user', parts: prompt });

        this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
        this._view?.webview.postMessage({ type: 'setPrompt', value: '' });

        // Check if the prompt includes '@workspace' and handle accordingly
        try {
            if (prompt.includes('@workspace') && this.aiRepo) {
                // Add the full prompt to the private history for completion
                this._view?.webview.postMessage({ type: 'workspaceLoader', value: true });
                const dartFiles = await this.aiRepo.findClosestDartFiles(prompt, this._view);
                workspacePrompt = "You've complete access to the codebase. I'll provide you with top 5 closest files code as context and your job is to read following files code end-to-end and answer the prompt initialised by `@workspace` symbol. If you're unable to find answer for the requested prompt, suggest an alternative solution as a dart expert. Be crisp & crystal clear in your answer. Make sure to provide your thinking process in steps including the file paths, name & code. Here's the code: \n\n" + dartFiles + "\n\n" + prompt;
                this._privateConversationHistory.push({ role: 'user', parts: workspacePrompt });
            } else {
                // Append the current user prompt to the conversation history
                this._privateConversationHistory.push({ role: 'user', parts: prompt });
                this._view?.webview.postMessage({ type: 'showLoadingIndicator' });
            }
        } catch (error) {
            console.error("Error processing workspace prompt: ", error);
            logError('workspace-prompt-error', error);
        }
        // Use the stored conversation history for the prompt
        try {
            let response = '';
            if (prompt.includes('@workspace') && this.aiRepo) {
                response = await this.aiRepo.getCompletion(this._privateConversationHistory, true, this._view);
                this._privateConversationHistory.push({ role: 'user', parts: workspacePrompt });
            } else if (this.aiRepo) {
                response = await this.aiRepo.getCompletion(this._privateConversationHistory);
                this._privateConversationHistory.push({ role: 'user', parts: prompt });
                this._view?.webview.postMessage({ type: 'showLoadingIndicator' });
            }
            this._privateConversationHistory.push({ role: 'model', parts: response });
            this._publicConversationHistory.push({ role: 'model', parts: response });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            logEvent('follow-up-message', { from: 'command-deck' });
            this._view?.webview.postMessage({ type: 'stepLoader', value: { creatingResultLoader: true } });
            this._view?.webview.postMessage({ type: 'addResponse', value: '' });

        } catch (error) {
            console.error(error);
            const response = error instanceof Error ? error.message : 'An unexpected error occurred.';
            logError('command-deck-conversation-error', error);
            this._view?.webview.postMessage({ type: 'displaySnackbar', value: response });
            this._view?.webview.postMessage({ type: 'addResponse', value: '' });
        } finally {
            this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });
            this._view?.webview.postMessage({ type: 'workspaceLoader', value: false });
        }
    }


    public clearConversationHistory() {
        this._privateConversationHistory = [];
        this._publicConversationHistory = [];
    }

}

