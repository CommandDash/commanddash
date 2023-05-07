import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import { extractDartCode, extractExplanation, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';

export async function optimizeCode(openAIRepo: OpenAIRepository, globalState: vscode.Memento) {
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

    const fullCode = editor.document.getText();

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
    
            let prompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and to the letter.\n\n`;
            prompt += `Develop and optimize the following Flutter code by troubleshooting errors, fixing errors, and identifying root causes of issues. Reflect and critique your solution to ensure it meets the requirements and specifications of speed, flexibility and user friendliness.\n\nCode:\n${selectedCode}\n\n`;
            let referenceEditor = getReferenceEditor(globalState);
            if(referenceEditor!==undefined){
              const referenceText = extractReferenceTextFromEditor(referenceEditor);
              if(referenceText!==''){
                  prompt+=`Some references that might help: \n${referenceText}\n`;
              }
            }
            prompt += `Output the optimized code in a single code block.`;

            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const optimizedCode = extractDartCode(result);
            const explanation = extractExplanation(result);
            editor.edit((editBuilder) => {
                editBuilder.replace(editor.selection, optimizedCode);
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