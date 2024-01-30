import * as vscode from 'vscode';
import { extractDartCode, previewCode } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';
import { filterSurroundingCode } from '../create/inline_code_completion';

export async function refactorCode(gemini: GeminiRepository, globalState: vscode.Memento, range: vscode.Range | undefined, analyzer: ILspAnalyzer, elementname: string | undefined, context: vscode.ExtensionContext) {
    logEvent('refactor-code', { 'type': 'refractor' });
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        // Get the entire document's text
        const entireDocumentText = editor.document.getText();

        var replaceRange: vscode.Range = range ?? editor.selection;

        // Get the selected text
        const selectedText = editor.document.getText(replaceRange);

        // If there's no selection, simply return or handle as needed
        if (!selectedText) {
            vscode.window.showErrorMessage('No code selected');
            return;
        }

        // Define the markers for highlighting
        const highlightStart = "<CURSOR_SELECTION>";
        const highlightEnd = "<CURSOR_SELECTION>";

        // Split the entire document into two parts, at the start of the selection
        const docStart = entireDocumentText.substring(0, editor.document.offsetAt(replaceRange.start));
        const docEnd = entireDocumentText.substring(editor.document.offsetAt(replaceRange.end));

        // Construct the final string with highlighted selected code
        const finalString = `${docStart}${highlightStart}${selectedText}${highlightEnd}${docEnd}`;


        const instructions = await vscode.window.showInputBox({ prompt: "Enter refactor instructions" });
        if (!instructions) {
            return;
        }

        let documentRefactoredText = editor.document.getText(); // Get the entire document text

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Refactoring Code",
            cancellable: false
        }, async (progress) => {
            let progressPercentage = 0;
            let prevProgressPercentage = 0;
            const progressInterval = setInterval(() => {
                prevProgressPercentage = progressPercentage;
                progressPercentage = (progressPercentage + 10) % 100;
                const increment = progressPercentage - prevProgressPercentage;
                progress.report({ increment });
            }, 200);

            let contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, editor.selection, analyzer, elementname);

            let referenceEditor = getReferenceEditor(globalState);
            let prompt = 'You are a Flutter/Dart assistant helping user modify code within their editor window.';
            prompt += `Modification instructions from user: ${instructions}. Please find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalString + '\n```\n';

            prompt = appendReferences(referenceEditor, prompt);
            if (contextualCode) {
                prompt += `\n\nHere are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
            }
            prompt += `Proceed step by step: 
            1. Describe the selected piece of code.
            2. What is the intent of user's modification?
            3. How do you plan to achieve that? [Don't output code yet]
            4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION. Since this is without human review, you need to output the precise CURSOR_SELECTION`;
            console.log(prompt);
            const result = await gemini.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);

            console.log(result);

            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            let refactoredCode = extractDartCode(result, false);
            if (!refactoredCode) {
                vscode.window.showErrorMessage('Failed to refactor code. Please try again.');
                return;
            }
            refactoredCode = refactoredCode.replace(/<CURSOR_SELECTION>/g, '');
            refactoredCode = filterSurroundingCode(editor.document.getText(), refactoredCode, replaceRange.start.line, replaceRange.end.line);
            console.log("Refactored code:", refactoredCode);


            // Modify the documentText string instead of the document directly
            const startOffset = editor.document.offsetAt(replaceRange.start);
            const endOffset = editor.document.offsetAt(replaceRange.end);

            documentRefactoredText = documentRefactoredText.substring(0, startOffset) + refactoredCode + documentRefactoredText.substring(endOffset);
        });
        vscode.window.showInformationMessage('Code refactored successfully!');

        // Pass the current editor, current document uri and optimized code respectively.
        await handleDiffViewAndMerge(editor, editor.document.uri, documentRefactoredText, context);

    } catch (error: Error | unknown) {
        logError('refactor-from-instructions-error', error);
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
        return '';
    }
}
