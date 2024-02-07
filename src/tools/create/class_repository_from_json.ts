import * as vscode from 'vscode';
import { extractDartCode, extractReferenceTextFromEditor } from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';
import { GeminiRepository } from '../../repository/gemini-repository';
import { GenerationRepository } from '../../repository/generation-repository';
//not active currently. to be thought out and revised again.
export async function createRepoClassFromPostman(generationRepository: GenerationRepository, globalState: vscode.Memento) {
    logEvent('create-repo-class-from-postman', { 'type': "create" });
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

            let description = "placeholder";
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const document = editor.document;
                try {
                    description = JSON.stringify(JSON.parse(document.getText()));
                } catch (error) {
                    vscode.window.showErrorMessage(`File content doesn't seem to be a json`);
                }
            }

            if (description === "placeholder") {
                return;
            }

            const result = await generationRepository.createRepositoryFromJson(description, globalState);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });
            if (!result) {
                vscode.window.showErrorMessage(`Failed to create api service`);
                return;
            }

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
    } catch (error: Error | unknown) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`${error.message}`);
        } else {
            vscode.window.showErrorMessage(`Failed to create api service ${error}`);
        }
    }
}
