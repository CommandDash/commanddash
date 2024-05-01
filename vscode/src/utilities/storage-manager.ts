import * as vscode from "vscode";

export class StorageManager {
    private static _instance: StorageManager;
    private _context: vscode.ExtensionContext | undefined;
    agentsSecretStoreKey: string = "commanddash.agents";

    public static get instance(): StorageManager {
        if (!this._instance) {
            this._instance = new StorageManager();
        }
        return this._instance;
    }

    public loadContext(context: vscode.ExtensionContext) {
        this._context = context;
    }

    public async setInstallAgents(agents: any): Promise<boolean> {
        if (!this._context) {
            throw new Error("Context is undefined");
        }

        try {
            await this._context.secrets.store(this.agentsSecretStoreKey, JSON.stringify(agents));
            return true;

        } catch (error) {
            console.log('Error while storing install agents:', error);
            return false;
        }
    }

    public async getInstallAgents(): Promise<any | undefined> {
        if(!this._context){
            throw new Error("Context is undefined");
            
        }
        const installAgents = await this._context.secrets.get(this.agentsSecretStoreKey);

        return installAgents || undefined;
    }

    public async deleteAgents(): Promise<void> {
        if(!this._context){
            throw new Error("Context is undefined");
        }
        return  await this._context.secrets.delete(this.agentsSecretStoreKey);
    }
}
