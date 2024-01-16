import * as vscode from 'vscode';
import { GeminiRepository } from '../../repository/gemini-repository';
import { logEvent } from '../../utilities/telemetry-reporter';
import path = require('path');


// async function startProcess(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
//     vscode.window.withProgress({
//         location: vscode.ProgressLocation.Notification,
//         title: "FlutterGPT: Generating relevant suggestions",
//         cancellable: false}, (_progress, _token) => {
//             return createInlineCodeCompletion(geminiRepo, globalState);
//         });
// }

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
             
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const currentFile = path.relative(workspaceRoot, document.fileName);
                const lineText = document.lineAt(position.line).text.substring(0, position.character);
                // const relevantText = extractRelevantText(lineText);
                const suggestions = await generateSuggestions() ?? [];
                // Convert the Gemini response to InlineCompletionItems
                const completionItems = suggestions.map((suggestion) => ({
                    insertText: suggestion,
                    range: new vscode.Range(position.translate(0, -lineText.length), position),
                }));
                console.log(completionItems);
                return completionItems;
            }
            else {
                console.log('no completion items');
                return [];
            }
        },
    }
);

export async function createInlineCodeCompletion(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
    // manual trigger using shortcut ctrl+space
    logEvent('create-inline-code-completion', { 'type': "create" });
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: 'FlutterGPT: Generating code'
    }, async (progress) => {
        const out = await generateSuggestions();
        if (out?.length === 0) {
            vscode.window.showErrorMessage('Could not generate code');
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        editor.edit(editBuilder => {
            editBuilder.replace(editor.document.lineAt(editor.selection.active.line).range, out![0]);
          });
    });
}

async function generateSuggestions() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const currentFile = path.relative(workspaceRoot, editor.document.fileName);
                const currentLineContent = editor.document.lineAt(editor.selection.active.line).text.trim();
                const relevantFiles = await GeminiRepository.getInstance().findClosestDartFiles("Filename:" + currentFile + "\n\n" + "Line of code:" + currentLineContent);
                const prompt = "You've complete access to the flutter codebase. I'll provide you with top 5 relevant file's code as context and your job is do code completion for the line of code I'm providing. Respond with the code completion and inline comments only. Do not add detailed explanations. If you're unable to find answer for the requested prompt, return with a possible prediction of what this line of code might end up be. Here's the relevant file's code: \n\n" + relevantFiles + "\n\n and here is the line of code that needs completion:" + currentLineContent + "in the file" + currentFile + "at line" + editor.selection.active.line;
                const _conversationHistory: Array<{ role: string; parts: string }> = [];
                _conversationHistory.push({ role: "user", parts: prompt });
                const result = await GeminiRepository.getInstance().getCompletion(_conversationHistory);
                console.log(result);
                return [result];
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
    }
}

