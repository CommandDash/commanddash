import { SecretApiKeyManager } from "../../../../utilities/secret-storage-manager";

import * as vscode from 'vscode';

import { ExposedApiKeyManager } from '../../../../utilities/exposed-api-key-manager';
import assert = require("assert");


suite('ExposedApiKey test suite', async () => {
    let extensionContext: vscode.ExtensionContext;
    
    
    suiteSetup(async()=>{await vscode.extensions.getExtension('fluttergpt')?.activate();
    extensionContext = (global as any).testExtensionContext;});
   
    
    test('Add/update apiKey in Secret Storage', async () => {
        let secretApiKeyManager : SecretApiKeyManager = SecretApiKeyManager.instance;
        secretApiKeyManager.loadContext(extensionContext);
        let beforeTestVal = await secretApiKeyManager.getApiKey();
        let mockedSecretApiKey = "mock-secret-key";
        
        await secretApiKeyManager.setApiKey(mockedSecretApiKey);
        
        let newlyAddedSecretApiKeyInSecretStorage  = await secretApiKeyManager.getApiKey();
        assert.strictEqual(mockedSecretApiKey, newlyAddedSecretApiKeyInSecretStorage );     
        if(beforeTestVal){
            await secretApiKeyManager.setApiKey(beforeTestVal);
            
        }
    });
    
    
});
