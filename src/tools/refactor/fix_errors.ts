import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode, extractExplanation, extractReferenceTextFromEditor} from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';

export async function fixErrors(openAIRepo: OpenAIRepository, errorType: 'runtime' | 'compile-time' = 'runtime', globalState: vscode.Memento) {
    logEvent('fix-errors', { 'type': 'refractor' });
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const selectedCode = editor.document.getText(editor.selection);
    if (!selectedCode) {
        vscode.window.showErrorMessage('No code selected');
        return;
    }

    let errorsDescription: string | undefined;

    if (errorType === 'runtime') {
        errorsDescription = await vscode.window.showInputBox({ prompt: "Enter the errors you're facing" });
        if (!errorsDescription) {
            return;
        }
    } else if (errorType === 'compile-time') {
        //TODO: implement compile-time errors
        // const analysisErrors = await analyzeCode(selectedCode);
        // if (analysisErrors.length === 0) {
        //     vscode.window.showInformationMessage('No compile-time issues found');
        //     return;
        // }
        // errorsDescription = analysisErrors.map(error => error.message).join('\n');
    }

    const fullCode = editor.document.getText();

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
    
            let prompt = `Follow the instructions carefully and to the letter. You're a Flutter/Dart debugging expert.\n\n`;
            prompt += `Here's a piece of Flutter code with ${errorType} errors:\n\n${selectedCode}\n\n`;
            if (errorsDescription) {
                prompt += `The errors are: ${errorsDescription}\n\n`;
            } else {
                prompt += `The full code context is:\n\n${fullCode}\n\n`;
            }
            let referenceEditor = getReferenceEditor(globalState);
            if(referenceEditor!==undefined){
              const referenceText = extractReferenceTextFromEditor(referenceEditor);
              if(referenceText!==''){
                  prompt+=`Some references that might help: \n${referenceText}\n`;
              }
            }
            prompt += `Output the fixed code in a single code block.`;

            const result = await openAIRepo.getCompletion([ {
                'role': 'user',
                'content': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const fixedCode = extractDartCode(result);
            const explanation = extractExplanation(result);
            editor.edit((editBuilder) => {
                editBuilder.replace(editor.selection, fixedCode);
            });
            vscode.window.showInformationMessage(explanation);
        });
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to fix code: ${error}`);
        }
        return '';
    }
}