import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode, extractExplanation} from '../../utilities/code-processing';

export async function createModelClass(openAIRepo: OpenAIRepository) {
  try {
    const jsonStructure = await vscode.window.showInputBox({
      prompt: "Enter JSON structure",
      value: "",
      valueSelection: undefined,
      placeHolder: "Paste your JSON structure here",
      password: false,
      ignoreFocusOut: false,
      validateInput: undefined,
    });
    if (!jsonStructure) {
      return;
    }

    const useFreezed = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Use Freezed library?",
    });

    const useJsonSerializable = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Use JsonSerializable library?",
    });

    const includeHelpers = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Include toJson, fromJson, and copyWith methods?",
    });

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Creating Model Class",
        cancellable: false,
      },
      async (progress) => {
        let progressPercentage = 0;
        let prevProgressPercentage = 0;
        const progressInterval = setInterval(() => {
          prevProgressPercentage = progressPercentage;
          progressPercentage = (progressPercentage + 10) % 100;
          const increment = progressPercentage - prevProgressPercentage;
          progress.report({ increment });
        }, 200);

        const result = await openAIRepo.getCompletion([
          {
            role: "system",
            content: "",
          },
          {
            role: "user",
            content: `Create a Flutter model class from the following JSON structure: ${jsonStructure}. Use Freezed: ${
              useFreezed === "Yes"
            }. Use JsonSerializable: ${
              useJsonSerializable === "Yes"
            }. Include toJson, fromJson, and copyWith methods: ${includeHelpers === "Yes"}.`,
          },
        ]);
        clearInterval(progressInterval);
        progress.report({ increment: 100 });

        const dartCode = extractDartCode(result);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          editor.edit((editBuilder) => {
            const position = editor.selection.active;
            editBuilder.insert(position, dartCode);
          });
          vscode.window.showInformationMessage("Model class created successfully!");
        } else {
          vscode.window.showErrorMessage("No active editor");
        }
      }
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create model class: ${error}`);
  }
}