import * as vscode from 'vscode';
import { GeminiRepository } from '../repository/gemini-repository';
import { refactorCode } from '../tools/refactor/refactor_from_instructions';
import { ILspAnalyzer } from '../shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from '../shared/types/constants';
export class RefactorActionManager {

  constructor() { }

  static async handleRequest(chipsData: any, data: any, aiRepo: GeminiRepository, context: vscode.ExtensionContext, analyzer: ILspAnalyzer) {
    const chip = chipsData.next().value;
    const editorUri = chip.referenceData.editor;
    const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === editorUri);
    const selection = chip.referenceData.selection;
    const range: vscode.Range = new vscode.Range(new vscode.Position(selection.start.line, selection.start.character), new vscode.Position(selection.end.line, selection.end.character));
    await refactorCode(aiRepo!, context.globalState, range, analyzer, undefined, context, editor, data.message);
    return { role: "dash", parts: "", messageId: "", data: chip, buttons: ["accept", "decline"], agent: "refactor", };
  }
}