import * as fs from 'fs';
import { isWin } from './types/constants';
import path = require('path');
import * as vscode from 'vscode';
import { GeminiRepository } from '../repository/gemini-repository';
import { ILspAnalyzer } from './types/LspAnalyzer';
import { Outline } from './types/custom_protocols';
import { SemanticTokensRegistrationType, SemanticTokensProviderShape, SymbolKind } from 'vscode-languageclient';

export async function getCodeForElementAtRange(analyzer: ILspAnalyzer, document: vscode.TextDocument, range: vscode.Range): Promise<string | undefined> {
	const outline = (await analyzer.fileTracker.waitForOutline(document));
	if (outline === undefined) {
		return undefined;
	}
	const word = document.getText(range);
	const outlineSymbols = outline?.children || [];
	const checkSymbols = (symbols: Outline[]): vscode.Range | undefined => {
		for (const symbol of symbols) {
			const symbolRange = new vscode.Range(
				symbol.range.start.line,
				symbol.range.start.character,
				symbol.range.end.line,
				symbol.range.end.character,
			);
			if (isPositionInFullOutlineRange(symbol, range.start)) {
				if (symbol.element.name === word) {
					return symbolRange;
				}
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

	const codeRange = checkSymbols(outlineSymbols);
	if (!codeRange) {
		return undefined;
	}
	const code = document.getText(codeRange);
	return code;
}

export async function cursorIsAt(type: String, analyzer: ILspAnalyzer, document: vscode.TextDocument, activeTextEditor: vscode.TextEditor | undefined, range: vscode.Range, strict: boolean = true): Promise<{ symbolRange: vscode.Range, symbol: Outline } | undefined> {

	const position = activeTextEditor?.selection.active;
	// adjust the position to the start of the word
	const wordRange = document.getWordRangeAtPosition(position!)!;
	if (!wordRange) {
		return undefined;
	}

	// Get the position of the start of the word
	const startPosition = wordRange.start;
	const uri = document.uri.toString();
	const outline = (await analyzer.fileTracker.waitForOutline(document));
	if (outline === undefined) {
		return undefined;
	}
	const outlineSymbols = outline?.children || [];

	const isRequiredType = (symbol: Outline): boolean => {
		return symbol.element.kind === type && (strict ? isPositionInElementDefinitionRange(symbol, startPosition) : isPositionInFullOutlineRange(symbol, startPosition));
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
				return { symbolRange, symbol };
			}
			if (symbol.children) {
				const result = checkSymbols(symbol.children);
				if (result !== undefined) {
					return result;
				}
			}
		}
		return undefined;
	};

	return checkSymbols(outlineSymbols);
}

//if the cursor is anywhere within the full element.
export function isPositionInFullOutlineRange(outline: Outline, position: vscode.Position): boolean {
	const symbolRange = new vscode.Range(
		outline.range.start.line,
		outline.range.start.character,
		outline.range.end.line,
		outline.range.end.character,
	);
	return symbolRange.contains(position);
}
//if the cursor is over the name of method or class.
//for ease, we allow tapping over anywhere in the line.
export function isPositionInElementDefinitionRange
	(outline: Outline, position: vscode.Position): boolean {
	if (outline.element.range === undefined) { return false; }
	const symbolRange = new vscode.Range(
		outline.element.range.start.line,
		0,
		outline.element.range.start.line,
		Infinity
	);
	return symbolRange.contains(position);
}


export function getErrorAtPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Diagnostic | undefined {
	const diagnostics = vscode.languages.getDiagnostics(document.uri);


	for (const diagnostic of diagnostics) {
		if (diagnostic.range.contains(position) && diagnostic.severity === vscode.DiagnosticSeverity.Error) {
			// Return the first error found at the given position
			return diagnostic;
		}
	}

	// No error was found at this position
	return undefined;
}



export async function getContextualCode(document: vscode.TextDocument, range: vscode.Range, analyzer: ILspAnalyzer): Promise<string | undefined> {
	const checkSymbols = (symbols: Outline[]): Outline | undefined => {
		for (const symbol of symbols) {
			const symbolRange = new vscode.Range(
				symbol.range.start.line,
				symbol.range.start.character,
				symbol.range.end.line,
				symbol.range.end.character,
			);
			if (isPositionInElementDefinitionRange(symbol, range.start)) {
				return symbol;
			}
			if (symbol.children) {
				const result = checkSymbols(symbol.children);
				if (result !== undefined) {
					return result;
				}
			}
		}
		return undefined;
	};
	const outline = await analyzer.fileTracker.waitForOutline(document);

	if (outline === undefined) {
		return undefined;
	}
	const outlineSymbols = outline?.children || [];
	// parse the outline to get all top level symbols
	const symbol = checkSymbols(outlineSymbols);
	if (symbol === undefined) {
		return undefined;
	}
	const docTokens = await getDocumentTokens(document, analyzer, range);

	const uniqueSymbols = docTokens
		.filter(contextualSymbol => contextualSymbol.tokenType !== undefined && ["Class", "Method", "ENUM"].includes(contextualSymbol.tokenType))
		.filter(contextualSymbol => contextualSymbol.name !== symbol.element.name)
		.reduce((map, contextualSymbol) => {
			if (contextualSymbol.code) {
				map.set(contextualSymbol.name, contextualSymbol.code);
			}
			return map;
		}, new Map<string, string>());

	let code: string = "";
	for (const [key, value] of uniqueSymbols) {
		const symbolCode = "```dart\n" + value + "\n```";
		code += symbolCode + "\n";
	}
	return code;
}



export async function getDocumentTokens(document: vscode.TextDocument, analyzer: ILspAnalyzer, range: vscode.Range): Promise<Token[]> {

	let tokenSource = new vscode.CancellationTokenSource();
	const shape = analyzer.client.getFeature(SemanticTokensRegistrationType.method).getProvider(document)! as SemanticTokensProviderShape;
	const semanticTokens = await shape.range!.provideDocumentRangeSemanticTokens(document, range, tokenSource.token);
	let tokens = await parseTokens(semanticTokens?.data!, document, analyzer);


	return tokens;
}

export function flatMap<T1, T2>(input: readonly T1[], f: (input: T1) => readonly T2[]): T2[] {
	return input.reduce((acc, x) => acc.concat(f(x)), [] as T2[]);
}


type Token = {
	line: number;
	start: number;
	length: number;
	tokenTypeNumber: number;
	tokenType: string | undefined;
	tokenModifiers: number;
	name: string;
	code: string | undefined;
};

async function parseTokens(tokensArray: Uint32Array, document: vscode.TextDocument, analyzer: ILspAnalyzer): Promise<Token[]> {
	const tokens: Token[] = [];
	let currentLine = 0;
	let currentStart = 0;

	for (let i = 0; i < tokensArray.length; i += 5) {
		const deltaLine = tokensArray[i];
		const deltaStart = tokensArray[i + 1];
		const length = tokensArray[i + 2];
		const tokenType = tokensArray[i + 3];
		const tokenModifiers = tokensArray[i + 4];

		currentLine += deltaLine;
		if (deltaLine > 0) {
			currentStart = deltaStart;
		} else {
			currentStart += deltaStart;
		}

		// get the name of the token using the range
		const range = new vscode.Range(currentLine, currentStart, currentLine, currentStart + length);
		const name = document.getText(range);

		const cancellationToken = new vscode.CancellationTokenSource();
		// get hover at the position
		let fullcode;


		// if (tokenType === 2) {
		// check if same file as document
		const definitionProvider = analyzer.client.getFeature('textDocument/definition').getProvider(document);
		let definition = await definitionProvider?.provideDefinition(document, range.start, cancellationToken.token) as vscode.LocationLink[];

		let uri = definition[0]?.targetUri;
		if (uri) {
			let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
			if (workspaceFolder) {
				const code = await getCodeForRange(uri, definition[0].targetRange);
				if (code) {
					fullcode = code;
				}
			}
		}



		tokens.push({
			name: name,
			tokenTypeNumber: tokenType,
			tokenType: getSymbolKind(tokenType),
			line: currentLine,
			start: currentStart,
			length: length,
			tokenModifiers: tokenModifiers,
			code: fullcode,
		});
	}

	return tokens;
}
export function getSymbolKind(kindNumber: number): string | undefined {
	switch (kindNumber) {
		case 2:
			return "Class";
		case 4:
			return "Method";
		case 7:
			return "ENUM";
		case 8:
			return "ENUM_CONSTANT";
		default:
			return undefined;
	}
}

async function getCodeForRange(uri: vscode.Uri, range: vscode.Range): Promise<string | undefined> {
	const documents = await vscode.workspace.textDocuments;
	const fileCode = await vscode.workspace.fs.readFile(uri);
	if (fileCode) {
		const code = Buffer.from(fileCode).toString('utf-8');
		// Extract the code for the range
		const lines = code.split(/\r?\n/g);
		const startLine = range.start.line;
		const endLine = range.end.line;
		const startChar = range.start.character;
		const endChar = range.end.character;
		let fullcode = "";
		if (startLine === endLine) {
			fullcode = lines[startLine].substring(startChar, endChar);
		} else {
			fullcode = lines[startLine].substring(startChar);
			for (let i = startLine + 1; i < endLine; i++) {
				fullcode += lines[i];
			}
			fullcode += lines[endLine].substring(0, endChar);
		}
		return fullcode;
	}
	return undefined;
}
