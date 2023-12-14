import * as vscode from 'vscode';

export function extractDartCode(widgetCode: string): string {
    let dartCode: string = widgetCode.split("```")[1] || widgetCode;
    if (dartCode.startsWith('dart')) {
        dartCode = dartCode.slice(4);
    }
    return dartCode;
}

export function extractExplanation(widgetCode: string): string {
    let explanation: string = widgetCode.split("```")[0] || widgetCode;
    return explanation;
}

export function extractReferenceTextFromEditor(referenceEditor: vscode.TextEditor): string {
    const selectedCode = referenceEditor.document.getText();
    return selectedCode;
}