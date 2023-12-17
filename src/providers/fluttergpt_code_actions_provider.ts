
import * as vscode from "vscode";
import { CodeAction } from "vscode";
import { Outline } from "../shared/types/custom_protocols";
import { fsPath, isPositionInOutlineRange, isPositionInSameLine } from "../shared/utils";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { GeminiRepository } from "../repository/gemini-repository";


export class FluttergptActionProvider implements vscode.CodeActionProvider {
	constructor(private readonly analyzer: ILspAnalyzer, private readonly aiRepo: GeminiRepository, private readonly extcontext: vscode.ExtensionContext) { }


	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<CodeAction[] | undefined> {
		if (range instanceof vscode.Selection) {
			console.log(`Selection: ${range.start.line}, ${range.start.character} - ${range.end.line}, ${range.end.character}`);
		} else {
			console.log(`Range: ${range.start.line}, ${range.start.character} - ${range.end.line}, ${range.end.character}`);
		}
		let functionAction = [];

		const manualSelectionRange: vscode.Range | undefined = range.start.line !== range.end.line || range.start.character !== range.end.character? range : undefined;
		let functionRange: { symbolRange: vscode.Range, symbol: Outline } | undefined = await this.cursorIsAt("METHOD", document, range);
		const classRange: { symbolRange: vscode.Range, symbol: Outline } | undefined = await this.cursorIsAt("CLASS", document, range);

		const selectedRange = manualSelectionRange!==undefined? manualSelectionRange: functionRange!==undefined?functionRange.symbolRange: classRange?.symbolRange;
		const codeActionIndication = manualSelectionRange!==undefined? "Selection":
		functionRange!==undefined?functionRange.symbol.element.name:classRange?.symbol.element.name;
		
		if (selectedRange !== undefined) {

		// optimize function
		const optimizeFunction = new vscode.CodeAction(
			`Optimize ${codeActionIndication}`, vscode.CodeActionKind.Refactor);
		optimizeFunction.command = {
			arguments: [this.aiRepo, this.extcontext.globalState, selectedRange],
			command: "fluttergpt.optimizeCode",
			title: "Optimize Function",
		};

		functionAction.push(optimizeFunction);

		// refractor code
		const refactorCode = new vscode.CodeAction(`Refactor ${codeActionIndication}`, vscode.CodeActionKind.Refactor);
		refactorCode.command = {
			arguments: [this.aiRepo, this.extcontext.globalState, selectedRange],
			command: "fluttergpt.refactorCode",
			title: "Refactor code",
		};
		functionAction.push(refactorCode);

		return functionAction;
		//code to check if range is multicharacter
	
		// If the cursor is at a function, return the code action.
		// if (functionRange !== undefined) {
			
			

			// // refractor code
			// const refactorCode = new vscode.CodeAction("Refactor code", vscode.CodeActionKind.Refactor);
			// refactorCode.command = {
			// 	arguments: [this.aiRepo, this.extcontext.globalState, functionRange],
			// 	command: "fluttergpt.refactorCode",
			// 	title: "Refactor code",
			// };
			// functionAction.push(refactorCode);

		// 	// quick fix for the function if there are errors
		// 	const errors = context.diagnostics.filter((d) => d.range.intersection(functionRange!) !== undefined);
		// 	if (errors) {
		// 		const fixErrorsAction = new vscode.CodeAction("Fix errors", vscode.CodeActionKind.QuickFix);
		// 		fixErrorsAction.command = {
		// 			arguments: [this.analyzer, errors, this.extcontext.globalState, functionRange],
		// 			command: "fluttergpt.fixErrors",
		// 			title: "Fix errors",
		// 		};
		// 		functionAction.push(fixErrorsAction);
		// 	}
		// 	return functionAction;
		// }
		// if (classRange !== undefined) {
		// 	// TODO: add better implementation for class
		// 	const optimizeFunction = new vscode.CodeAction("Optimize code", vscode.CodeActionKind.Refactor);
		// 	optimizeFunction.command = {
		// 		arguments: [this.aiRepo, this.extcontext.globalState, functionRange],
		// 		command: "fluttergpt.optimizeCode",
		// 		title: "Optimize Function",
		// 	};
		// 	return [optimizeFunction];
		// }
		// }
		

		// Otherwise, return nothing.
		// return undefined;
		}
	}
	private async cursorIsAt(type: String, document: vscode.TextDocument, range: vscode.Range): Promise<{ symbolRange: vscode.Range, symbol: Outline } | undefined> {

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

		const isRequiredType = (symbol: Outline): boolean => {
			console.log(symbol);
			return symbol.element.kind === type && isPositionInSameLine(symbol, startPosition);
		};
		const checkSymbols = (symbols: Outline[]): { symbolRange: vscode.Range, symbol: Outline } | undefined => {
			for (const symbol of symbols) {
				const symbolRange = new vscode.Range(
					symbol.range.start.line,
					symbol.range.start.character,
					symbol.range.end.line,
					symbol.range.end.character,
				);
				if (isRequiredType(symbol)) {
					return {symbolRange, symbol};
				}
				if (symbol.children) {
					const result = checkSymbols(symbol.children);
					if (range !== undefined) {
						return result;
					}
				}
			}
			return undefined;
		};

		return checkSymbols(outlineSymbols);
	}


}
