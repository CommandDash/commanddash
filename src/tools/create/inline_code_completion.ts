import * as vscode from 'vscode';
import { GeminiRepository } from '../../repository/gemini-repository';
import { logEvent } from '../../utilities/telemetry-reporter';
import path = require('path');
import { extractDartCode } from '../../utilities/code-processing';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from '../../shared/types/constants';

let currentInlineCompletionLine: number | undefined;

const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { language: 'dart' },
    {
        async provideInlineCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position,
            context: vscode.InlineCompletionContext,
            token: vscode.CancellationToken
        ): Promise<vscode.InlineCompletionItem[] | undefined> {
            console.log('completion triggered');
            if (context.triggerKind === 1) { // only manual allowed
                return;
            }
            const editor = vscode.window.activeTextEditor;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0 && editor) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;

                vscode.window.showInformationMessage('FlutterGPT: Generating code, please wait.');

                // Convert the Gemini response to InlineCompletionItems
                const suggestions = await new Promise<string[]>((resolve) => {
                    resolve(generateSuggestions());
                });

                const completionItems = suggestions.map((suggestion) => ({
                    insertText: suggestion,
                    command: {
                        command: "fluttergpt.inlineCodeCompletion.cleanup",
                        title: "FlutterGPT: Code cleanup",
                    }
                }));
                console.log(completionItems);
                currentInlineCompletionLine = editor.selection.active.line;
                return completionItems;
            }
            else {
                console.log('no completion items');
                return [];
            }
        },
    }
);

vscode.commands.registerCommand(
    "fluttergpt.inlineCodeCompletion.cleanup",
    async () => {
        if (currentInlineCompletionLine) {
            if (currentInlineCompletionLine === -1) {
                return;
            }
            replaceLineOfCode(currentInlineCompletionLine, "");
            currentInlineCompletionLine = -1;
        }
        // format the document
      vscode.commands.executeCommand("editor.action.formatDocument");
    }
  );

function replaceLineOfCode(line: number, replaceString: string) {
    const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        editor.edit(editBuilder => {
            editBuilder.replace(editor.document.lineAt(line).range, replaceString);
        });
}

export async function createInlineCodeCompletion(geminiRepo: GeminiRepository) {
    // manual trigger using shortcut ctrl+space
    logEvent('create-inline-code-completion', { 'type': "create" });
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: 'FlutterGPT: Generating code, please wait.'
    }, async (progress) => {
        const out = await generateSuggestions();
        if (out?.length === 0) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            replaceLineOfCode(editor?.selection.active.line, out![0]);
        }
    });
}


async function generateSuggestions(): Promise<string[]> {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return [];
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const currentFile = path.relative(workspaceRoot, editor.document.fileName);
            const currentLineContent = editor.document.lineAt(editor.selection.active.line).text.trim();
            if (currentLineContent.length === 0) {
                throw new Error('FlutterGPT: No context to generate code, start writing code to give context.');
            }
            const position = editor.selection.active;
            const fileContent = editor.document.getText();
            var relevantFiles = await GeminiRepository.getInstance().findClosestDartFiles("Filename:" + currentFile + "\n\n" + "Line of code:" + currentLineContent);
            const contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, editor.document.lineAt(editor.selection.active.line).range, getDartAnalyser(), undefined); 
            if (contextualCode && contextualCode.length > 0) { // contextual code might not be available in all cases. Improvements are planned for contextual code gen.
                relevantFiles = relevantFiles + "\n" + contextualCode;
            }
            
            const prompt = 'You\'ve complete access to the flutter codebase. I\'ll provide you with relevant file\'s code as context and your job is do code completion for the line of code I\'m providing. Respond with the code completion and inline comments only. Do not add detailed explanations. If you\'re unable to find answer for the requested prompt, return with a possible prediction of what this line of code might end up be. if the completion is inside a widget, only return the relevant completion and not the entire child. Here\'s the relevant files: \n\n' + relevantFiles + '\n\n and here is the content of current file:\n' + fileContent + '. Code completion to be at cursor position: Line ' + (position.line + 1) + ', Character ' + (position.character + 1);
            
            const _conversationHistory: Array<{ role: string; parts: string }> = [];
            _conversationHistory.push({ role: "user", parts: prompt });
            const result = await GeminiRepository.getInstance().getCompletion(_conversationHistory);
            return [extractDartCode(result)];
        }
        else {
            return [];
        }
    }
    catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
        }
        return [];
    }
}

function getDartAnalyser() { // This could be in a wider scope.
    const dartExt = vscode.extensions.getExtension(dartCodeExtensionIdentifier);
    if (!dartExt) {
        // This should not happen since the FlutterGPT extension has a dependency on the Dart one
        // but just in case, we'd like to give a useful error message.
        vscode.window.showWarningMessage("Kindly install 'Dart' extension to activate FlutterGPT");
    }
    // Assumption is the dart extension is already activated 
    if (!dartExt?.exports) {
        console.error("The Dart extension did not provide an exported API. Maybe it failed to activate or is not the latest version?");
    }

    const analyzer: ILspAnalyzer = dartExt?.exports._privateApi.analyzer;
    return analyzer;
}
