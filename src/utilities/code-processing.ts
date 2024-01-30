import * as vscode from 'vscode';

export function extractDartCode(widgetCode: string, first: Boolean = true): string {
    const codeBlocksRegex = /```(dart)?([\s\S]*?)```/g;

    let dartCodes: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = codeBlocksRegex.exec(widgetCode)) !== null) {
        let dartCode: string = match[2];
        dartCodes.push(dartCode.trim());  // extracting and storing all dart code blocks
    }
    if (first) {
        return dartCodes[0];
    }
    else {return dartCodes[dartCodes.length-1];}
}

export function previewCode(dartCode: string): string {
    const maxLength = 100;
    if (dartCode.length <= maxLength) {
        return dartCode;
    }

    const startLength = 40;
    const middleLength = 20;
    const endLength = 40;
    const start = dartCode.slice(0, startLength);
    const middle = dartCode.slice(dartCode.length / 2 - middleLength / 2, dartCode.length / 2 + middleLength / 2);
    const end = dartCode.slice(-endLength);
    return start + '...' + middle + '...' + end;
}

export function extractExplanation(widgetCode: string): string {
    let explanation: string = widgetCode.split("```")[0] || widgetCode;
    return explanation;
}

export function extractReferenceTextFromEditor(referenceEditor: vscode.TextEditor): string {
    const selectedCode = referenceEditor.document.getText();
    return selectedCode;
}