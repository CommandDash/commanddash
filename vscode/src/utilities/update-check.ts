/* eslint-disable @typescript-eslint/naming-convention */
import { extensions } from "vscode";
import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import { promises as fsPromises } from 'fs';
import { logEvent } from "./telemetry-reporter";

export class ExtensionVersionManager {

    readonly context: vscode.ExtensionContext;
    user_config_file_path: vscode.Uri;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.user_config_file_path = vscode.Uri.file(
            path.join(this.context.extensionPath, "user_config.json")
        );
    }

    public static getExtensionVersion(): string {
        const extension = extensions.getExtension("WelltestedAI.fluttergpt");
        return extension?.packageJSON.version ?? "0.3.0"; // TODO: Try to always keep this updated as a fallback
    }

    public getVersionFromUserConfigFile(): string {
        // read from user_config.json file if exists and return version

        // if file does not exist, return 0.0.0
        if (!fs.existsSync(this.user_config_file_path.fsPath)) {
            return "0.0.0";
        }
        try {
            // read file and return version
            const user_config_file = fs.readFileSync(
                this.user_config_file_path.fsPath,
                "utf8"
            );
            const user_config = JSON.parse(user_config_file);
            return user_config.version;
        } catch (error) {
            console.error(error);
            return "0.0.0";
        }
    }


    public async isExtensionUpdated() {
        const currentVersion = ExtensionVersionManager.getExtensionVersion();
        const previousVersion = this.getVersionFromUserConfigFile();
        if (currentVersion !== previousVersion) {
            // first update packageJSON
            const newConfig = {
                version: currentVersion,
            };
            // then write to file
            const path = this.user_config_file_path.fsPath;
            // create if not exists
            if (!fs.existsSync(path)) {
                await fsPromises.writeFile(path, '',);
            }


            fs.writeFile(path, JSON.stringify(newConfig), (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
            });
            logEvent('extension-updated', { previousVersion: previousVersion, currentVersion: currentVersion });
            // show message
            vscode.window.showInformationMessage(
                `FlutterGPT updated checkout the new features`
            );

        }
    }
}

