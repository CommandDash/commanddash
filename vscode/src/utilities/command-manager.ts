/* commandManager.ts
 This file is responsible for registering commands for the FlutterGPT extension.
 Commands can be registered as VS Code commands, context menu items, or keyboard shortcuts.
 Each command is associated with a handler function that gets executed when the command is invoked.

 To register a new command:
 1. Add a new entry to the `commands` array in the `initCommands` function.
 2. Provide the `name` of the command, the `handler` function, and the `options` object.
 3. The `options` object specifies whether the command is a regular command (`isCommand`),
    appears in the context menu (`isMenu`), or is triggered by a keyboard shortcut (`isShortcut`).
 4. Use the `registerCommand` function to add the command to the VS Code context.
    This function also checks if the API key is valid before executing the handler.

 Example command registration:
 {
     name: 'fluttergpt.doSomething',
     handler: () => doSomethingFunction(),
     options: { isCommand: true, isMenu: true, isShortcut: false }
 }

 Note: The `handler` function can be an async function if needed.
*/
import * as vscode from 'vscode';
import { addToReference } from '../tools/reference/add_reference';
import { createWidgetFromDescription } from '../tools/create/widget_from_description';
import { createCodeFromBlueprint } from '../tools/create/code_from_blueprint';
import { createCodeFromDescription } from '../tools/create/code_from_description';
import { refactorCode } from '../tools/refactor/refactor_from_instructions';
import { GeminiRepository } from '../repository/gemini-repository';
import { fixErrors } from '../tools/refactor/fix_errors';
import { optimizeCode } from '../tools/refactor/optimize_code';
import { logEvent } from './telemetry-reporter';
import { FlutterGPTViewProvider } from '../providers/chat_view_provider'; // Adjust the import path accordingly
import { createInlineCodeCompletion } from '../tools/create/inline_code_completion';
import { getUserPrefferedModel } from './model-repository-provider';
import { GenerationRepository } from '../repository/generation-repository';
import { Auth } from './auth/auth';


export function registerCommand(
    context: vscode.ExtensionContext,
    name: string,
    handler: (...args: any[]) => any,
    options: { isCommand: boolean; isMenu: boolean; isShortcut: boolean }
) {
    const { isCommand, isMenu, isShortcut } = options;

    let baseCommand = vscode.commands.registerCommand(name, async (...args: any[]) => {
        const apiKeyValid = Auth.getInstance().getApiKey();
        if (apiKeyValid) {
            logEvent(name, { 'type': 'commands', 'isCommand': isCommand.toString(), 'isShortcut': isShortcut.toString(), 'isMenu': isMenu.toString() });
            handler(...args);
        }
    });

    context.subscriptions.push(baseCommand);

    if (isMenu) {
        let menuCommand = vscode.commands.registerCommand(`${name}.menu`, async (...args: any[]) => {
            const apiKeyValid = Auth.getInstance().getApiKey();
            if (apiKeyValid) {
                logEvent(name, { 'type': 'commands', 'isCommand': isCommand.toString(), 'isShortcut': isShortcut.toString(), 'isMenu': isMenu.toString() });
                handler(...args);
            }
        });
        context.subscriptions.push(menuCommand);
    }
}

export function initCommands(context: vscode.ExtensionContext, geminiRepo: any, flutterGPTViewProvider: FlutterGPTViewProvider) {
    const commands = [
        { name: 'dash.attachToDash', handler: () => addToReference(context.globalState, flutterGPTViewProvider), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dash.createWidget', handler: async () => createWidgetFromDescription(geminiRepo, context.globalState), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dash.clearChat', handler: () => flutterGPTViewProvider?.postMessageToWebview({ type: 'clearCommandDeck' }), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dash.marketPlace', handler: () => flutterGPTViewProvider.setMarketPlaceWebView(), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dash.backButton', handler: () => flutterGPTViewProvider.setChatWebView(), options: { isCommand: true, isMenu: false, isShortcut: false } },

        // Add more commands as needed.
    ];

    // Register all commands.
    commands.forEach(cmd => registerCommand(context, cmd.name, cmd.handler, cmd.options));
}