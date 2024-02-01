import * as vscode from 'vscode';
import { extractDartCode, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logError, logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';

export async function createWidgetFromDescription(geminiRepo: GeminiRepository, globalState: vscode.Memento) {
    logEvent('create-widget-from-description', { 'type': "create" });
    try {
        var selectedImagePath: string = "";
        var mimeTypeImage: string = "";
        const attachImage = await vscode.window.showInformationMessage('Do you want to attach an image?', 'Yes', 'No');
        if (attachImage === 'Yes') {
            const imagePath = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    Images: ['png', 'jpg', 'jpeg', 'gif', 'bmp']
                }
            });
            if (!imagePath || imagePath.length === 0) {
                return;
            }
            selectedImagePath = imagePath[0].fsPath;
            mimeTypeImage = imagePath[0].fsPath.split('.').pop()!;
            console.log(mimeTypeImage);
        }

        const description = await vscode.window.showInputBox({ prompt: "Enter widget description" });
        if (!description) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating Widget",
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
            let prompt = `You're a Flutter/Dart coding assistant. You'll be asked to generate the code of a widget from description.\n\n`;
            prompt += `Proceed step by step:\n`;
            let stepIndex = 1;
            let referenceEditor = getReferenceEditor(globalState);
            if (referenceEditor !== undefined) {
                const referenceText = extractReferenceTextFromEditor(referenceEditor);
                if (referenceText !== '') {
                    prompt += `${stepIndex}. Analyze these reference and context to understand the code writing style, theming, state management and or dependencies that might come handy while generating the next widget.`;
                    prompt += `\n${referenceText}\n`;
                    stepIndex++;
                    prompt += `${stepIndex}. Using the reference and contexts analyzed previously, generate a widget for description: ${description}.\n`;
                    stepIndex++;
                }
            } else {
                prompt += `${stepIndex}. Create a Flutter Widget from the following description: ${description}.\n`;
                stepIndex++;
            }
            prompt += `${stepIndex}. Output code in a single block`;
            stepIndex++;
            console.debug(prompt);

            var result: string = "";

            if (selectedImagePath !== undefined && selectedImagePath.length > 0) {
                result = await geminiRepo.generateTextFromImage(prompt, selectedImagePath, `image/${mimeTypeImage}`);
            } else {
                result = await geminiRepo.getCompletion([{
                    'role': 'user',
                    'parts': prompt
                }]);
            }

            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            const dartCode = extractDartCode(result);
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editor.edit((editBuilder) => {
                    const position = editor.selection.active;
                    editBuilder.insert(position, dartCode);
                });
                vscode.window.showInformationMessage('Widget created successfully!');
            } else {
                vscode.window.showErrorMessage('No active editor');
            }
        });
    } catch (error: Error | unknown) {
        logError('widget-from-description-error', error);
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Error creating widget: ${error}`);
        }
        return '';
    }
}