import * as vscode from 'vscode';
import { GeminiRepository } from '../repository/gemini-repository';
import { refactorCode } from '../tools/refactor/refactor_from_instructions';
import { ILspAnalyzer } from '../shared/types/LspAnalyzer';
import { dartCodeExtensionIdentifier } from '../shared/types/constants';
import { FlutterGPTViewProvider } from '../providers/chat_view_provider';
export class RefactorActionManager {

  constructor() { }

  static async handleRequest(chips: any, chipIds: string[], data: any, aiRepo: GeminiRepository, context: vscode.ExtensionContext, analyzer: ILspAnalyzer, flutterGPTViewProvider: FlutterGPTViewProvider) {
    var instructions = data.instructions as string;
    for (const chip of chipIds) {
      if (instructions.includes(chip)) {
        instructions = instructions.replace(chip, '');
      }
    }
    const chip = Object.values(chips).values().next().value;
    // Assuming first chip is code to refactor
    const editorUri = chip.referenceData.editor;
    let editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === editorUri);
    if (!editor) {
      let uri = vscode.Uri.parse(editorUri);
      let document = await vscode.workspace.openTextDocument(uri);
      editor = await vscode.window.showTextDocument(document);
    }
    const selection = chip.referenceData.selection;
    const range: vscode.Range = new vscode.Range(new vscode.Position(selection.start.line, selection.start.character), new vscode.Position(selection.end.line, selection.end.character));
    const optimizedCode = await refactorCode(aiRepo!, context.globalState, range, analyzer, undefined, context, flutterGPTViewProvider, editor, instructions.trim(), false);
    return {
      role: "dash", parts: 'Do you want to merge these changes?', messageId: "", data: {
        'chip': chip,
        'optimizedCode': optimizedCode,
        'originalCodeUri': editorUri,
      }, buttons: ["accept", "decline"], agent: "diffView",
    };
  }
}