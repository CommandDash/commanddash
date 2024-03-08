/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { createInlineCodeCompletion } from './tools/create/inline_code_completion';
import { makeHttpRequest } from './repository/http-utils';
import { activateTelemetry, logEvent } from './utilities/telemetry-reporter';
import * as dotenv from 'dotenv';
import path = require('path');
// import { ExtensionVersionManager } from './utilities/update-check';
import { FluttergptActionProvider as RefactorActionProvider } from './providers/refactor_code_actions';
import { ILspAnalyzer } from './shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from './shared/types/constants';
import { AIHoverProvider } from './providers/hover_provider';
import { GeminiRepository } from './repository/gemini-repository';
import { ErrorCodeActionProvider } from './providers/error_code_actions_provider';
import { FlutterGPTViewProvider } from './providers/chat_view_provider';
import { UpdateManager } from './utilities/update-manager';
import { initCommands, registerCommand } from './utilities/command-manager';
import { activateInlineHints, isFirstLineOfSymbol } from './tools/inline-hints/inlint-hints-utils';
import { CacheManager } from './utilities/cache-manager';
import { ExposedApiKeyManager } from './utilities/exposed-api-key-manager';
import { SecretApiKeyManager } from './utilities/secret-storage-manager';
import { tempScheme, virtualDocumentProvider } from './utilities/virtual-document-provider';

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

var chatViewProvider: any = null;

export async function activate(context: vscode.ExtensionContext) {

    (global as any).testExtensionContext = context;
    activateTelemetry(context);
    //before anything else we first need to load context into our secret storage manager so we can easily access it everywhere
    SecretApiKeyManager.instance.loadContext(context);

    //check for secret key inside config and shift it to secret storage. For current users
    await new ExposedApiKeyManager(SecretApiKeyManager.instance).checkAndShiftConfigApiKey();


    //Check for update on activation of extension
    new UpdateManager(context).checkForUpdate();

    // Initiate cache manager
    const cacheManager = CacheManager.getInstance(context.globalState, context.workspaceState);
    // Activate inline hints
    activateInlineHints(cacheManager);

    // Check if the Gemini API key is set
    // checkForApiKeyAndAskIfMissing(context);


    console.log('Congratulations, "fluttergpt" is now active!');
    dotenv.config({ path: path.join(__dirname, '../.env') });

    logEvent('activated');

    // Dart-code extenstion stuff
    const dartExt = vscode.extensions.getExtension(dartCodeExtensionIdentifier);
    if (!dartExt) {
        // This should not happen since the FlutterGPT extension has a dependency on the Dart one
        // but just in case, we'd like to give a useful error message.
        vscode.window.showWarningMessage("Kindly install 'Dart' extension to activate FlutterGPT");
    }
    await dartExt?.activate();

    if (!dartExt?.exports) {
        console.error("The Dart extension did not provide an exported API. Maybe it failed to activate or is not the latest version?");
    }

    const analyzer: ILspAnalyzer = dartExt?.exports._privateApi.analyzer;
    // Check if the Gemini API key is set
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = await SecretApiKeyManager.instance.getApiKey();
    if (!apiKey || isOldOpenAIKey(apiKey)) {
        chatViewProvider = initWebview(context, undefined, analyzer);
        showMissingApiKey();
    }
    console.log('Congratulations, "fluttergpt" is now active!');
    dotenv.config({ path: path.join(__dirname, '../.env') });
    activateTelemetry(context);
    logEvent('activated');

    // Dart-code extenstion stuff

    var _inlineErrorCommand: vscode.Disposable;
    try {
        let geminiRepo = await initGemini();
        initFlutterExtension(context, geminiRepo, analyzer);
    } catch (error) {
        console.error(error);
        // Handle inoine completion shortcut
        _inlineErrorCommand = vscode.commands.registerCommand('dashai.createInlineCodeCompletion', () => {
            showMissingApiKey();
        });
    }
    finally {
        // will only trigger if the apikey is changed so no need to validate again just call necessary functions
        SecretApiKeyManager.instance.onDidChangeApiKey(async event => {
            //TODO: solve view provider already registered error when changing the key in ss
            try {
                // chatViewProvider = initWebview(context);
                const geminiRepo = await initGemini();
                if (_inlineErrorCommand) {
                    // Dispose the error command if it exists
                    _inlineErrorCommand!.dispose();
                }
                if (chatViewProvider) {
                    chatViewProvider.aiRepo = geminiRepo;
                }
                // initFlutterExtension(context, geminiRepo, analyzer, chatViewProvider);
            } catch (error) {
                console.error(error);
            }
        });
    }

    vscode.workspace.registerTextDocumentContentProvider(tempScheme, virtualDocumentProvider);
}

function isOldOpenAIKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-');
}

