import * as vscode from "vscode";


export class SecretApiKeyManager{
    readonly context: vscode.ExtensionContext;
    flutterGptScretStoreKey:string = "fluttergpt.apikey";

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

     public async setApiKey(context: vscode.ExtensionContext, apiKey: string): Promise<boolean> {
       
    
       
            try {
                await context.secrets.store(this.flutterGptScretStoreKey, apiKey);
            
            return true;
            } catch (error) {
                console.log('set api key  error:', error);
                return false;
            }
        
    }
    
    // Function to get API key from secrets
    public async getApiKey(context: vscode.ExtensionContext): Promise<string|undefined> {
        const apiKey = await context.secrets.get(this.flutterGptScretStoreKey);
        return apiKey || undefined;
    }
    

}