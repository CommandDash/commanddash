import * as vscode from 'vscode';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor, filterSurroundingCode } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { appendReferences } from '../../utilities/prompt_helpers';
import { ILspAnalyzer } from '../../shared/types/LspAnalyzer';
import { ContextualCodeProvider } from '../../utilities/contextual-code';
import { handleDiffViewAndMerge } from '../../utilities/diff-utils';
import { GenerationRepository } from '../../repository/generation-repository';

export async function fixErrors(generationRepository: GenerationRepository, errors: vscode.Diagnostic[], globalState: vscode.Memento, range: vscode.Range, analyzer: ILspAnalyzer, elementName: string | undefined, context: vscode.ExtensionContext) {
    logEvent('fix-errors', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    var selectedCode = editor.document.getText(range);
    var replaceRange = range;
    let errorsDescription = errors.map((e) => `Message:${e.message}\nSeverity:${e.severity}`).join('\n');
    const fullCode = editor.document.getText();

    // Get the entire document's text
    const entireDocumentText = editor.document.getText();

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
            title: "Debugging Errors",
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

            const contextualCode = await new ContextualCodeProvider().getContextualCode(editor.document, replaceRange, analyzer, elementName);

            let prompt = `Follow the instructions carefully and to the letter. You're a Flutter/Dart debugging expert.\n\n`;
            prompt += ` Please find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalString + '\n```\n\n';
            if (errorsDescription) {
                prompt += `The errors are: ${errorsDescription}\n\n`;
            } else {
                prompt += `The full code context is:\n\n${fullCode}\n\n`;
            }
            if (contextualCode) {
                prompt += `Here are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
            }
            prompt = appendReferences(getReferenceEditor(globalState), prompt);

            prompt += `First give a short explanation and then output the fixed code in a single code block to be replaced over the selected code.`;
            prompt += `Proceed step by step: 
            1. Describe the selected piece of code and the error.
            2. What is the cause of the error?
            3. How do you plan to fix that? [Don't output code yet]
            4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION. Since this is without human review, you need to output the precise CURSOR_SELECTION`;

            const result = await generationRepository.fixErrors(finalString, contextualCode, errorsDescription, globalState);
            if (!result) {
                vscode.window.showErrorMessage('Failed to fix code. Please try again.');
                return;
            }
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            let fixedCode = extractDartCode(result);
            if (!fixedCode) {
                vscode.window.showErrorMessage('Failed to fix code. Please try again.');
                return;
            }
            const explanation = extractExplanation(result);
            fixedCode = fixedCode.replace(/<CURSOR_SELECTION>/g, '');
            fixedCode = filterSurroundingCode(editor.document.getText(), fixedCode, replaceRange.start.line, replaceRange.end.line);
            console.log("Optimized code:", fixedCode);


            // Modify the documentText string instead of the document directly
            const startOffset = editor.document.offsetAt(replaceRange.start);
            const endOffset = editor.document.offsetAt(replaceRange.end);
            documentRefactoredText = documentRefactoredText.substring(0, startOffset) + fixedCode + documentRefactoredText.substring(endOffset);
            vscode.window.showInformationMessage(explanation);
        });

        // Pass the current editor, current document uri and optimized code respectively.
        await handleDiffViewAndMerge(editor, editor.document.uri, editor.document.getText(), documentRefactoredText, context);

    } catch (error: Error | unknown) {
        logError('fix-errors-error', error);
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to fix code: ${error}`);
        }
        return '';
    }
}