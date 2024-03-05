import * as vscode from "vscode";
import urlMetadata = require('url-metadata');


export class UpdateManager {
    readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    // function to check for update
    public async checkForUpdate(): Promise<void> {

        const lastestVersion = await this.getLatestVersion();

        // in case of failure to obtain latest version, stop further execution
        if (!lastestVersion) {
            return;
        }

        const currentVersion = this.context.extension.packageJSON.version as string;

        if (this.convertVersionStringToInt(lastestVersion) > this.convertVersionStringToInt(currentVersion)) {
            const selection = await vscode.window.showInformationMessage(
                `A new version (${lastestVersion}) of FlutterGPT is available. Update now for the latest features and improvements.`,
                'Update'
            );

            if (selection === 'Update') {
                vscode.commands.executeCommand('extension.open', this.context.extension.id);
            }
        }

    }

    // obtaining latest version of release by web scrapping
    private async getLatestVersion(): Promise<string | undefined> {
        let version: string | undefined;
        try {
            const metadata = await urlMetadata(
                'https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt',
                {
                    mode: 'same-origin',
                }
            );

            // obtaining the version from meta-data of vscode market place url from the hosted image endpoint
            let extractedVersion: string = metadata['og:image'].toString().split('fluttergpt/')[1].split('/')[0];

            // console.log(extractedVersion);

            // validate the version pattern  
            // accepted format -> X.X.X  
            if (extractedVersion.match(/\d{1,}\.\d{1,}\.\d{1,}/)) {
                version = extractedVersion;
            }
        } catch (err) {
            console.log('version fetch error:', err);
        }
        // version will be undefined either in case of network failure or version pattern match failure
        return version;
    }

    //converts version string to number
    private convertVersionStringToInt(version: string): number {
        return Number.parseInt(version.replace(/\./g, ''), 10);
    }
}