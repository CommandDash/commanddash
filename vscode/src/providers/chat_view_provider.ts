import * as vscode from "vscode";
import * as fs from 'fs';
import * as os from 'os';
import { GeminiRepository } from "../repository/gemini-repository";
import { dartCodeExtensionIdentifier } from "../shared/types/constants";
import { logError, logEvent } from "../utilities/telemetry-reporter";
import { refactorCode } from "../tools/refactor/refactor_from_instructions";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { RefactorActionManager } from "../action-managers/refactor-agent";
import { DiffViewAgent } from "../action-managers/diff-view-agent";
import { shortcutInlineCodeRefactor } from "../utilities/shortcut-hint-utils";
import { DartCLIClient } from "../utilities/commanddash-integration/dart-cli-client";
import { CacheManager } from "../utilities/cache-manager";
import { handleDiffViewAndMerge } from "../utilities/diff-utils";

export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "dashai.chatView";
    private _view?: vscode.WebviewView;
    private _currentMessageNumber = 0;
    aiRepo?: GeminiRepository;
    analyzer?: ILspAnalyzer;
    private tasksMap: any = {};

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
            switch (data.type) {
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
                        vscode.workspace.getConfiguration().update("fluttergpt.apiKey", data.value, vscode.ConfigurationTarget.Global);
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
                        const { data: _data, messageId, buttonType } = JSON.parse(data.value);
                        const task = this.tasksMap[_data.taskId];
                        const message = _data.message;

                        if (buttonType === 'accept') {
                            task.sendStepResponse(message, {'value': true});
                        } else {
                            task.sendStepResponse(message, {'value': false});
                        }
                        const updatedMessage = await DiffViewAgent.handleResponse(buttonType, _data, messageId);
                        if (updatedMessage) {
                            this._publicConversationHistory[messageId] = updatedMessage;
                            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
                        }
                        break;
                    }
                case "agents":
                    {
                        this.handleAgents(data.value);
                        break;
                    }

            }
        });

        webviewView.onDidChangeVisibility(() => {
            console.log('webview', webviewView.visible);
            if (webviewView.visible && this._view) {
                this._view?.webview.postMessage({ type: 'focusChatInput' });
            }
        });

        vscode.window.onDidChangeActiveColorTheme(() => {
            webviewView.webview.postMessage({ type: 'updateTheme' });
        });

        this._view?.webview.postMessage({ type: 'shortCutHints', value: shortcutInlineCodeRefactor() });
        logEvent('new-chat-start', { from: 'command-deck' });
    }

    private _checkIfKeyExists() {
        const config = vscode.workspace.getConfiguration('fluttergpt');
        const apiKey = config.get<string>('apiKey');
        if (apiKey) {
            this._view?.webview.postMessage({ type: "keyExists" });
        } else {
            this._view?.webview.postMessage({ type: "keyNotExists" });
        }
    }

    private async handleAgents(response: any) {
        const agentResponse = response;
        const client = new DartCLIClient();
        const task = client.newTask();

        task.onProcessStep('append_to_chat', (message) => {
            this._publicConversationHistory.push({ role: 'model', parts: message.params.args.message });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });

            task.sendStepResponse(message, { 'result': 'success' });
        });
        task.onProcessStep('loader_update', (message) => {
            task.sendStepResponse(message, { 'result': 'success' });
            this._view?.webview.postMessage({ type: 'loaderUpdate', value: JSON.stringify(message?.params?.args) });
        });
        task.onProcessStep('cache', async (message) => {
            const cache = await CacheManager.getInstance().getGeminiCache();
            task.sendStepResponse(message, { value: cache });
        });
        task.onProcessStep('replace_in_file', (message) => {
            const { originalCode, path, optimizedCode } = message.params.args.file;
            const editor = vscode.window.activeTextEditor;
            
            if (editor) {
                this.tasksMap = {[task.getTaskId()] : task};
                handleDiffViewAndMerge(editor, path, originalCode, optimizedCode, this.context);
                this._publicConversationHistory.push({ role: "dash", parts: "Do you want to merge these changes?", buttons: ["accept", "decline"], data: {taskId: task.getTaskId(), message} });
                this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            }
        });

        const prompt = this.formatPrompt(agentResponse);
        this._publicConversationHistory.push({ role: 'user', parts: prompt });
        this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
        try {
            /// Request the client to process the task and handle result or error
            const response = await task.run({
                kind: "agent-execute", data: {
                    "authdetails": {
                        "type": "gemini",
                        "key": "AIzaSyCUgTsTlr_zgfM7eElSYC488j7msF2b948",
                        "githubToken": ""
                    },
                    ...agentResponse,
                }
            });
            console.log("Processing completed: ", response);
        } catch (error) {
            console.error("Processing error: ", error);
            this?._view?.webview?.postMessage({ type: 'hideLoadingIndicator' });
        }
    }

    private formatPrompt(response: any) {
        let prompt: string = '';
        response?.inputs?.forEach(({ type, value }: { type: string, value: string }) => {
            if (type === "string_input") {
                prompt += value;
            }
            if (type === "code_input") {
                const parsedValue = JSON.parse(value);
                prompt += `\n ${parsedValue?.referenceContent}`;
            }
        });

        return prompt;
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
    private _getHtmlForWebview(webview: vscode.Webview) {
        const onboardingHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'onboarding', 'onboarding.html');
        const onboardingHtml = fs.readFileSync(onboardingHtmlPath.fsPath, 'utf8');
        const onboardingCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.css"));
        const prismCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "assets", "prismjs", "prism.min.css"));
        const onboardingJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "onboarding", "onboarding.js"));
        const commandDeckJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "command-deck", "command-deck.js"));
        const agentUIBuilderUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "agent-ui-builder", "agent-ui-builder.js"));
        const agentProviderUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "agent-provider", "agent-provider.js"));
        const headerImageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "header.png"));
        const loadingAnimationUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json"));

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;

        const updatedOnboardingChatHtml = onboardingHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{onboardingCssUri}}/g, onboardingCssUri.toString())
            .replace(/{{onboardingJsUri}}/g, onboardingJsUri.toString())
            .replace(/{{commandDeckJsUri}}/g, commandDeckJsUri.toString())
            .replace(/{{agentUIBuilderUri}}/g, agentUIBuilderUri.toString())
            .replace(/{{agentProviderUri}}/g, agentProviderUri.toString())
            .replace(/{{headerImageUri}}/g, headerImageUri.toString())
            .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
            .replace(/{{prismCssUri}}/g, prismCssUri.toString());


        return updatedOnboardingChatHtml;
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

