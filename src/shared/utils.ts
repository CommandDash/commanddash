import * as fs from 'fs';
import { URI } from "vscode-uri";
import { isWin } from './types/constants';
import path = require('path');
import * as vscode from 'vscode';
import { GeminiRepository } from '../repository/gemini-repository';
import { ILspAnalyzer } from './types/LspAnalyzer';
import { Outline } from './types/custom_protocols';

export function fsPath(uri: URI | string, { useRealCasing = false }: { useRealCasing?: boolean; } = {}): string {
	// tslint:disable-next-line:disallow-fspath
	let newPath = typeof uri === "string" ? uri : uri.fsPath;

	if (useRealCasing) {
		const realPath = fs.existsSync(newPath) && fs.realpathSync.native(newPath);
		// Since realpathSync.native will resolve symlinks, only do anything if the paths differ
		// _only_ by case.
		// when there was no symlink (eg. the lowercase version of both paths match).
		if (realPath && realPath.toLowerCase() === newPath.toLowerCase() && realPath !== newPath) {
			console.warn(`Rewriting path:\n  ${newPath}\nto:\n  ${realPath} because the casing appears incorrect`);
			newPath = realPath;
		}
	}

	newPath = forceWindowsDriveLetterToUppercase(newPath);

	return newPath;
}

export function forceWindowsDriveLetterToUppercase<T extends string | undefined>(p: T): string | (undefined extends T ? undefined : never) {
	if (typeof p !== "string")
		return undefined as (undefined extends T ? undefined : never);

	if (p && isWin && path.isAbsolute(p) && p.startsWith(p.charAt(0).toLowerCase()))
		return p.substr(0, 1).toUpperCase() + p.substr(1);

	return p;
}


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
			if (isPositionInOutlineRange(symbol, range.start)) {
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
export function isPositionInOutlineRange(outline: Outline, position: vscode.Position): boolean {
	const symbolRange = new vscode.Range(
		outline.range.start.line,
		outline.range.start.character,
		outline.range.end.line,
		outline.range.end.character,
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