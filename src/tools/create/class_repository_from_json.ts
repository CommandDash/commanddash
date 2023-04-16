import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode} from '../../utilities/code-processing';

export async function createRepoClassFromPostman(openAIRepo: OpenAIRepository) {
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating API repository",
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

            let description = "placeholder"
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                try {
                    description = JSON.stringify(JSON.parse(document.getText()));
                } catch(error) {
                    vscode.window.showErrorMessage(`File content doesn't seem to be a json`);
                }
            }

            if(description === "placeholder") {
                return;
            }

            const result = await openAIRepo.getCompletion([{
                role: 'system',
                content: ''
            }, {
                'role': 'user',
                'content': `You are an expert flutter developer, Create a Flutter API repository class from the following postman export:\n${description}\nGive class an appropriate name based on the name and info of the export\nBegin!`
            }]);

            clearInterval(progressInterval);
            progress.report({ increment: 100 });
            const dartCode = extractDartCode(result);
            if (editor) {
                const document = editor.document;
                const range = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                editor.edit(editBuilder => {
                    editBuilder.replace(range, dartCode);
                });
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to create api service: ${error}`);
    }
}
