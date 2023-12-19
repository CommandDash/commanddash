
import * as vscode from "vscode";
import { CodeAction } from "vscode";
import { Outline } from "../shared/types/custom_protocols";
import { cursorIsAt } from "../shared/utils";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { GeminiRepository } from "../repository/gemini-repository";


export class ErrorCodeActionProvider implements vscode.CodeActionProvider {
	constructor(private readonly analyzer: ILspAnalyzer, private readonly aiRepo: GeminiRepository, private readonly extcontext: vscode.ExtensionContext) { }


	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<CodeAction[] | undefined> {
		let functionAction = [];
        
        //We current need some scope for fixing errors since we can only replace range code and not append code anywhere in the file.
		const manualSelectionRange: vscode.Range | undefined = range.start.line !== range.end.line || range.start.character !== range.end.character? range : undefined;
		let functionRange: { symbolRange: vscode.Range, symbol: Outline } | undefined = await cursorIsAt("METHOD", this.analyzer, document, vscode.window.activeTextEditor, range, false);
        
		const selectedRange = manualSelectionRange!==undefined? manualSelectionRange:functionRange?.symbolRange;
	
		if (selectedRange !== undefined) {
		// quick fix for the function if there are errors
		const errors = context.diagnostics.filter((d) => d.range.intersection(selectedRange!) !== undefined);
		if (errors.length>0) {
			const fixErrorsAction = new vscode.CodeAction("✨ Auto-Fix", vscode.CodeActionKind.QuickFix);
			fixErrorsAction.command = {
				arguments: [this.analyzer, errors, this.extcontext.globalState, selectedRange],
				command: "fluttergpt.fixErrors",
				title: "Fix errors",
			};
			functionAction.push(fixErrorsAction);
		}

		return functionAction;
		}
	}
}
