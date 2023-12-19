import * as vscode from "vscode";
import { GeminiRepository } from "../repository/gemini-repository";
import { getCodeForElementAtRange, getErrorAtPosition } from "../shared/utils";
import { ILspAnalyzer } from "../shared/types/LspAnalyzer";

// Not using right now since too many API calls are being made
export class AIHoverProvider implements vscode.HoverProvider {

    constructor(private readonly aiRepo: GeminiRepository, private readonly analzyer: ILspAnalyzer) {
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }

        const word = document.getText(wordRange);

        const error = getErrorAtPosition(document, position);
        if (!error) {
            return undefined;
        }

        const releventCode = await getCodeForElementAtRange(this.analzyer, document, error.range);

        // TODO: improve prompt here
        const prompt: { role: string, parts: string } =
            { role: 'user', parts: 'Explain the error i am getting in flutter/dart and possibly provide solution to it.\nRelevent code\n' + '```\n' + releventCode + '\n```\n' + 'The following is a hover tooltip from vscode: ' + error?.message };

        try {
            const hoverText = await this.aiRepo.getCompletion([prompt]);
            if (hoverText) {
                // Create markdown string for nicer formatting
                const markdown = new vscode.MarkdownString(hoverText);
                return new vscode.Hover(markdown, wordRange);
            }
        } catch (error) {

            console.error('Error fetching hover content from Gemini:', error);
        }
        return undefined;
    }

}
