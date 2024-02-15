import * as fs from 'fs';

export const isCI = !!process.env.CI;
export const isDartCodeTestRun = !!process.env.DART_CODE_IS_TEST_RUN;
export const isWin = process.platform.startsWith("win");
export const isMac = process.platform === "darwin";
export const isLinux = !isWin && !isMac;
export const isChromeOS = isLinux && fs.existsSync("/dev/.cros_milestone");
export const dartCodeExtensionIdentifier = "Dart-Code.dart-code";
