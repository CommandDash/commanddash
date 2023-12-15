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
import { optimizeCode } from './tools/refactor/optimize_code';
import { savePebblePanel } from './pebbles/pebble_repository';
import { makeHttpRequest } from './repository/http-utils';
import { activateTelemetry, logEvent } from './utilities/telemetry-reporter';
import * as dotenv from 'dotenv';
import path = require('path');
import { PebblePanelViewProvider } from './pebbles/pebble-pabel-provider';
import { ExtensionVersionManager } from './utilities/update-check';
import { FluttergptActionProvider } from './providers/fluttergpt_code_actions_provider';
import { ILspAnalyzer } from './shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from './shared/types/constants';
import { AIHoverProvider } from './providers/hover_provider';
import { FlutterGPTViewProvider } from './providers/chat_view_provider';
import { GeminiRepository } from './repository/gemini-repository';

export const DART_MODE: vscode.DocumentFilter & { language: string } = { language: "dart", scheme: "file" };

const activeFileFilters: vscode.DocumentFilter[] = [DART_MODE];

export async function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, "fluttergpt" is now active!');

    dotenv.config({ path: path.join(__dirname, '../.env') });
    activateTelemetry(context);
    logEvent('activated');

    // Dart-code extenstion stuff
    const dartExt = vscode.extensions.getExtension(dartCodeExtensionIdentifier);
    if (!dartExt) {
        // This should not happen since the FlutterGPT extension has a dependency on the Dart one
        // but just in case, we'd like to give a useful error message.
        throw new Error("The Dart extension is not installed, Flutter extension is unable to activate.");
    }
    await dartExt.activate();

    if (!dartExt.exports) {
        console.error("The Dart extension did not provide an exported API. Maybe it failed to activate or is not the latest version?");
        return;
    }
    const analyzer: ILspAnalyzer = dartExt.exports._privateApi.analyzer;

    let pebblePanelWebViewProvider: PebblePanelViewProvider;
    let pebbleView: vscode.Disposable;
    console.log(process.env["HOST"]);
    let geminiRepo = initGemini();
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
                console.log(uri);
                if (uri.path === process.env["success_path"]!) {
                    const query = uri.query.split('&');
                    const access_token = query[0].split('=')[1];
                    const refresh_token = query[1].split('=')[1];
                    Promise.all([
                        context.globalState.update('access_token', access_token),
                        context.globalState.update('refresh_token', refresh_token)
                    ]).then(() => {
                        logEvent('login');
                        // show success message
                        vscode.window.showInformationMessage('Successfully logged in to FlutterGPT');
                        pebblePanelWebViewProvider.refresh();

                    }).catch((error) => {
                        logEvent('login-failed', { error: error });
                        vscode.window.showErrorMessage('Error logging in to FlutterGPT');

                    });
                }
            }
        })
    );


    const wellTestedActionProvider = new FluttergptActionProvider(analyzer, geminiRepo, context);
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(activeFileFilters, wellTestedActionProvider));

    const hoverProvider = new AIHoverProvider(geminiRepo, analyzer);
    context.subscriptions.push(vscode.languages.registerHoverProvider(activeFileFilters, hoverProvider));

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

    pebblePanelWebViewProvider = new PebblePanelViewProvider(context.extensionUri, context, geminiRepo);

    pebbleView = vscode.window.registerWebviewViewProvider(
        "fluttergpt.pebblePanel",
        pebblePanelWebViewProvider,
    );

    context.subscriptions.push(pebbleView);

    vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration("fluttergpt.apiKey");
        if (affected) { geminiRepo = initGemini(); }
    });
    customPush('fluttergpt.addToReference', () => addToReference(context.globalState), context);
    customPush('fluttergpt.createWidget', async () => createWidgetFromDescription(geminiRepo, context.globalState), context);
    customPush('fluttergpt.createCodeFromBlueprint', () => createCodeFromBlueprint(geminiRepo, context.globalState), context);
    customPush('fluttergpt.createCodeFromDescription', () => createCodeFromDescription(geminiRepo, context.globalState), context);
    customPush('fluttergpt.refactorCode', (aiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range) => refactorCode(geminiRepo, context.globalState, range), context);
    customPush('fluttergpt.fixErrors', (aiRepo: GeminiRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range) => fixErrors(geminiRepo, errors, context.globalState, range), context);
    customPush('fluttergpt.optimizeCode', (aiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range) => optimizeCode(geminiRepo, context.globalState, range), context);
    customPush('fluttergpt.savePebblePanel', (aiRepo: GeminiRepository, globalState: vscode.Memento) => savePebblePanel(geminiRepo, context), context);
    // context.subscriptions.push(vscode.commands.registerCommand('fluttergpt.optimizeCode', optimizeCode));

    new ExtensionVersionManager(context).isExtensionUpdated();
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


function customPush(name: string, handler: any, context: vscode.ExtensionContext): void {
    let baseCommand = vscode.commands.registerCommand(name, handler);
    context.subscriptions.push(baseCommand);

    let menuCommand = vscode.commands.registerCommand(name + ".menu", handler);
    context.subscriptions.push(menuCommand);
}



// This method is called when your extension is deactivated
export function deactivate() {
    console.log("Fluttergpt deactivated");
}
