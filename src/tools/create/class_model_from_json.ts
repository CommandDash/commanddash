import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import {extractDartCode, extractExplanation, extractReferenceTextFromEditor} from '../../utilities/code-processing';
import { getReferenceEditor } from '../../utilities/state-objects';
import { logEvent } from '../../utilities/telemetry-reporter';

export async function createModelClass(openAIRepo: OpenAIRepository, globalState: vscode.Memento ) {
  logEvent("create-model-class", { 'type': "create" });
  try {
    const jsonStructure = await vscode.window.showInputBox({
      prompt: "Enter JSON structure",
      value: "",
      valueSelection: undefined,
      placeHolder: "Paste your JSON structure here",
      password: false,
      ignoreFocusOut: false,
      validateInput: (value: string) => {
        try {
          JSON.parse(value);
          return null;
        } catch (e: any) {
          return e.message;
        }
      },
    });
    if (!jsonStructure) {
      return;
    }

    const library = await vscode.window.showQuickPick(["None", "Freezed", "JsonSerializable"], {
      placeHolder: "Select a library",
    });

    const includeHelpers = await vscode.window.showQuickPick(["Yes", "No"], {
      placeHolder: "Include toJson, fromJson, and copyWith methods?",
    });

    await vscode.window.withProgress(
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
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        let referenceEditor = getReferenceEditor(globalState);
        if(referenceEditor!==undefined){
          const referenceText = extractReferenceTextFromEditor(referenceEditor);
          if(referenceText!==''){
              prompt+=`Keeping in mind these references/context:\n${referenceText}\n`;
          }
        }
        prompt += `Create a Flutter model class, keeping null safety in mind for from the following JSON structure: ${jsonStructure}.`;

        if(library!=='None') {
          prompt+= `Use ${library}`;
        }
        if(includeHelpers==='Yes'){
          prompt+= `Make sure toJson, fromJson, and copyWith methods are included.`;
        }
        prompt+= `Output the model class code in a single block.`;

        const result = await openAIRepo.getCompletion([
          {
            role: "user",
            content: prompt
          }
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
    
  } catch (error: Error | unknown) {
    if(error instanceof Error){
        vscode.window.showErrorMessage(`${error.message}`);
    } else {
        vscode.window.showErrorMessage(`Failed to create model class ${error}`);
    }
  }
  
}