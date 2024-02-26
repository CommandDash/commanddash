import * as vscode from 'vscode';
import { GeminiRepository } from '../repository/gemini-repository';
import { refactorCode } from '../tools/refactor/refactor_from_instructions';
import { ILspAnalyzer } from '../shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from '../shared/types/constants';
export class RefactorActionManager {

  constructor() { }

  static async handleRequest(chipsData: any, data: any, aiRepo: GeminiRepository, context: vscode.ExtensionContext, analyzer: ILspAnalyzer) {

    const chip = Object.values(chipsData).values().next().value;
    data.message = data.message.replace(chip.chipId, '');
    const editorUri = chip.referenceData.editor;
    const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === editorUri);
    const selection = chip.referenceData.selection;
    const range: vscode.Range = new vscode.Range(new vscode.Position(selection.start.line, selection.start.character), new vscode.Position(selection.end.line, selection.end.character));
    const optimizedCode = await refactorCode(aiRepo!, context.globalState, range, analyzer, undefined, context, editor, data.message, false);
    return {
      role: "dash", parts: 'Do you want to merge these changes?', messageId: "", data: {
        'chip': chip,
        'optimizedCode': optimizedCode,
        'originalCodeUri': editorUri,
      }, buttons: ["accept", "decline"], agent: "diffView",
    };
  }
}