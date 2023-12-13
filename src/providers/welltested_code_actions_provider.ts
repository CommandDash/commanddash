
import * as vscode from "vscode";
import { CodeAction } from "vscode";
import { Outline } from "../shared/types/custom_protocols";
import { fsPath } from "../shared/utils";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";
import { OpenAIRepository } from "../repository/openai-repository";
 

export class WellTestedActionProvider implements vscode.CodeActionProvider {
	constructor( private readonly analyzer: ILspAnalyzer, private readonly aiRepo: OpenAIRepository,private readonly extcontext: vscode.ExtensionContext ) { }
 

	async provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): Promise<CodeAction[] | undefined> {
		// Determine if the cursor is at a function.
		const functionRange : vscode.Range| undefined = await this.cursorIsAtFunction(document, range);

		// If the cursor is at a function, return the code action.
		if (functionRange !== undefined) {
			const testcasesAction = new vscode.CodeAction("Fetch Unit Testcases", vscode.CodeActionKind.Empty );
			testcasesAction.command = {
				arguments: [document, range]                     ,
				command: "welltested.fetchUnitTestcases",
				title: "Fetch Unit Testcases",
			};

			const excludeMethodAction = new vscode.CodeAction("Exclude This Method", vscode.CodeActionKind.Empty );
			excludeMethodAction.command = {
				arguments: [document, range]                     ,
				command: "welltested.excludeThisMethod",
				title: "Exclude This Method",
			};

			const excludeOtherMethodAction = new vscode.CodeAction("Exclude Other Methods", vscode.CodeActionKind.Empty );
			excludeOtherMethodAction.command = {
				arguments: [document, range]                     ,
				command: "welltested.excludeOtherMethods",
				title: "Exclude Other Methods",
			};

			const optimizeFunction = new vscode.CodeAction("Optimize function", vscode.CodeActionKind.Refactor);
			optimizeFunction.command = {
				arguments: [this.aiRepo,this.extcontext.globalState,functionRange],
				command: "fluttergpt.optimizeCode",
				title: "Optimize Function",
			};
			return [testcasesAction, excludeMethodAction, excludeOtherMethodAction, optimizeFunction];

		}

		// Otherwise, return nothing.
		return undefined;
	}

	private async cursorIsAtFunction(document: vscode.TextDocument, range: vscode.Range): Promise<vscode.Range | undefined> {
		 
		const position = vscode.window.activeTextEditor ?. selection.active ;
		// adjust the position to the start of the word
		const wordRange = document.getWordRangeAtPosition(position!)!;
		if (!wordRange){
			return undefined;
		}

		// Get the position of the start of the word
		const startPosition = wordRange.start;
		const filePath = fsPath(document.uri);
		const uri = document.uri.toString();
		const textDocumentIdentifier = {uri};
		const outline = (await this.analyzer.fileTracker.waitForOutline(document));
		if (outline === undefined){
			return undefined;
		}
		const outlineSymbols = outline?.children || [];

		const isFunction = (symbol: Outline): boolean => {
		  console.log(symbol);
		  return symbol.element.kind === "METHOD" && this.isPositionInOutlineRange(symbol, startPosition);
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
				if (symbol.children ){
					const range = checkSymbols(symbol.children);
					if (range !== undefined){
						return range;
					}
				}
		  }
		  return undefined;
		};

		return checkSymbols(outlineSymbols);
	  }
	private isPositionInOutlineRange(outline: Outline, position: vscode.Position): boolean {
		const symbolRange = new vscode.Range(
			outline.range.start.line,
			outline.range.start.character,
			outline.range.end.line,
			outline.range.end.character,
		);
		if (symbolRange.end.line !== 24){
			console.log("here");
		}
		return symbolRange.contains(position);
	}

}
 

