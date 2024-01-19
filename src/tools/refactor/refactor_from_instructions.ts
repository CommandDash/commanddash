import * as vscode from 'vscode';
import { extractDartCode, previewCode } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';

export async function refactorCode(gemini: GeminiRepository, globalState: vscode.Memento, range: vscode.Range | undefined, analyzer: ILspAnalyzer, elementname: string | undefined) {
    logEvent('refactor-code', { 'type': 'refractor' });
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        var selectedCode = editor.document.getText(editor.selection);
        var replaceRange: vscode.Range;
        replaceRange = editor.selection;
        if (!selectedCode) {
            if (range === undefined) {
                vscode.window.showErrorMessage('No code selected');
                return;
            }
            // if no code is selected, we use the range 
            selectedCode = editor.document.getText(range);
            replaceRange = range;
        }

        const instructions = await vscode.window.showInputBox({ prompt: "Enter refactor instructions" });
        if (!instructions) {
            return;
        }

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

            let contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, replaceRange, analyzer, elementname);

            let referenceEditor = getReferenceEditor(globalState);
            let brainstormingPrompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and output the response in the mentioned format.\n\n`;
            brainstormingPrompt += `Modify the following Flutter code based on the user instructions: ${instructions}\n\nHIGHLIGHTED CODE BY USER:\n${selectedCode}\n\nFull File Code:\n${editor.document.getText()}\n\n`;
            brainstormingPrompt = appendReferences(referenceEditor, brainstormingPrompt);
            if (contextualCode) {
                brainstormingPrompt += `\n\nHere are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
            }
            brainstormingPrompt += `Without writing any code, first brainstorm the following: 
            1. What does the user want to accomplish.  
            2. How do you plan to achieve that?
            3. Do we just need to replace existing highlighted code by user or insert some new snippets as well? (don't write code yet)
            4. Based on all above, if the modifications are only to be made in the user highligted code. OUTPUT: SELECTED_CODE_IS_SUFFICIENT or if we need to make insert or replace code in other parts of file, output OUTSIDE_AMENDS_REQUIRED`;
            console.log(brainstormingPrompt);
            const brainstormingResult = await gemini.getCompletion([{
                'role': 'user',
                'parts': brainstormingPrompt
            }]);
            console.log(brainstormingResult);
            let result: string;
            let onlyReplaceSelected: boolean = false;
            // Handle the case when SELECTED_CODE_IS_SUFFICE exists in brainstorming_result
            if (brainstormingResult.includes('SELECTED_CODE_IS_SUFFICIENT')) {
                brainstormingPrompt += brainstormingResult;
                brainstormingPrompt += `\n\nRemember, the higlighted code by user was:
                \`\`\`
                ${previewCode(selectedCode)}
                \`\`\`
                Now, Output the updated code replacement for the code highlighted by the user. The updated code will be pasted directly into the IDE in place of the highlighted code so make sure you cover the correct the entire highlighted code.`;
                console.log(brainstormingPrompt);
                result = await gemini.getCompletion([{
                    'role': 'user',
                    'parts': brainstormingPrompt
                }]);
                onlyReplaceSelected = true;
            } else if (editor.document.lineCount < 300) {
                // replace full code if line count is controlled.
                brainstormingPrompt += brainstormingResult;
                brainstormingPrompt += '\n\nOutput the modified code for the full file code.';
                console.log(brainstormingPrompt);
                result = await gemini.getCompletion([{
                    'role': 'user',
                    'parts': brainstormingPrompt
                }]);
            } else {
                // TODO: 
                onlyReplaceSelected = true;
                brainstormingPrompt += brainstormingResult;
                brainstormingPrompt += '\n\nMerge and output all the required inside and outside code modifications in a single block of code.';
                console.log(brainstormingPrompt);
                result = await gemini.getCompletion([{
                    'role': 'user',
                    'parts': brainstormingPrompt
                }]);
            }

            console.log(result);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const refactoredCode = extractDartCode(result);
            console.log("Refactored code:", refactoredCode);
            let documentRefactoredText = editor.document.getText(); // Get the entire document text

            if (onlyReplaceSelected) {
                // Modify the documentText string instead of the document directly
                const startOffset = editor.document.offsetAt(replaceRange.start);
                const endOffset = editor.document.offsetAt(replaceRange.end);
                documentRefactoredText = documentRefactoredText.substring(0, startOffset) + refactoredCode + documentRefactoredText.substring(endOffset);
            }

            // Pass the current editor, current document uri and optimized code respectively.
            await handleDiffViewAndMerge(editor, editor.document.uri, documentRefactoredText);
            vscode.window.showInformationMessage('Code refactored successfully!');
        });
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
        }
        return '';
    }
}
