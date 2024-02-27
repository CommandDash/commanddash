import { extractReferenceTextFromEditor } from "./code-processing";
import * as vscode from 'vscode';

export function appendReferences(referenceEditor: vscode.TextEditor | undefined, prompt: string): string {
    if (referenceEditor !== undefined) {
        const referenceText = extractReferenceTextFromEditor(referenceEditor);
        if (referenceText !== '') {
            prompt += `Here are user shared context/references: \n${referenceText}\n\n. Anaylze these well and use them to refactor the code.\n\n`;
        }
    }
    return prompt;
}