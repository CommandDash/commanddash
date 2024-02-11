import * as vscode from "vscode";

import { SecretApiKeyManager } from "./secret-storage-manager";
import { error } from "console";

export class ExposedApiKeyManager {
    readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async checkAndShiftConfigApiKey() {
        //check if api key is in config then take the api key and shift to secretStorage
        let deletedApiKey: string | undefined =
            await this.checkIfApiKeyIsInConfigAndDelete();
        if (deletedApiKey) {
            //SET API KEY IN SECRET STORAGE
            await new SecretApiKeyManager(this.context).setApiKey(
                this.context,
                deletedApiKey
            );
            
        }
    }

    public async checkIfApiKeyIsInConfigAndDelete(): Promise<string | undefined> {
        try {

            const config = vscode.workspace.getConfiguration("fluttergpt");
            const apiKey = config.get<string>("apiKey");

            if (apiKey) {
                config.update("apiKey", undefined, vscode.ConfigurationTarget.Global);

                return apiKey;
            }

            return undefined;
        } catch (error) {
            console.log("this.checkIfApiKeyIsInConfig error:", error);
            return undefined;
        }
    }

   
}
