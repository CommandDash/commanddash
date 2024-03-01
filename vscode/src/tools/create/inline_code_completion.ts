import * as vscode from 'vscode';
import { GeminiRepository } from '../../repository/gemini-repository';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import path = require('path');
import { extractDartCode, filterSurroundingCode } from '../../utilities/code-processing';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from '../../shared/types/constants';
import { CacheManager } from '../../utilities/cache-manager';

// TODO: commenting this as it is leading to errors that are redacted by the telemetry. 
// Could be added back, once we are able to identify the issue.

// const disposable = vscode.languages.registerInlineCompletionItemProvider(
//     { language: 'dart' },
//     {
//         async provideInlineCompletionItems(
//             document: vscode.TextDocument,
//             position: vscode.Position,
//             context: vscode.InlineCompletionContext,
//             token: vscode.CancellationToken,
//         ): Promise<vscode.InlineCompletionItem[] | undefined> {
//             console.log('completion triggered');
//             if (context.triggerKind === 1) { // only manual allowed
//                 return;
//             }
//             const editor = vscode.window.activeTextEditor;
//             if (editor) {
//                 vscode.window.showInformationMessage('FlutterGPT: Generating code, please wait.');

//                 // Convert the Gemini response to InlineCompletionItems
//                 const suggestions = await new Promise<string[]>((resolve) => {
//                     resolve(generateSuggestions());
//                 });

//                 const completionItems = suggestions.map((suggestion) => ({
//                     insertText: suggestion,
//                     command: {
//                         command: "fluttergpt.inlineCodeCompletion.cleanup",
//                         title: "FlutterGPT: Code cleanup",
//                     }
//                 }));
//                 console.log('COMPLETION ITEMS:');
//                 console.log(completionItems[0]);
//                 return completionItems;
//             }
//         }
//     }
// );

// disposable.dispose();

// vscode.commands.registerCommand(
//     "fluttergpt.inlineCodeCompletion.cleanup",
//     async () => {
//         vscode.commands.executeCommand("editor.action.formatDocument");
//     }
// );

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

export async function createInlineCodeCompletion() {
    // manual trigger using shortcut ctrl+space
    logEvent('create-inline-code-completion', { 'type': "create" });
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
        title: 'FlutterGPT: Generating code, please wait.'
    }, async (progress, token: vscode.CancellationToken) => {
        const cacheManager = CacheManager.getInstance();
        cacheManager.incrementInlineCompletionCount();
        const out = await generateSuggestions();      
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            replaceLineOfCode(editor?.selection.active.line, out[0]);
        }
        logEvent('create-inline-code-completion-success');
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
        const filepath = editor.document.fileName; // don't include currentFile in most relevant files.
        console.log("Current file path:", filepath);
        ///TODO: Replace with Generation Repository
        var relevantFiles = await GeminiRepository.getInstance().findClosestDartFiles("Current file content:" + editor.document.getText() + "\n\n" + "Line of code:" + currentLineContent, undefined, true, filepath);
        // Add code for all the elements used in the file.
        const contextualCode = await new ContextualCodeProvider().getContextualCodeForCompletion(editor.document, getDartAnalyser());
        if (contextualCode && contextualCode.length > 0) { // contextual code might not be available in all cases. Improvements are planned for contextual code gen.
            // TODO: avoid duplications from the relevant files.
            relevantFiles = relevantFiles + "\n" + contextualCode;
        }

        const beforeCursor = fileContent.substring(0, editor.document.offsetAt(position));
        const afterCursor = fileContent.substring(editor.document.offsetAt(position));

        // Add "CURSOR" between the two parts
        const modifiedContent = beforeCursor + "[CURSOR]" + afterCursor;

        const prompt = `You are a Flutter Inline Code Generation expert. You look at the [CURSOR] position of the user and understand the code before and after it.
        Also analyze and refer the contextual code attached from the project.
        Respond with the code block that should be inserted at the cursor position by predicting what user is trying to accomplish.

        Here is the current active editor:
        \`\`\`
        ${modifiedContent}
        \`\`\`

        Some contextual code that might be relevant:
        \`\`\`
        ${relevantFiles}
        \`\`\`

        Output the code block to be inserted when the user [CURSOR] is at.`;
        const _conversationHistory: Array<{ role: string; parts: string }> = [];
        _conversationHistory.push({ role: "user", parts: prompt });
        const result = await GeminiRepository.getInstance().getCompletion(_conversationHistory);
        let sanitisedCode = filterSurroundingCode(fileContent, extractDartCode(result), position.line);
        return [sanitisedCode];

    }
    catch (error: Error | unknown) {
        logError('inline-code-completion-error', error);
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
