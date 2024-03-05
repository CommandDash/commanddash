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
import { checkApiKeyAndPrompt } from '../extension';
import { addToReference } from '../tools/reference/add_reference';
import { createWidgetFromDescription } from '../tools/create/widget_from_description';
import { createCodeFromBlueprint } from '../tools/create/code_from_blueprint';
import { createCodeFromDescription } from '../tools/create/code_from_description';
import { refactorCode } from '../tools/refactor/refactor_from_instructions';
import { ILspAnalyzer } from '../shared/types/LspAnalyzer';
import { GeminiRepository } from '../repository/gemini-repository';
import { fixErrors } from '../tools/refactor/fix_errors';
import { optimizeCode } from '../tools/refactor/optimize_code';
import { logEvent } from './telemetry-reporter';
import { FlutterGPTViewProvider } from '../providers/chat_view_provider'; // Adjust the import path accordingly
import { createInlineCodeCompletion } from '../tools/create/inline_code_completion';
import { getUserPrefferedModel } from './model-repository-provider';
import { GenerationRepository } from '../repository/generation-repository';


export function registerCommand(
    context: vscode.ExtensionContext,
    name: string,
    handler: (...args: any[]) => any,
    options: { isCommand: boolean; isMenu: boolean; isShortcut: boolean }
) {
    const { isCommand, isMenu, isShortcut } = options;

    let baseCommand = vscode.commands.registerCommand(name, async (...args: any[]) => {
        const apiKeyValid = await checkApiKeyAndPrompt(context);
        if (apiKeyValid) {
            logEvent(name, { 'type': 'commands', 'isCommand': isCommand.toString(), 'isShortcut': isShortcut.toString(), 'isMenu': isMenu.toString() });
            handler(...args);
        }
    });

    context.subscriptions.push(baseCommand);

    if (isMenu) {
        let menuCommand = vscode.commands.registerCommand(`${name}.menu`, async (...args: any[]) => {
            const apiKeyValid = await checkApiKeyAndPrompt(context);
            if (apiKeyValid) {
                logEvent(name, { 'type': 'commands', 'isCommand': isCommand.toString(), 'isShortcut': isShortcut.toString(), 'isMenu': isMenu.toString() });
                handler(...args);
            }
        });
        context.subscriptions.push(menuCommand);
    }
}

export async function initCommands(context: vscode.ExtensionContext, geminiRepo: any, analyzer: any, flutterGPTViewProvider: FlutterGPTViewProvider,) {
    const generationRepository: GenerationRepository = await getUserPrefferedModel();
    // List of commands to register, with their names and options.
    const commands = [
        { name: 'dashai.attachToDash', handler: () => addToReference(context.globalState, flutterGPTViewProvider), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dashai.createWidget', handler: async () => createWidgetFromDescription(geminiRepo, context.globalState), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dashai.createCodeFromBlueprint', handler: () => createCodeFromBlueprint(generationRepository, context.globalState), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dashai.createCodeFromDescription', handler: () => createCodeFromDescription(generationRepository, context.globalState), options: { isCommand: true, isMenu: true, isShortcut: false } },
        { name: 'dashai.refactorCode', handler: (aiRepo: GenerationRepository, globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => refactorCode(generationRepository, context.globalState, range, analyzer, elementName, context, flutterGPTViewProvider, undefined, undefined,), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dashai.fixErrors', handler: (aiRepo: GenerationRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => fixErrors(generationRepository, errors, context.globalState, range, analyzer, elementName, context), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dashai.optimizeCode', handler: (aiRepo: GenerationRepository, globalState: vscode.Memento, range: vscode.Range, anlyzer: ILspAnalyzer, elementName: string | undefined) => optimizeCode(generationRepository, context.globalState, range, anlyzer, elementName, context), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dashai.createInlineCodeCompletion', handler: () => createInlineCodeCompletion(geminiRepo), options: { isCommand: true, isMenu: true, isShortcut: true } },
        { name: 'dashai.clearChat', handler: () => flutterGPTViewProvider?.postMessageToWebview({ type: 'clearCommandDeck' }), options: { isCommand: true, isMenu: false, isShortcut: false } },
        { name: 'dashai.profile', handler: () => flutterGPTViewProvider?.postMessageToWebview({type: 'profileCommandDeck'}), options: {isCommand: true, isMenu: true, isShortcut: false} }
        // Add more commands as needed.
    ];

    // Register all commands.
    commands.forEach(cmd => registerCommand(context, cmd.name, cmd.handler, cmd.options));
}