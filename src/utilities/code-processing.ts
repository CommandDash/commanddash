export function extractDartCode(widgetCode: string): string {
    let dartCode: string = widgetCode.split("```")[1] || widgetCode;
    if (dartCode.startsWith('dart')) {
        dartCode = dartCode.slice(4);
    }
    return dartCode;
}