import { SecretManager } from "../secret-manager/secret-manager";

enum SetupSteps { github, apiKey, executable }

export class SetupManager {
    public pendingSetupSteps: SetupSteps[] = [];
    private secretManager = SecretManager.getInstance();
    private constructor() { }

    private static instance: SetupManager;

    public static getInstance(): SetupManager {
        if (!SetupManager.instance) {
            SetupManager.instance = new SetupManager();
        }

        return SetupManager.instance;
    }

    public async init(): Promise<void> {
        if(!this.secretManager.getGithubAccessToken()){
            this.pendingSetupSteps.push(SetupSteps.github);
        }
        if(!this.secretManager.getApiKey()){
            this.pendingSetupSteps.push(SetupSteps.apiKey);
        }
    }
}