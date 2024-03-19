import * as os from 'os';

export function shortcutInlineCodeGeneration(minified: boolean = false): string{
    const platform = os.platform();
    let stringRepresentation;

    if (platform === 'win32' || platform === 'linux') {
        stringRepresentation = minified? 'ctrl+shift+→' : '(ctrl) + (shift) + (→)';
    } else  {
        stringRepresentation = minified? '⌘+shift+→' : '(⌘) + (shift) + (→)';
    }
    return stringRepresentation;
}

export function shortcutInlineCodeRefactor(minified: boolean = false): string{
    const platform = os.platform();
    let stringRepresentation;

    if (platform === 'win32' || platform === 'linux') {
        stringRepresentation = minified? 'ctrl+r' : '(ctrl) + (R)';
    } else  {
        stringRepresentation = minified? '⌘+r' : '(⌘) + (R)';
    }
    return stringRepresentation;
}
