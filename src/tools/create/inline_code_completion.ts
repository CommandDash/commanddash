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
            if (editor) {
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
        }
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
        console.log(out);
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
        const currentLineContent = editor.document.lineAt(editor.selection.active.line).text.trim();
        const position = editor.selection.active;
        const fileContent = editor.document.getText();
        var relevantFiles = await GeminiRepository.getInstance().findClosestDartFiles("Current file content:" + editor.document.getText() + "\n\n" + "Line of code:" + currentLineContent);
        const contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, editor.document.lineAt(position.line).range, getDartAnalyser(), undefined);
        if (contextualCode && contextualCode.length > 0) { // contextual code might not be available in all cases. Improvements are planned for contextual code gen.
            relevantFiles = relevantFiles + "\n" + contextualCode;
        }

        const beforeCursor = fileContent.substring(0, editor.document.offsetAt(position));
        const afterCursor = fileContent.substring(editor.document.offsetAt(position));

        // Add "CURSOR" between the two parts
        const modifiedContent = beforeCursor + "CURSOR" + afterCursor;

        const prompt = 'You\'ve complete access to the flutter codebase. I\'ll provide you with relevant file\'s code as context and your job is do code completion for the line of code I\'m providing. Respond with the code completion and inline comments only. Do not add detailed explanations. If you\'re unable to find answer for the requested prompt, return with a possible prediction of what this line of code might end up be. if the completion is inside a widget, only return the relevant completion and not the entire child. Here\'s the relevant files: \n\n' + relevantFiles + '\n\n and here is the content of current file:\n' + modifiedContent + '. Code completion to be at cursor position marked by "CURSOR"';

        const _conversationHistory: Array<{ role: string; parts: string }> = [];
        _conversationHistory.push({ role: "user", parts: prompt });
        const result = await GeminiRepository.getInstance().getCompletion(_conversationHistory);
        let sanitisedCode = filterSurroundingCode(fileContent, extractDartCode(result), position.line);
        return [sanitisedCode ?? ''];

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


function sanitizeCompletionCode(originalContent: string, completionCode: string, lineNumberToReplace: number): string | null {
    // Split the original content into lines
    const lines = originalContent.split('\n');

    // Check if the specified line number is within a valid range
    if (lineNumberToReplace < 0 || lineNumberToReplace >= lines.length) {
        console.error('Invalid line number.');
        return null;
    }

    // Find the start and end indices of the line to be replaced
    const lineStart = originalContent.indexOf(lines[lineNumberToReplace]);
    const lineEnd = lineStart + lines[lineNumberToReplace].length;

    let sanitizedCompletionCode = completionCode;
    for (let i = 0; i < lines[lineNumberToReplace].length; i++) {
        const charInOriginal = originalContent[lineStart + i];
        const charInCompletion = completionCode[i];

        if (charInOriginal === charInCompletion) {
            sanitizedCompletionCode.replace(charInCompletion, '');
        }
    }

    for (let i = 0; i < lines[lineNumberToReplace].length; i++) {
        const charInOriginal = originalContent[lineEnd - i - 1];
        const charInCompletion = completionCode[completionCode.length - i - 1];

        if (charInOriginal === charInCompletion) {
            sanitizedCompletionCode.replace(charInCompletion, '');
        }
    }

    return sanitizedCompletionCode;
}

export function filterSurroundingCode(orignalContent: string, codeCompletion: string, splitLineNumber: number ):string{
    const orginalContentLines = orignalContent.split('\n');
    let codeCompletionLines = codeCompletion.split('\n');
    
    const preInsertLines = orginalContentLines.slice(0, splitLineNumber);
    const afterInsertLines = orginalContentLines.slice(splitLineNumber);

    // for (let i = 0; i < codeCompletionLines.length; i++){
    const codeCompletionLine = removeWhitespaces(codeCompletionLines[0]);
    for (let i = preInsertLines.length-1; i > 0; i--){
        const existingLine = removeWhitespaces(preInsertLines[i]);
        if (codeCompletionLine===existingLine){
            let fullMatch = true;
            for (let j = 1; j < preInsertLines.length-i; j++){
                const followingCodeCompletionLine = removeWhitespaces(codeCompletionLines[j]);
                const followingExistingLine = removeWhitespaces(preInsertLines[i+j]);
                if(followingCodeCompletionLine!==followingExistingLine){
                    fullMatch = false;
                    break;
                }
            }
            if (fullMatch){
                codeCompletionLines = codeCompletionLines.slice(preInsertLines.length-i);
                break;
            }
        }
    }
    
    // Cleanup logic for after lines
    const lastCodeCompletionLine = removeWhitespaces(codeCompletionLines[codeCompletionLines.length - 1]);
    for (let i = 0; i < afterInsertLines.length; i++) {
        const existingLine = removeWhitespaces(afterInsertLines[i]);
        if (lastCodeCompletionLine === existingLine) {
            let fullMatch = true;
            for (let j = 1; j < afterInsertLines.length - i; j++) {
                if (i<j){
                    fullMatch = false;
                    break;
                }
                const followingCodeCompletionLine = removeWhitespaces(codeCompletionLines[codeCompletionLines.length - 1 - j]);
                const followingExistingLine = removeWhitespaces(afterInsertLines[i - j]);
                if (followingCodeCompletionLine !== followingExistingLine) {
                    fullMatch = false;
                    break;
                }
            }
            if (fullMatch) {
                codeCompletionLines = codeCompletionLines.slice(0, codeCompletionLines.length - (afterInsertLines.length - i));
                break;
            }
        }
    }

    // Join the cleaned up code completion lines with the original content lines
    const result = codeCompletionLines.join('\n');

    console.log(result);
    return result;
}

function removeWhitespaces(line: string): string {
return line.replace(/\s/g, "");
}
