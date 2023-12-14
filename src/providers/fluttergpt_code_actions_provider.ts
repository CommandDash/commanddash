
import * as vscode from "vscode";
import { CodeAction } from "vscode";
import { Outline } from "../shared/types/custom_protocols";
import { fsPath, isPositionInOutlineRange } from "../shared/utils";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { GeminiRepository } from "../repository/gemini-repository";


export class FluttergptActionProvider implements vscode.CodeActionProvider {
	constructor(private readonly analyzer: ILspAnalyzer, private readonly aiRepo: GeminiRepository, private readonly extcontext: vscode.ExtensionContext) { }


	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<CodeAction[] | undefined> {
		// Determine if the cursor is at a function.
		const functionRange: vscode.Range | undefined = await this.cursorIsAt("METHOD", document, range);
		const classRange: vscode.Range | undefined = await this.cursorIsAt("CLASS", document, range);

		// If the cursor is at a function, return the code action.
		if (functionRange !== undefined) {
			let functionAction = [];
			const optimizeFunction = new vscode.CodeAction("Optimize function", vscode.CodeActionKind.Refactor);
			optimizeFunction.command = {
				arguments: [this.aiRepo, this.extcontext.globalState, functionRange],
				command: "fluttergpt.optimizeCode",
				title: "Optimize Function",
			};

			functionAction.push(optimizeFunction);

			// refractor code
			const refactorCode = new vscode.CodeAction("Refactor code", vscode.CodeActionKind.Refactor);
			refactorCode.command = {
				arguments: [this.aiRepo, this.extcontext.globalState, functionRange],
				command: "fluttergpt.refactorCode",
				title: "Refactor code",
			};
			functionAction.push(refactorCode);

			// quick fix for the function if there are errors
			const errors = context.diagnostics.filter((d) => d.range.intersection(functionRange!) !== undefined);
			if (errors) {
				const fixErrorsAction = new vscode.CodeAction("Fix errors", vscode.CodeActionKind.QuickFix);
				fixErrorsAction.command = {
					arguments: [this.analyzer, errors, this.extcontext.globalState, functionRange],
					command: "fluttergpt.fixErrors",
					title: "Fix errors",
				};
				functionAction.push(fixErrorsAction);
			}
			return functionAction;
		}
		if (classRange !== undefined) {
			// TODO: add better implementation for class
			const optimizeFunction = new vscode.CodeAction("Optimize code", vscode.CodeActionKind.Refactor);
			optimizeFunction.command = {
				arguments: [this.aiRepo, this.extcontext.globalState, functionRange],
				command: "fluttergpt.optimizeCode",
				title: "Optimize Function",
			};
			return [optimizeFunction];
		}

		// Otherwise, return nothing.
		return undefined;
	}

	private async cursorIsAt(type: String, document: vscode.TextDocument, range: vscode.Range): Promise<vscode.Range | undefined> {

		const position = vscode.window.activeTextEditor?.selection.active;
		// adjust the position to the start of the word
		const wordRange = document.getWordRangeAtPosition(position!)!;
		if (!wordRange) {
			return undefined;
		}

		// Get the position of the start of the word
		const startPosition = wordRange.start;
		const filePath = fsPath(document.uri);
		const uri = document.uri.toString();
		const textDocumentIdentifier = { uri };
		const outline = (await this.analyzer.fileTracker.waitForOutline(document));
		if (outline === undefined) {
			return undefined;
		}
		const outlineSymbols = outline?.children || [];

		const isFunction = (symbol: Outline): boolean => {
			console.log(symbol);
			return symbol.element.kind === type && isPositionInOutlineRange(symbol, startPosition);
		};
		const checkSymbols = (symbols: Outline[]): vscode.Range | undefined => {
			for (const symbol of symbols) {
				const symbolRange = new vscode.Range(
					symbol.range.start.line,
					symbol.range.start.character,
					symbol.range.end.line,
					symbol.range.end.character,
				);
				if (isFunction(symbol)) {
					return symbolRange;
				}
				if (symbol.children) {
					const range = checkSymbols(symbol.children);
					if (range !== undefined) {
						return range;
					}
				}
			}
			return undefined;
		};

		return checkSymbols(outlineSymbols);
	}


}
