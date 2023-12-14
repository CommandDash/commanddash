import * as vscode from "vscode";
import { OpenAIRepository } from "../repository/openai-repository";

export class AIHoverProvider implements vscode.HoverProvider {

    constructor(private readonly openaiRepo: OpenAIRepository) {
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            return undefined;
        }
        
        const word = document.getText(wordRange);

        const error =  this.getErrorAtPosition(document, position);
        if(!error){
            return undefined;
        }
        
        // TODO: improve prompt here
        const prompt: { role: string, content: string }[] = [
            { role: 'user', content: 'Explain the error i am getting in flutter/dart and possibly provide solution to it. The following is a hover tooltip from vscode: ' + error?.message  },
        ];
        
        try {
            const hoverText = await this.openaiRepo.getCompletion(prompt);
            if (hoverText) {
                // Create markdown string for nicer formatting
                const markdown = new vscode.MarkdownString(hoverText);
                return new vscode.Hover(markdown, wordRange);
            }
        } catch (error) {
             
            console.error('Error fetching hover content from OpenAI:', error);
        }
        return undefined;
    }
    
    private getErrorAtPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Diagnostic | undefined {
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
}
 