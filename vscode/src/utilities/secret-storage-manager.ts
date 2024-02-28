import * as vscode from "vscode";
import { logError } from "./telemetry-reporter";


export class SecretApiKeyManager{
    private static _instance: SecretApiKeyManager;
    private  _context: vscode.ExtensionContext|undefined;
    private _onDidChangeApiKey: vscode.EventEmitter<vscode.SecretStorageChangeEvent> = new vscode.EventEmitter<vscode.SecretStorageChangeEvent>();

    /**
 * Emits an event only if the apiKey's value is changed.
 *
 */
    public readonly onDidChangeApiKey: vscode.Event<vscode.SecretStorageChangeEvent> = this._onDidChangeApiKey.event;

    
    
    flutterGptScretStoreKey:string = "fluttergpt.apikey";

    private constructor() {
       
        this.flutterGptScretStoreKey = this.loadSecretStoreKey();
    }

    private loadSecretStoreKey(): string {
        // Load the secret store key from a configuration file or environment variable
        
        return process.env['flutter_gpt_secret_store_key'] || "fluttergpt.apikey";
    }



    public loadContext(context: vscode.ExtensionContext){
        context.subscriptions.push(this._onDidChangeApiKey);
 this._context =context;
 this.onApiKeyChange();
    }

    
    public static get instance() : SecretApiKeyManager {
        if(!this._instance) {
            this._instance = new SecretApiKeyManager();
        }
        return this._instance ;
    }
    

    

   


/**
 * Sets the API key in the secret storage. Make sure context is loaded before calling this method.
 * @param apiKey The API key to be set.
 * @returns A boolean indicating whether the API key was successfully set.
 * @throws Error if the context is not loaded before calling this method.
 */
     public async setApiKey( apiKey: string): Promise<boolean> {
        
       
        if(!this._context){
            
            throw new Error("context in secret storage manager class is not defined");
            
        }
       
            try {
                await this._context.secrets.store(this.flutterGptScretStoreKey, apiKey);
        
            
            return true;
            } catch (error) {
                console.log('set api key  error:', error);
                return false;
            }
        
    }
    
   /**
 * Retrieves the API key from the secret storage. Make sure context is loaded before calling this method.
 * @returns A Promise that resolves to the API key if found, or undefined if not found.
 * @throws Error if the context is not loaded before calling this method.
 */
    public async getApiKey(): Promise<string|undefined> {
        

        if(!this._context){
            throw new Error("context in secret storage manager class is not defined");
            
        }
        const apiKey = await this._context.secrets.get(this.flutterGptScretStoreKey);
       

        return apiKey || undefined;
    }
    
 /**
 * Deletes the API key from the secret storage. Make sure context is loaded before calling this method.
 */
 public async deleteApiKey(): Promise<void> {
    if(!this._context){
        throw new Error("context in secret storage is not defined");
        
    }
    return  await this._context.secrets.delete(this.flutterGptScretStoreKey);
    
}

/**
 * Emits an event only if the apiKey's value is changed. And is disposed off when
 * extension is disposed.
 */
private async onApiKeyChange() {
    if(!this._context){
        throw new Error("context in secret storage is not defined");
        
    }
    
    this._context.subscriptions.push(this._context.secrets.onDidChange((event)=>{
        if(event.key !== this.flutterGptScretStoreKey) {
            //apikey is not affected
            return;
        }
this._onDidChangeApiKey.fire(event);

      } ))
       ;
    
}

public dispose(){
    
    this._onDidChangeApiKey.dispose();
   
}

}