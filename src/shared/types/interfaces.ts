import * as child_process from "child_process";
import * as stream from "stream";
import { Event } from "vscode";
import { WorkspaceContext } from "./custom_protocols";

export interface SdkSearchResults {
	// The fully resolved path to the SDK.
	sdkPath?: string;
	// The original path (before following symlinks) that led us to [sdkPath].
	originalPath?: string;
	candidatePaths: string[];
	sdkInitScript: string | undefined;
}

export interface SdkSearchResult {
	// The fully resolved path to the SDK.
	sdkPath: string;
	// The original path (before following symlinks) that led us to [sdkPath].
	originalPath: string;
}

export interface Sdks {
	readonly dart?: string;
	readonly dartVersion?: string;
	readonly flutter?: string;
	readonly flutterVersion?: string;
	readonly dartSdkIsFromFlutter: boolean;
}

export interface DartSdks extends Sdks {
	readonly dart: string;
}

export interface FlutterSdks extends Sdks {
	readonly flutter: string;
}

export interface DartWorkspaceContext extends WorkspaceContext {
	readonly sdks: DartSdks;
}

// TODO(dantup): Move capabilities onto here?
export interface FlutterWorkspaceContext extends WorkspaceContext {
	readonly sdks: FlutterSdks;
}

export interface WritableWorkspaceConfig {
	// All fields here should handle undefined, and the default (undefined) state
	// should be what is expected from a standard workspace without any additional
	// config.

	startDevToolsServerEagerly?: boolean;
	startDevToolsFromDaemon?: boolean;
	disableAnalytics?: boolean;
	disableAutomaticPackageGet?: boolean;
	disableSdkUpdateChecks?: boolean;
	disableStartupPrompts?: boolean;
	flutterDaemonScript?: CustomScript;
	flutterDevToolsScript?: CustomScript;
	flutterDoctorScript?: CustomScript;
	flutterRunScript?: CustomScript;
	flutterSdkHome?: string;
	flutterTestScript?: CustomScript;
	flutterToolsScript?: CustomScript;
	flutterVersion?: string;
	useLegacyProtocol?: boolean;
	forceFlutterWorkspace?: boolean;
	forceFlutterDebug?: boolean;
	skipFlutterInitialization?: boolean;
	omitTargetFlag?: boolean;
	defaultDartSdk?: string;
	restartMacDaemonMessage?: string;
	localDeviceCommandAdviceMessage?: string;
	localMacWarningMessage?: string;
	/// Whether or not we can use pkg:test for running tests. This means the tool supports
	/// arguments like "--plain-name", "--name".
	///
	/// true: definitely does support it (Bazel)
	/// false: definitely does not support it (Dart SDK)
	/// undefined: only if there's a pubspec
	supportsPackageTest?: boolean;
	/// Similar to [supportsPackageTest], but whether we can successfully run
	/// commands like "dart run test:test --version".
	supportsDartRunTest?: boolean;
}

export type WorkspaceConfig = Readonly<WritableWorkspaceConfig>;
export interface CustomScript {
	script: string | undefined;
	replacesArgs: number | undefined;
}

export interface DartProjectTemplate {
	readonly name: string;
	readonly label: string;
	readonly description: string;
	readonly categories: string[];
	readonly entrypoint: string;
}

export interface FlutterProjectTemplate {
	readonly id: string;
	readonly empty?: boolean;
}

export interface FlutterCreateTriggerData {
	readonly sample?: string;
	readonly template?: string;
	readonly empty?: boolean;
}
  

export interface IAmDisposable {
	dispose(): void | Promise<void>;
}

export interface CancellationToken {
	isCancellationRequested: boolean;
	onCancellationRequested: Event<any>;
}
    
export interface FlutterCreateCommandArgs {
	projectPath?: string;
	projectName?: string;
	triggerData?: FlutterCreateTriggerData;
	platform?: string;
}

export interface CustomEmulatorDefinition {
	id: string;
	name: string;
	executable: string;
	args?: string[];
}

export interface Location {
	startLine: number;
	startColumn: number;
	length: number;
}

export interface FlutterRawSurveyData {
	uniqueId: string;
	title: string;
	url: string;
	startDate: string;
	endDate: string;
}

export interface FlutterSurveyData {
	uniqueId: string;
	title: string;
	url: string;
	startDate: number;
	endDate: number;
}

export type SpawnedProcess = child_process.ChildProcess & {
	stdin: stream.Writable,
	stdout: stream.Readable,
	stderr: stream.Readable,
};

export interface OpenedFileInformation {
	readonly contents: string;
	readonly selectionOffset: number;
	readonly selectionLength: number;
}

export interface DevToolsPage {
	id: string;
	commandId: string;
	routeId?: (flutterVersion: string | undefined) => string;
	title: string;
}

export interface WidgetErrorInspectData {
	errorDescription: string;
	devToolsUrl: string;
	inspectorReference: string;
}

export interface Range {
	start: Position;
	end: Position;
}

export interface Position {
	// Zero-based line number.
	line: number;
	// Zero-based line number.
	character: number;
}

export interface Analytics {
	logFlutterSurveyShown(): void;
	logFlutterSurveyClicked(): void;
	logFlutterSurveyDismissed(): void;
}

export interface MyCancellationToken {
	isCancellationRequested: boolean;
}

export interface CustomDevToolsConfig {
	args?: string[];
	path?: string;
	env?: { [key: string]: string };
}

export interface ExtensionConfig {
	get experimentalTestRunnerInSdk(): boolean;
}
