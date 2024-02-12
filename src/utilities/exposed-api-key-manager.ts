import * as vscode from "vscode";

import { SecretApiKeyManager } from "./secret-storage-manager";
import { error } from "console";

export class ExposedApiKeyManager {
    readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async checkAndShiftConfigApiKey() {
        //check if api key is in config then take the api key and shift to secretStorage
        let apiKey: string | undefined =
            await this.getApiKeyFromConfig();
            let isApiKeyShifted = false;
        if (apiKey) {
            //SET API KEY IN SECRET STORAGE
           isApiKeyShifted =  await new SecretApiKeyManager(this.context).setApiKey(
                this.context,
                apiKey
            );
            
        }
        // we only delete the key from config only if we successfully shift the key to secret storage
        if(isApiKeyShifted){
this.deleteApiKeyFromConfig();
        }else{
            console.log("Failure in shifting Api key to secret storage");

            // should we show user visible error? 
        }

    }

    private async getApiKeyFromConfig(): Promise<string | undefined> {
        try {

            const config = vscode.workspace.getConfiguration("fluttergpt");
            const apiKey = config.get<string>("apiKey");

            if (apiKey) {
                

                return apiKey;
            }

            return undefined;
        } catch (error) {
            console.log("this.checkIfApiKeyIsInConfig error:", error);
            return undefined;
        }
    }

   private deleteApiKeyFromConfig(){
    const config = vscode.workspace.getConfiguration("fluttergpt");

    config.update("apiKey", undefined, vscode.ConfigurationTarget.Global);
   }
}
