import * as vscode from 'vscode';


class DartCodeNotFoundError extends Error {
    constructor(message?: string) {
        super(message); // (1)
        this.name = this.constructor.name; // (2)
        Error.captureStackTrace(this, this.constructor); // (3)
    }
}

export function filterSurroundingCode(orignalContent: string, codeCompletion: string, splitLineNumberStart: number, splitLineNumberEnd: number = splitLineNumberStart): string {
    const orginalContentLines = orignalContent.split('\n');
    let codeCompletionLines = codeCompletion.split('\n');

    const preInsertLines = orginalContentLines.slice(0, splitLineNumberStart);
    const afterInsertLines = orginalContentLines.slice(splitLineNumberEnd + 1);

    const codeCompletionStartLine = removeWhitespaces(codeCompletionLines[0]);
    for (let i = 0; i < preInsertLines.length; i++) { //5
        if (codeCompletionLines.length < preInsertLines.length - i) {
            continue; // surrounding line is out of code completion range.
        }
        //find the first line from the top of the document that matches the starting line of code completion.
        const existingLine = removeWhitespaces(preInsertLines[i]);
        if (codeCompletionStartLine === existingLine) {
            let fullMatch = true;
            // all the below lines in the document should also match with the code completion
            for (let j = 1; j < preInsertLines.length - i; j++) {
                const followingCodeCompletionLine = removeWhitespaces(codeCompletionLines[j]);
                const followingExistingLine = removeWhitespaces(preInsertLines[i + j]);
                if (followingCodeCompletionLine !== followingExistingLine) {
                    fullMatch = false;
                    break;
                }
            }
            if (fullMatch) {
                codeCompletionLines = codeCompletionLines.slice(preInsertLines.length - i);
                break;
            }
        }
    }

    // Cleanup logic for after lines
    if(codeCompletionLines.length>0){ //safe for all code completion lines removed in last step resulting into error in codeCompletionLines[codeCompletionLines.length - 1]
        const codeCompletionEndLine = removeWhitespaces(codeCompletionLines[codeCompletionLines.length - 1]);
        for (let i = afterInsertLines.length; i > 0; i--) {
            if (codeCompletionLines.length < i) {
                continue; // surrounding line is out of code completion range.
            }
            //find the last line of the doc that matches with the last line of code completion
            const existingLine = removeWhitespaces(afterInsertLines[i - 1]);
            if (codeCompletionEndLine === existingLine) {
                let fullMatch = true;
                // make sure all the lines from last line in doc to the line after cursor are available in code compleiton
                for (let j = 1; j < i; j++) {
                    const previousCodeCompletionLine = removeWhitespaces(codeCompletionLines[codeCompletionLines.length - 1 - j]);
                    const previousExistingLine = removeWhitespaces(afterInsertLines[i - 1 - j]);
                    if (previousCodeCompletionLine !== previousExistingLine) {
                        fullMatch = false;
                        break;
                    }
                }
                if (fullMatch) {
                    codeCompletionLines = codeCompletionLines.slice(0, codeCompletionLines.length - i);
                    break;
                }
            }
        }
    }
    
    // Join the cleaned up code completion lines with the original content lines
    const result = codeCompletionLines.join('\n');
    return result;
}

function removeWhitespaces(line: string): string {
    return line.replace(/\s/g, "");
}


export function extractDartCode(widgetCode: string, first: Boolean = true): string {
    const codeBlocksRegex = /```(dart)?([\s\S]*?)```/g;

    let dartCodes: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = codeBlocksRegex.exec(widgetCode)) !== null) {
        let dartCode: string = match[2];
        dartCodes.push(dartCode.trim());  // extracting and storing all dart code blocks
    }
    if (dartCodes.length === 0) {
        throw new DartCodeNotFoundError(`No Dart code recognized in response: ${widgetCode}`);
    } else if (first) {
        // Returns the first Dart code block
        return dartCodes[0];
    } else {
        // Returns the last Dart code block
        return dartCodes[dartCodes.length - 1];
    }
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
