/* eslint-disable @typescript-eslint/naming-convention */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { activateTelemetry, logEvent } from './utilities/telemetry-reporter';
import * as dotenv from 'dotenv';
import path = require('path');
// import { ExtensionVersionManager } from './utilities/update-check';
import { dartCodeExtensionIdentifier } from './shared/types/constants';
import { GeminiRepository } from './repository/gemini-repository';
import { FlutterGPTViewProvider } from './providers/chat_view_provider';
import { initCommands, registerCommand } from './utilities/command-manager';
import { CacheManager } from './utilities/cache-manager';
import { tempScheme, virtualDocumentProvider } from './utilities/virtual-document-provider';
import { Auth } from './utilities/auth/auth';
import { SetupManager, SetupStep } from './utilities/setup-manager/setup-manager';
import { StorageManager } from './utilities/storage-manager';

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

export async function activate(context: vscode.ExtensionContext) {
    // handleAgents();
    StorageManager.instance.loadContext(context);

    activateTelemetry(context);


    // Initiate cache manager
    const cacheManager = CacheManager.getInstance(context.globalState, context.workspaceState);

    const setupManager = SetupManager.getInstance();
    try {
        await setupManager.init(context);
    } catch (error) {
        console.log(`Error: ${error}`);
    }

    dotenv.config({ path: path.join(__dirname, '../.env') });
    const geminiRepo = initGemini();
    const chatViewProvider = initWebview(context, geminiRepo,);

    var _inlineErrorCommand: vscode.Disposable;

    if (geminiRepo) {
        initFlutterExtension(context, geminiRepo, chatViewProvider);
    } else {
        _inlineErrorCommand = vscode.commands.registerCommand('dash.createInlineCodeCompletion', () => {
            showMissingApiKey();
        });
    }

    setupManager.onDidChangeSetup((event) => {
        switch (event) {
            case SetupStep.github:
                // Handle any login related side-effects.
                break;
            case SetupStep.apiKey:
                // re-register Flutter Extension Commands
                const geminiRepo = initGemini();
                if (geminiRepo) {
                    if (_inlineErrorCommand) {
                        // Dispose the error command if it exists
                        _inlineErrorCommand!.dispose();
                    }
                    chatViewProvider.aiRepo = geminiRepo;
                    initFlutterExtension(context, geminiRepo, chatViewProvider);
                }
                break;
            case SetupStep.executable:
                // Handle any executable related side-effects
                break;
        }
    });

    vscode.workspace.registerTextDocumentContentProvider(tempScheme, virtualDocumentProvider);
    logEvent('activated');
}

function initWebview(context: vscode.ExtensionContext, geminiRepo?: GeminiRepository,) {
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

function initFlutterExtension(context: vscode.ExtensionContext, geminiRepo: GeminiRepository, chatViewProvider: FlutterGPTViewProvider) {

    // const refactorActionProvider = new RefactorActionProvider(analyzer, geminiRepo, context);
    // context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, refactorActionProvider));

    // const hoverProvider = new AIHoverProvider(geminiRepo, analyzer);
    // context.subscriptions.push(vscode.languages.registerHoverProvider(activeFileFilters, hoverProvider));

    //TODO: Renable after moving to CommandDash
    // const errorActionProvider = new ErrorCodeActionProvider(analyzer, geminiRepo, context);
    // context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, errorActionProvider));

    initCommands(context, geminiRepo, chatViewProvider);

}


function initGemini(): GeminiRepository | undefined {
    console.debug("creating new gemini repo instance");
    var apiKey = Auth.getInstance().getApiKey();
    if (!apiKey) {
        return;
    }
    return new GeminiRepository(apiKey);
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
