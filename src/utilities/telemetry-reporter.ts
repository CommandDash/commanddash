import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';
import { event } from 'firebase-functions/v1/analytics';
import { log } from 'console';

// the application insights key (also known as instrumentation key)
const key = '<key>';

// telemetry reporter
let reporter: TelemetryReporter;

export function activateTelemetry(context: vscode.ExtensionContext) {
    console.log('instrumentations key', key);

    if (key===undefined) {return null;}
   // create telemetry reporter on extension activation
   reporter = new TelemetryReporter(key);
   // ensure it gets properly disposed. Upon disposal the events will be flushed
   context.subscriptions.push(reporter);
}

export function logEvent(eventName: string){
    reporter.sendTelemetryEvent(eventName, { 'stringProp': 'some string' }, { 'numericMeasure': 123 });
}