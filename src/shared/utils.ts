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


/**
 * Retrieves the code within the specified range from a given file.
 * If the file is open in an editor, the code is obtained from the editor.
 * Otherwise, the code is read from the disk.
 * This is to handle the case where the user has unsaved changes in the editor.
 *
 * @param uri - The URI of the file.
 * @param range - The range of code to retrieve.
 * @returns A Promise that resolves to the code within the specified range, or undefined if the code cannot be retrieved.
 */
export async function getCodeForRange(uri: vscode.Uri, range: vscode.Range): Promise<string | undefined> {
	const document = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString());
	if (document) {
		// The file is open in an editor
		let fullcode = document.getText(range);
		return fullcode;
	} else {
		// The file is not open in an editor
		let fileCode = await vscode.workspace.fs.readFile(uri);
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

	}

	return undefined;
}
