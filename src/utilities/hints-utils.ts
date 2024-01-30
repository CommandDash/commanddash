import * as os from 'os';
export function getInlineHintText(): string {
    const platform = os.platform();
    let hintText = 'Use (⌘) + (→) to auto complete using FlutterGPT';

    if (platform === 'win32') {
        hintText = 'Use (ctrl) + (→) to auto complete using FlutterGPT';
    } else if (platform === 'darwin') {
        hintText = 'Use (⌘) + (→) to auto complete using FlutterGPT';
    } else if (platform === 'linux') {
        hintText = 'Use (ctrl) + (→) to auto complete using FlutterGPT';
    }
    return hintText;
}

