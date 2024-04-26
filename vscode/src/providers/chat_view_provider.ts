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
import { SetupManager, SetupStep } from "../utilities/setup-manager/setup-manager";
import { ContextualCodeProvider } from "../utilities/contextual-code";
import { Auth } from "../utilities/auth/auth";
import { StorageManager } from "../utilities/storage-manager";

export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "dash.chatView";
    private _view?: vscode.WebviewView;
    private _currentMessageNumber = 0;
    private setupManager = SetupManager.getInstance();
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
                case "updateApiKey":
                    {
                        this.setupManager.setupApiKey(data.value);
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
                            task.sendStepResponse(message, { 'value': true });
                        } else {
                            task.sendStepResponse(message, { 'value': false });
                        }
                        const fileData = _data.message.params.args.file;
                        const updatedMessage = await DiffViewAgent.handleResponse(buttonType, fileData, messageId);
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
                case "githubLogin":
                    {
                        this.setupManager.setupGithub();
                        break;
                    }
                case "validate":
                    {
                        webviewView.webview.postMessage({ type: "showValidationLoader" });
                        this.aiRepo = this.initGemini(data.value);
                        await this._validateApiKey(data.value);
                        webviewView.webview.postMessage({ type: "hideValidationLoader" });
                        break;
                    }
                case "initialized":
                    {
                        this._setupManager();
                        webviewView.webview.postMessage({ type: 'shortCutHints', value: shortcutInlineCodeRefactor() });
                        break;
                    }
                case "installAgents":
                    {
                        this._installAgents(data, webviewView.webview);
                        break;
                    }
                case "getInstallAgents":
                    {
                        this._getInstallAgents(webviewView.webview);
                        break;
                    }
                case "backFromMarketPlace":
                    {
                        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
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

        logEvent('new-chat-start', { from: 'command-deck' });

    }

    private async _installAgents(data: any, webview: vscode.Webview) {
        try {
            const { value } = data;
            const _parsedAgentsValue = JSON.parse(value);
            const _agentName = _parsedAgentsValue?.name as string;

            const existingAgents = await StorageManager.instance.getInstallAgents();
            const _parsedExsistingAgents = existingAgents ? JSON.parse(existingAgents) : { agents: {}, agentsList: [] };
            const updatedAgents = {
                agents: {
                    ..._parsedExsistingAgents?.agents,
                    [_agentName]: { ..._parsedAgentsValue }
                },
                agentsList: [..._parsedExsistingAgents?.agentsList, _agentName]
            };

            await StorageManager.instance.setInstallAgents(updatedAgents);
            this._getInstallAgents(webview);
        } catch (error) {
            console.error('Error installing agents:', error);
        }
    }

    private async _getInstallAgents(webview: vscode.Webview) {
        StorageManager.instance
            .getInstallAgents()
            .then(agents => {
                if (agents) {
                    this._view?.webview.postMessage({ type: 'getStoredAgents', value: agents });
                }
            })
            .catch(error => {
                console.log('Error in getting installed agents', error);
            });
    }

    private async _setupManager() {

        this.setupManager.pendingSetupSteps.forEach((steps: SetupStep) => {
            if (steps === SetupStep.executable) {
                this.setupManager.setupExecutable((progress: number) => {
                    this.postMessageToWebview({ type: 'executableDownloadProgress', value: progress });
                });
            }
        });

        this._view?.webview.postMessage({ type: 'pendingSteps', value: JSON.stringify(this.setupManager.pendingSetupSteps) });

        // this.setupManager.deleteGithub();

        this.setupManager.onDidChangeSetup(event => {
            switch (event) {
                case SetupStep.github:
                    console.log('github');
                    this._view?.webview.postMessage({ type: 'githubLoggedIn' });
                    break;
                case SetupStep.apiKey:
                    console.log('apikey');
                    this._view?.webview.postMessage({ type: 'apiKeySet' });
                    break;
                case SetupStep.executable:
                    console.log('executable');
                    this._view?.webview.postMessage({ type: 'executableDownloaded' });
                    break;
            }
        });
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
        const client = DartCLIClient.getInstance();
        const task = client.newTask();

        task.onProcessStep('append_to_chat', async (message) => {
            this._publicConversationHistory.push({ role: 'model', parts: message.params.args.message });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });

            task.sendStepResponse(message, {});
        });
        task.onProcessStep('loader_update', async (message) => {
            task.sendStepResponse(message, {});
            this._view?.webview.postMessage({ type: 'loaderUpdate', value: JSON.stringify(message?.params?.args) });
        });
        task.onProcessStep('cache', async (message) => {
            const cache = await CacheManager.getInstance().getGeminiCache();
            task.sendStepResponse(message, { value: cache });
        });
        task.onProcessStep('update_cache', async (message) => {
            const embd = JSON.parse(message.params.args.embeddings);
            var cacheMap: { [filePath: string]: { codehash: string, embedding: { values: number[] } } } = {};

            // Iterate over each object in the list
            for (const cacheItem of embd) {
                // Extract filePath from the keys of each object in the list
                const filePath = Object.keys(cacheItem)[0];

                // Add the extracted object to the map
                cacheMap[filePath] = cacheItem[filePath];
            }
            await CacheManager.getInstance().setGeminiCache(cacheMap);
            task.sendStepResponse(message, {});
        });
        task.onProcessStep('workspace_details', async (message) => {
            const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
            if (!workspaceFolder) {
                task.sendStepResponse(message, { path: null });
                return;
            }
            task.sendStepResponse(message, { path: workspaceFolder.uri.fsPath });
        });

        task.onProcessStep('replace_in_file', async (message) => {
            const { originalCode, path, optimizedCode } = message.params.args.file;
            const editor = vscode.window.activeTextEditor;

            if (editor) {
                this.tasksMap = { [task.getTaskId()]: task };
                handleDiffViewAndMerge(editor, path, originalCode, optimizedCode, this.context);
                this._publicConversationHistory.push({ role: "dash", parts: "Do you want to merge these changes?", buttons: ["accept", "decline"], data: { taskId: task.getTaskId(), message } });
                this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            }
            task.sendStepResponse(message, {});
        });

        const prompt = this.formatPrompt(agentResponse);
        this._publicConversationHistory.push({ role: 'user', parts: prompt, agent: agentResponse.agent, slug: agentResponse.slug });
        this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
        try {
            let auth = Auth.getInstance();
            /// Request the client to process the task and handle result or error
            let agentTrackData = {
                'agent_name': (agentResponse['agent'] as string).substring(1),
                'slash_command': agentResponse['slug'],
                'agent_version': agentResponse['agent_version']
            };
            logEvent('agent_start', agentTrackData);
            const response = await task.run({
                kind: "agent-execute", data: {
                    "auth_details": {
                        "type": "gemini",
                        "key": auth.getApiKey(),
                        "github_token": auth.getGithubAccessToken()
                    },
                    ...agentResponse,
                    agent_name: (agentResponse['agent'] as string).substring(1) // remove the '@'
                }
            });
            logEvent('agent_success', agentTrackData);
            console.log("Processing completed: ", response);
        } catch (error) {
            console.error("Processing error: ", error);
            this._publicConversationHistory.push({ role: 'error', parts: error instanceof Error ? (error as Error).message : (error as any).toString() });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
            this?._view?.webview?.postMessage({ type: 'hideLoadingIndicator' });
        }
    }

    private formatPrompt(response: any) {
        let prompt: string = '';
        response?.registered_inputs?.forEach(({ type, value }: { type: string, value: string }) => {
            if (type === "string_input" && value) {
                prompt += value;
            }
            if (type === "code_input" && value) {
                const parsedValue = JSON.parse(value);
                prompt += "\n" + parsedValue?.referenceContent;
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
        const questionnaireUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "questionnaire", "questionnaire.js"));
        const headerImageUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "header.png"));
        const loadingAnimationUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json"));
        const outputCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "output.css"));

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;

        const updatedOnboardingChatHtml = onboardingHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{onboardingCssUri}}/g, onboardingCssUri.toString())
            .replace(/{{outputCssUri}}/g, outputCssUri.toString())
            .replace(/{{onboardingJsUri}}/g, onboardingJsUri.toString())
            .replace(/{{commandDeckJsUri}}/g, commandDeckJsUri.toString())
            .replace(/{{agentUIBuilderUri}}/g, agentUIBuilderUri.toString())
            .replace(/{{agentProviderUri}}/g, agentProviderUri.toString())
            .replace(/{{questionnaireUri}}/g, questionnaireUri.toString())
            .replace(/{{headerImageUri}}/g, headerImageUri.toString())
            .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
            .replace(/{{prismCssUri}}/g, prismCssUri.toString());


        return updatedOnboardingChatHtml;
    }

    private _getHtmlForMarketPlace(webview: vscode.Webview) {
        const marketPlaceHtmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'market-place', 'market-place.html');
        const marketPlaceHtml = fs.readFileSync(marketPlaceHtmlPath.fsPath, 'utf8');
        const marketPlaceCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "market-place", "market-place.css"));
        const marketPlaceJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "market-place", "market-place.js"));
        const outputCssUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "output.css"));

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;

        const updatedOnboardingChatHtml = marketPlaceHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{marketPlaceCssUri}}/g, marketPlaceCssUri.toString())
            .replace(/{{outputCssUri}}/g, outputCssUri.toString())
            .replace(/{{marketPlaceJsUri}}/g, marketPlaceJsUri.toString());


        return updatedOnboardingChatHtml;
    }

    private _getHtmlForProfileWebview() {
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
            
            registerMessage();

            vscode.postMessage({ type: "updateChatViewKey"}); 
    
            const updateApiKeyButton = document.getElementById("update-api-key");
            const backButton = document.getElementById("back-button");
const apiKey = document.getElementById("api-key");
updateApiKeyButton.addEventListener("click", (event) => {
   
    updatedApiKey = apiKey.value;

 vscode.postMessage({ type: "updateChatViewKey"}); 
    
    
});

backButton.addEventListener("click", (event) => {
    vscode.postMessage({ type: "backFromProfile", value:  ''}); 
    
});

function registerMessage() {
    debugger;
    window.addEventListener('message', (event) => {
        debugger;
        const message = event.data;
        console.log('message', message);
    })
}
            
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

    private _publicConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any, buttons?: string[], agent?: string, slug?: string }> = [];
    private _privateConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any }> = [];

    public addMessageToPublicConversationHistory(message: { role: string, parts: string, messageId?: string, data?: any, buttons?: string[], agent?: string, }) {
        this._publicConversationHistory.push(message);
        this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
    }

    private async getResponse(prompt: string) {
        if (!this._view) {
            await vscode.commands.executeCommand('dash.chatView.focus');
        } else {
            this._view?.show?.(true);
        }

        // Initialize conversation history if it's the first time
        if (this._privateConversationHistory.length === 0) {
            this._privateConversationHistory.push(

                //TODO: Fetch and insert the available agents dynamically 
                {
                    role: 'user', parts: `You are a Flutter/Dart coding assistant specializing in providing well-formatted, production-ready code. Here is what I can do with you:

                1. I can ask you to complete Flutter coding tasks by attaching multiple code snippets from different files in you inline chat by selecting the code and choosing "Attach Snippet to Dash" from the right click menu. With full context provided, you will generate accurate responses with well-formatted code snippets.
                
                2. You offer specialized agents for specific tasks. I can initialize an agent by typing "@" followed by the agent's name. Each agent has its own set of slash commands for specific tasks.

                Available agents and commands are.
                1. @ (globally commands that can be triggered without an agent)
                - /refactor
                - /documentation
                2. @workspace
                - /query
                3. @flutter
                - /doc
                4. @test
                - /unit
                - /widget
                - /integration
                
                User's can use run the agents or commands like:
                - @test /unit
                - /refactor
                - @workspace /query
                If I greet you or ask you what you can do for me, tell me about the above abilities. Be concise.`},
                { role: 'model', parts: "Noted, I will be responding as per your instructions. Let's get started." }
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
            logError('command-deck-conversation-error', error);
            this._publicConversationHistory.push({ role: 'error', parts: error instanceof Error ? (error as Error).message : (error as any).toString() });
            this._view?.webview.postMessage({ type: 'displayMessages', value: this._publicConversationHistory });
        } finally {
            this._view?.webview.postMessage({ type: 'hideLoadingIndicator' });
            this._view?.webview.postMessage({ type: 'workspaceLoader', value: false });
        }
    }

    public setMarketPlaceWebView() {
        if (this._view) {
            this._view.webview.postMessage({ type: "cleanUpEventListener" });
            this._view.webview.html = this._getHtmlForMarketPlace(this._view?.webview);
        }
    }

    public clearConversationHistory() {
        this._privateConversationHistory = [];
        this._publicConversationHistory = [];
    }

}

