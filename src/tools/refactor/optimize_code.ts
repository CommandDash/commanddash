import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';
import { filterSurroundingCode } from '../create/inline_code_completion';

export async function optimizeCode(geminiRepo: GeminiRepository, globalState: vscode.Memento, range: vscode.Range | undefined, analyzer: ILspAnalyzer, elementName: string | undefined, context: vscode.ExtensionContext) {
    logEvent('optimize-code', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }
    // Get the entire document's text
    const entireDocumentText = editor.document.getText();

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

    // Define the markers for highlighting
    const highlightStart = "<CURSOR_SELECTION>";
    const highlightEnd = "<CURSOR_SELECTION>";

    // Split the entire document into two parts, at the start of the selection
    const docStart = entireDocumentText.substring(0, editor.document.offsetAt(replaceRange.start));
    const docEnd = entireDocumentText.substring(editor.document.offsetAt(replaceRange.end));

    // Construct the final string with highlighted selected code
    const finalString = `${docStart}${highlightStart}${selectedCode}${highlightEnd}${docEnd}`;

    let documentRefactoredText = editor.document.getText(); // Get the entire document text

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Optimizing Code",
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

            let contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, replaceRange, analyzer, elementName);

            let prompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and output response in the modified format..\n\n`;
            prompt += `Develop and optimize the following Flutter code by troubleshooting errors, fixing errors, and identifying root causes of issues. Reflect and critique your solution to ensure it meets the requirements and specifications of speed, flexibility and user friendliness.\n\n Please find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalString + '\n```\n\n';
            if (contextualCode) {
                prompt += `Here are the definitions of the symbols used in the code\n${contextualCode} \n\n`;
            }
            let referenceEditor = getReferenceEditor(globalState);
            prompt = appendReferences(referenceEditor, prompt);
            // prompt += `Output the optimized code in a single code block to be replaced over selected code.`;
            prompt += `Proceed step by step:
            1. Describe the selected piece of code.
            2. What are the possible optimizations?
            3. How do you plan to achieve that ? [Don't output code yet]
            4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION.Since this is without human review, you need to output the precise CURSOR_SELECTION`;
            console.log(prompt);
            const result = await geminiRepo.getCompletion([{
                'role': 'user',
                'parts': prompt
            }]);

            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            let optimizedCode = extractDartCode(result);
            if (!optimizedCode) {
                vscode.window.showErrorMessage('Failed to optimize code. Please try again.');
                return;
            }
            optimizedCode = optimizedCode.replace(/<CURSOR_SELECTION>/g, '');
            optimizedCode = filterSurroundingCode(editor.document.getText(), optimizedCode, replaceRange.start.line, replaceRange.end.line);
            console.log("Optimized code:", optimizedCode);


            // Modify the documentText string instead of the document directly
            const startOffset = editor.document.offsetAt(replaceRange.start);
            const endOffset = editor.document.offsetAt(replaceRange.end);
            documentRefactoredText = documentRefactoredText.substring(0, startOffset) + optimizedCode + documentRefactoredText.substring(endOffset);
        });
        vscode.window.showInformationMessage('Code optimization successful!');

        // Pass the current editor, current document uri and optimized code respectively.
        await handleDiffViewAndMerge(editor, editor.document.uri, documentRefactoredText, context);
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to fix code: ${error}`);
        }
        return '';
    }
}