function initWebview(context: vscode.ExtensionContext, geminiRepo?: GeminiRepository, analyzer?: ILspAnalyzer) {
    // Create a new FlutterGPTViewProvider instance and register it with the extension's context
    const chatProvider = new FlutterGPTViewProvider(context.extensionUri, context, geminiRepo, analyzer);
    // Register the provider with the extension's context
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(FlutterGPTViewProvider.viewType, chatProvider,
            {
                webviewOptions: { retainContextWhenHidden: true },
            }
        )
    );

    return chatProvider;
}

function initFlutterExtension(context: vscode.ExtensionContext, geminiRepo: GeminiRepository, analyzer: ILspAnalyzer, _chatViewProvider: FlutterGPTViewProvider | undefined = undefined) {

    const refactorActionProvider = new RefactorActionProvider(analyzer, geminiRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, refactorActionProvider));

    const hoverProvider = new AIHoverProvider(geminiRepo, analyzer);
    context.subscriptions.push(vscode.languages.registerHoverProvider(activeFileFilters, hoverProvider));
    if (!_chatViewProvider) {
        _chatViewProvider = initWebview(context, geminiRepo, analyzer);
        chatViewProvider = _chatViewProvider;
    }

    const errorActionProvider = new ErrorCodeActionProvider(analyzer, geminiRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, errorActionProvider));

    initCommands(context, geminiRepo, analyzer, _chatViewProvider);

}

export async function checkApiKeyAndPrompt(context: vscode.ExtensionContext): Promise<boolean> {

    return checkForApiKeyAndAskIfMissing(context);

    // commented below code as logic is very much similar to above func, can revive it if needed. but make changes 
    // acc. to new changes in apiKey storage: ref- above func()  

    // const config = vscode.workspace.getConfiguration('fluttergpt');
    // const apiKey = config.get<string>('apiKey');
    // if (!apiKey || isOldOpenAIKey(apiKey)) {
    //     const selection = await vscode.window.showInformationMessage(
    //         'Please update your API key to Gemini in the settings.',
    //         'Open Settings'
    //     );
    //     if (selection === 'Open Settings') {
    //         vscode.commands.executeCommand('workbench.action.openSettings', 'fluttergpt.apiKey');
    //     }
    //     return false;
    // }
    // return true;
}

export function promptGithubLogin(context: vscode.ExtensionContext): void {
    const refresh_token = context.globalState.get<string>('refresh_token');
    if (refresh_token) {
        return;
    }
    vscode.window.showInformationMessage('Please login to Github to use this feature', 'Login').then(async selection => {
        if (selection === 'Login') {
            try {
                const url = process.env["HOST"]! + process.env["github_oauth"]!;
                const github_oauth_url = await makeHttpRequest<{ github_oauth_url: string }>({ url: url });
                vscode.env.openExternal(vscode.Uri.parse(github_oauth_url.github_oauth_url));
            } catch (error) {
                vscode.window.showErrorMessage('Error logging in to fluttergpt');
            }
        }
    });

}

async function initGemini(): Promise<GeminiRepository> {

    console.debug("creating new gemini repo instance");

    var apiKey = await SecretApiKeyManager.instance.getApiKey();

    if (!apiKey) {
        throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
    }
    return new GeminiRepository(apiKey);
}

async function checkForApiKeyAndAskIfMissing(context: vscode.ExtensionContext): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    //TODO: remove in prod .. only for testing as a new user
    // await SecretApiKeyManager.instance.deleteApiKey();
    const apiKeyFromSecretStorage = await SecretApiKeyManager.instance.getApiKey();

    // if apikey and apiKeyFromSecretStorage both values are not present then we consider as a new user and show a
    //input box
    if ((!apiKey && !apiKeyFromSecretStorage) || isOldOpenAIKey(apiKey!)) {

        initWebview(context);
        //TODO : Maybe Remove this for new api key entering flow
        showMissingApiKey();
        return false;
    }
    return true;
}

// not being used as new flow of getting api key is introduced
async function getApiKeyFromUserAndStoreInSecretStorage(context: vscode.ExtensionContext) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Get API Key from here [link](https://makersuite.google.com/app/apikey)',
        placeHolder: 'API Key',
        password: true, // Hide the input (optional)
        ignoreFocusOut: true,
    });

    if (apiKey) {
        SecretApiKeyManager.instance.setApiKey(apiKey);
        vscode.window.showInformationMessage('API key saved successfully!');

    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log("FlutterGPT deactivated");
}

function showMissingApiKey() {
    vscode.window.showInformationMessage(
        'Please add your Gemini Key to use FlutterGPT.',
        'Add Now'
    ).then(selection => {
        if (selection === 'Add Now') {
            vscode.commands.executeCommand(FlutterGPTViewProvider.viewType + '.focus');
        }
    });
}
