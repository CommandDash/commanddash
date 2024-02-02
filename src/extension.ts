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
import { initCommands } from './utilities/command-manager';
import { activateInlineHints, isFirstLineOfSymbol } from './tools/inline-hints/inlint-hints-utils';
import { CacheManager } from './utilities/cache-manager';

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

export async function activate(context: vscode.ExtensionContext) {
    //Check for update on activation of extension
    new UpdateManager(context).checkForUpdate();

    // Initiate cache manager
    const cacheManager = CacheManager.getInstance(context.globalState, context.workspaceState);
    // Activate inline hints
    activateInlineHints(cacheManager);

    // Check if the Gemini API key is set
    const config = vscode.workspace.getConfiguration('fluttergpt');
    const apiKey = config.get<string>('apiKey');
    if (!apiKey || isOldOpenAIKey(apiKey)) {
        initWebview(context);
        
        // Prompt the user to update their settings
        vscode.window.showErrorMessage(
            'Please update your API key to Gemini in the settings.',
            'Open Settings'
        ).then(selection => {
            if (selection === 'Open Settings') {
                // vscode.commands.executeCommand('workbench.action.openSettings', 'fluttergpt.apiKey');
                vscode.commands.executeCommand('workbench.view.extensions');
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
                try {
                    const geminiRepo = initGemini();
                    initFlutterExtension(context, geminiRepo, analyzer);
                } catch (error) {
                    console.error(error);
                }
            }
        });
    }
}

function isOldOpenAIKey(apiKey: string): boolean {
    return apiKey.startsWith('sk-');
}

function initWebview(context: vscode.ExtensionContext, geminiRepo?: GeminiRepository) {
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

    return chatProvider;
}

function initFlutterExtension(context: vscode.ExtensionContext, geminiRepo: GeminiRepository, analyzer: ILspAnalyzer) {

    const refactorActionProvider = new RefactorActionProvider(analyzer, geminiRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, refactorActionProvider));

    const hoverProvider = new AIHoverProvider(geminiRepo, analyzer);
    context.subscriptions.push(vscode.languages.registerHoverProvider(activeFileFilters, hoverProvider));

    const flutterChatProvider = initWebview(context, geminiRepo);

    const errorActionProvider = new ErrorCodeActionProvider(analyzer, geminiRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, errorActionProvider));

    initCommands(context, geminiRepo, analyzer, flutterChatProvider);

}

export async function checkApiKeyAndPrompt(context: vscode.ExtensionContext): Promise<boolean> {
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
        return false;
    }
    return true;
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

// This method is called when your extension is deactivated
export function deactivate() {
    console.log("FlutterGPT deactivated");
}
