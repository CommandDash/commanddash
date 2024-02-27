import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';
import { log } from 'console';

// the application insights key (also known as instrumentation key)
const key = 'ceae95d5-839b-4691-8b42-ad54f8095b6d';

// telemetry reporter
let reporter: TelemetryReporter;

export function activateTelemetry(context: vscode.ExtensionContext) {

    if (key===undefined) {return null;}
   // create telemetry reporter on extension activation
   reporter = new TelemetryReporter(key);
   // ensure it gets properly disposed. Upon disposal the events will be flushed
   context.subscriptions.push(reporter);
}

export function logEvent(eventName: string, properties?: { [key: string]: string; }, measures?: { [key: string]: number; }){
    reporter.sendTelemetryEvent(eventName, properties, measures);
}

export function logError(eventName: string, error: Error | unknown){
    if (error instanceof Error) {
        reporter.sendTelemetryErrorEvent(eventName, {
            'name': error.name,
            'message': error.message,
            'stack': `${error.stack}`
        });
    } else {
        reporter.sendTelemetryErrorEvent(eventName, {
            'error': `${error}`
        });
    }   
}