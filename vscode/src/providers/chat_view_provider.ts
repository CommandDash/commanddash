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
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { makeAuthorizedHttpRequest } from "../repository/http-utils";

export class FlutterGPTViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = "dash.chatView";
    private _view?: vscode.WebviewView;
    private _currentMessageNumber = 0;
    private setupManager = SetupManager.getInstance();
    aiRepo?: GeminiRepository;
    analyzer?: ILspAnalyzer;
    private tasksMap: any = {};
    private toggleView: boolean = false;
    private _publicConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any, buttons?: string[], agent?: string, slug?: string }> = [];
    private _privateConversationHistory: Array<{ role: string, parts: string, messageId?: string, data?: any }> = [];

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
                        this._installAgent(data, webviewView.webview);
                        break;
                    }
                case "uninstallAgents":
                    {
                        this._uninstallAgent(data, webviewView.webview);
                        break;
                    }
                case "getInstallAgents":
                    {
                        this._getInstallAgents("Uninstall");
                        break;
                    }
                case "fetchAgents":
                    {
                        this._fetchAgentsAPI();
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
        // this._installAgent();

    }

    private async _uninstallAgent(data: any, webview: vscode.Webview) {
        try {
            const { value } = data;
            const _parsedAgent = JSON.parse(value);
            const existingAgents = await StorageManager.instance.getInstallAgents();
            const _parsedExsistingAgents = existingAgents ? JSON.parse(existingAgents) : { agents: {}, agentsList: [] };
            delete _parsedExsistingAgents.agents[`@${_parsedAgent.name}`];
            _parsedExsistingAgents.agentsList = _parsedExsistingAgents.agentsList.filter((item: string) => item !== `@${_parsedAgent.name}`);
            await StorageManager.instance.setInstallAgents(_parsedExsistingAgents);
            this._getInstallAgents("Install");
        } catch (error) {
            console.log('error while uninstalling agents: ', error);
        }
    }

    private async _fetchAgentsAPI() {
        try {
            const config: AxiosRequestConfig = {
                method: 'post',
                url: 'https://api.commanddash.dev/agent/get-agent-list',
                data: {
                    "testing": false,
                    "cli_version": "0.0.1"
                }
            };
            let response = await makeAuthorizedHttpRequest(config, this.context);
            this._view?.webview.postMessage({ type: 'fetchedAgents', value: JSON.stringify(response) });
        } catch (error) {
            console.log('error: while fetching the get-agent-list api', error);
        }
    }

    private async _fetchAgent(name: string, version: string) {
        const config: AxiosRequestConfig = {
            method: 'post',
            url: 'https://api.commanddash.dev/agent/get-agent',
            data: {
                "testing": false,
                "cli_version": "0.0.1",
                "name": name,
                "version": version
            }
        };
        const response = await makeAuthorizedHttpRequest(config, this.context);
        return response;
    }

    private async _installAgent(data: any, webview: vscode.Webview) {
        try {
            const { value } = data;
            const _parsedAgent = JSON.parse(value);
            const agentDetails = await this._fetchAgent(_parsedAgent.name, _parsedAgent.versions[0].version) as any ?? { agent: { name: "", version: "" } };
            const { name } = agentDetails;

            // StorageManager.instance.deleteAgents();
            const existingAgents = await StorageManager.instance.getInstallAgents();
            const _parsedExsistingAgents = existingAgents ? JSON.parse(existingAgents) : { agents: {}, agentsList: [] };
            const updatedAgents = {
                agents: {
                    ..._parsedExsistingAgents?.agents,
                    [`@${name}`]: {
                        ...agentDetails, name: `@${name}`,
                        supported_commands: agentDetails?.supported_commands.map((command: any) => ({
                            ...command,
                            slug: `/${command.slug}`
                        }))
                    }
                },
                agentsList: [..._parsedExsistingAgents?.agentsList, `@${name}`]
            };

            await StorageManager.instance.setInstallAgents(updatedAgents);
            this._getInstallAgents("Uninstall");
        } catch (error) {
            console.error('Error installing agents:', error);
        }
    }

    private async _getInstallAgents(buttonMessage: string) {
        StorageManager.instance
            .getInstallAgents()
            .then(agents => {
                if (agents) {
                    this._view?.webview.postMessage({ type: 'getStoredAgents', value: {agents, buttonMessage} });
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
        const loadingAnimationUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "loading-animation.json"));

        // Modify your Content-Security-Policy
        const cspSource = webview.cspSource;

        const updatedOnboardingChatHtml = marketPlaceHtml
            .replace(/{{cspSource}}/g, cspSource)
            .replace(/{{marketPlaceCssUri}}/g, marketPlaceCssUri.toString())
            .replace(/{{outputCssUri}}/g, outputCssUri.toString())
            .replace(/{{loadingAnimationUri}}/g, loadingAnimationUri.toString())
            .replace(/{{marketPlaceJsUri}}/g, marketPlaceJsUri.toString());


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


    private initGemini(apiKey: string): GeminiRepository {
        return new GeminiRepository(apiKey);
    }

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
            if (!this.toggleView) {
                this._view.webview.postMessage({ type: "cleanUpEventListener" });
                this._view.webview.html = this._getHtmlForMarketPlace(this._view?.webview);
            } else {
                this._view.webview.html = this._getHtmlForWebview(this._view?.webview);
            }
            this.toggleView = !this.toggleView;
        }
    }

    public clearConversationHistory() {
        this._privateConversationHistory = [];
        this._publicConversationHistory = [];
    }

}

