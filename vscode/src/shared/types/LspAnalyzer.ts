
import * as vs from 'vscode';
import * as ls from 'vscode-languageclient';
import { LanguageClient } from "vscode-languageclient/node";
import { ILspFileTracker } from './FileTracker';

export interface ILspAnalyzer {
  readonly client: LanguageClient;
  readonly fileTracker: ILspFileTracker; // Replace with the actual type
  readonly snippetTextEdits: any; // Replace with the actual type
  readonly refactors: any; // Replace with the actual type
  readonly statusItem: vs.LanguageStatusItem;

  forceReanalyze(): Promise<void>;
  getDiagnosticServerPort(): Promise<{ port: number }>;
  getSuper(params: ls.TextDocumentPositionParams): Promise<ls.Location | null>;
  completeStatement(params: ls.TextDocumentPositionParams): Promise<ls.WorkspaceEdit | null>;
  // Any additional methods and properties should be included here.
}
 
  


 
 
 