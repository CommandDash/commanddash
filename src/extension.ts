/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createWidgetFromDescription } from './tools/create/widget_from_description';
import { refactorCode } from './tools/refactor/refactor_from_instructions';
import { createModelClass } from './tools/create/class_model_from_json';
import { createResponsiveWidgetFromCode } from './tools/create/responsive_widget_from_code';
import { createResponsiveWidgetFromDescription } from './tools/create/responsive_widget_from_description';
import { fixErrors } from './tools/refactor/fix_errors';
import { createCodeFromBlueprint } from './tools/create/code_from_blueprint';
import { createRepoClassFromPostman } from './tools/create/class_repository_from_json';
import { addToReference } from './tools/reference/add_reference';
import { createCodeFromDescription } from './tools/create/code_from_description';
import { createInlineCodeCompletion } from './tools/create/inline_code_completion';
import { optimizeCode } from './tools/refactor/optimize_code';
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

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

export async function activate(context: vscode.ExtensionContext) {
    //Check for update on activation of extension
    new UpdateManager(context).checkForUpdate();

    // Check if the Gemini API key is set
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    if (!apiKey || isOldOpenAIKey(apiKey)) {
        // Prompt the user to update their settings
        vscode.window.showErrorMessage(
            'Please update your API key to Gemini in the settings.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'fluttergpt.apiKey');
            }
        });
    }
    console.log('Congratulations, "fluttergpt" is now active!');
    dotenv.config({ path: path.join(__dirname, '../.env') });
    activateTelemetry(context);
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
    try {
        let geminiRepo = initGemini();
        initFlutterExtension(context, geminiRepo, analyzer);
    } catch (error) {
        console.error(error);
    } 
    finally {
        vscode.workspace.onDidChangeConfiguration(event => {
            let affected = event.affectsConfiguration("fluttergpt.apiKey");
            if (affected) {
                const geminiRepo = initGemini();
                initFlutterExtension(context, geminiRepo, analyzer);
            }
        });
    }

    // new ExtensionVersionManager(context).isExtensionUpdated();
}

function isOldOpenAIKey(apiKey: string): boolean {
    // Define the logic to determine if the apiKey is an old OpenAI key
    // For example, if old keys start with "sk-", you could use:
    return apiKey.startsWith('sk-');
}

function initWebview(context: vscode.ExtensionContext, geminiRepo: GeminiRepository) {
    // Create a new FlutterGPTViewProvider instance and register it with the extension's context
    const chatProvider = new FlutterGPTViewProvider(context.extensionUri, context, geminiRepo);
    // Register the provider with the extension's context
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(FlutterGPTViewProvider.viewType, chatProvider,
            {
                webviewOptions: { retainContextWhenHidden: true },
            }
        )
    );
}

function initFlutterExtension(context: vscode.ExtensionContext, geminiRepo: GeminiRepository, analyzer: ILspAnalyzer) {

    const refactorActionProvider = new RefactorActionProvider(analyzer, geminiRepo, context);
        context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, refactorActionProvider));

        const hoverProvider = new AIHoverProvider(geminiRepo, analyzer);
        context.subscriptions.push(vscode.languages.registerHoverProvider(activeFileFilters, hoverProvider));

        initWebview(context, geminiRepo);

        const errorActionProvider = new ErrorCodeActionProvider(analyzer, geminiRepo, context);
        context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, errorActionProvider));

        customPush('fluttergpt.addToReference', () => addToReference(context.globalState), context);
        customPush('fluttergpt.createWidget', async () => createWidgetFromDescription(geminiRepo, context.globalState), context);
        customPush('fluttergpt.createCodeFromBlueprint', () => createCodeFromBlueprint(geminiRepo, context.globalState), context);
        customPush('fluttergpt.createCodeFromDescription', () => createCodeFromDescription(geminiRepo, context.globalState), context);
        customPush('fluttergpt.createInlineCodeCompletion', () => createInlineCodeCompletion(geminiRepo, context.globalState), context);
        customPush('fluttergpt.refactorCode', (aiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => refactorCode(geminiRepo, context.globalState, range, analyzer, elementName), context);
        customPush('fluttergpt.fixErrors', (aiRepo: GeminiRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => fixErrors(geminiRepo, errors, context.globalState, range, analyzer, elementName), context);
        customPush('fluttergpt.optimizeCode', (aiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => optimizeCode(geminiRepo, context.globalState, range, anlyzer, elementName), context);
}

async function checkApiKeyAndPrompt(context: vscode.ExtensionContext): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    if (!apiKey || isOldOpenAIKey(apiKey)) {
        const selection = await vscode.window.showInformationMessage(
            'Please update your API key to Gemini in the settings.',
            'Open Settings'
        );
        if (selection === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'fluttergpt.apiKey');
        }
        return false; // API key is not set or is old, operation should not continue
    }
    return true; // API key is set and is a Gemini key, operation can continue
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

function initGemini(): GeminiRepository {
    console.debug("creating new gemini repo instance");
    const config = vscode.workspace.getConfiguration('fluttergpt');
    var apiKey = config.get<string>('apiKey');
    if (!apiKey) {
        throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
    }
    return new GeminiRepository(apiKey);
}


function customPush(name: string, handler: (...args: any[]) => any, context: vscode.ExtensionContext): void {
    let baseCommand = vscode.commands.registerCommand(name, async (...args: any[]) => {
        const apiKeyValid = await checkApiKeyAndPrompt(context);
        if (apiKeyValid) {
            handler(...args);
        }
    });
    context.subscriptions.push(baseCommand);

    let menuCommand = vscode.commands.registerCommand(name + ".menu", async (...args: any[]) => {
        const apiKeyValid = await checkApiKeyAndPrompt(context);
        if (apiKeyValid) {
            handler(...args);
        }
    });
    context.subscriptions.push(menuCommand);
}



// This method is called when your extension is deactivated
export function deactivate() {
    console.log("FlutterGPT deactivated");
}
