import { CancellationToken, TextDocument, Uri } from "vscode";
 
import { LanguageClient, Logger } from "vscode-languageclient/node";
import { FlutterOutline, Outline, WorkspaceContext } from "./custom_protocols";
import { IAmDisposable } from "./interfaces";

export interface ILspFileTracker extends IAmDisposable {
	getOutlineFor(file: Uri | string): Outline | undefined;
	waitForOutline(document: TextDocument, token?: CancellationToken): Promise<Outline | undefined>;
	waitForOutlineWithLength(document: TextDocument, length: number, token: CancellationToken): Promise<Outline | undefined>;
	getFlutterOutlineFor(file: Uri | string): FlutterOutline | undefined;
	waitForFlutterOutlineWithLength(document: TextDocument, length: number, token: CancellationToken): Promise<FlutterOutline | undefined>;
	supportsPackageTest(file: Uri | string): boolean | undefined;
}

export interface ILspFileTrackerConstructor {
	new(logger: Logger, analyzer: LanguageClient, wsContext: WorkspaceContext): ILspFileTracker;
}
