import { ContentEmbedding, GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import * as fs from 'fs';
import * as vscode from "vscode";
import * as crypto from 'crypto';
import path = require("path");
import { appendReferences } from "../utilities/prompt_helpers";
import { getReferenceEditor } from "../utilities/state-objects";
import { GenerationRepository } from "./generation-repository";
import { extractReferenceTextFromEditor } from "../utilities/code-processing";
import { logError } from "../utilities/telemetry-reporter";

function handleError(error: Error, userFriendlyMessage: string): never {
    console.error(error);
    throw new Error(userFriendlyMessage);
}

export class GeminiRepository extends GenerationRepository {
    private genAI: GoogleGenerativeAI;

    private static _instance: GeminiRepository;

    constructor(apiKey: string) {
        super(apiKey);
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.ensureCacheDirExists().catch(error => {
            handleError(error, 'Failed to initialize the cache directory.');
        });
        GeminiRepository._instance = this;
    }

    public static getInstance(): GeminiRepository {
        return GeminiRepository._instance;
    }

    public async generateTextFromImage(prompt: string, image: string, mimeType: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const imageParts = [
            this.fileToGenerativePart(image, mimeType),
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = result.response;
        const text = response.text();
        return text;
    }

    public async getCompletion(prompt: { role: string, parts: string }[], isReferenceAdded?: boolean, view?: vscode.WebviewView): Promise<string> {
       // TODO: change this msg and flow acc. to new apikey method
        
        if (!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }
        let lastMessage = prompt.pop();

        // Count the tokens in the prompt
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        const { totalTokens } = await model.countTokens(lastMessage?.parts ?? "");
        console.log("Total input tokens: " + totalTokens);

        // Check if the token count exceeds the limit
        if (totalTokens > 30720) {
            throw Error('Input prompt exceeds the maximum token limit.');
        }

        const chat = this.genAI.getGenerativeModel({ model: "gemini-pro", generationConfig: { temperature: 0.0, topP: 0.2 } }).startChat(
            {
                history: prompt, generationConfig: {
                    maxOutputTokens: 2048,
                },
            }
        );
        const result = await chat.sendMessage(lastMessage?.parts ?? "");

        const response = result.response;
        const text = response.text();
        console.log('gemini response', text);
        return text;
    }

    //validate api key by sending 'Test message' as prompt
    public async validateApiKey(apiKey: string) {
        try {
            const _genAI = new GoogleGenerativeAI(apiKey);
            const model = _genAI.getGenerativeModel({ model: 'gemini-pro' });
            const result = await model.generateContent('Test message');
            return result.response.text;
        } catch (error) {
            // Check if the error is related to an invalid API key
            if (this.isApiKeyInvalidError(error)) {
                throw new Error('API key is not valid. Please pass a valid API key.');
            } else {
                // Handle other errors internally (optional: log them for debugging)
                console.error('gemini api error', error);
            }
        }
    }

    // Function to check if the error is related to an invalid API key
    public isApiKeyInvalidError(error: any): boolean {
        return (
            error &&
            error.message &&
            error.message.includes('API_KEY_INVALID')
        );
    }

    // Cache structure
    private codehashCache: { [filePath: string]: { codehash: string, embedding: ContentEmbedding } } = {};

    public displayWebViewMessage(view?: vscode.WebviewView, type?: string, value?: any) {
        view?.webview.postMessage({
            type,
            value
        });
    }

    private async sleep(msec: number) {
        return new Promise(resolve => setTimeout(resolve, msec));
    }


    // Modify the get cacheFilePath getter to point to a more secure location
    private get cacheFilePath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folders found.');
        }
        const projectFolder = workspaceFolders[0].uri.fsPath; // Assuming single root workspace
        const hash = this.computeCodehash(projectFolder); // Hash the path for uniqueness
        // Use os.tmpdir() to get the system's temporary directory
        const tempDir = require('os').tmpdir();
        return require('path').join(tempDir, 'flutterGPT', `${hash}.codehashCache.json`);
    }


    // Modify the saveCache method to set file permissions after writing the cache file
    private async saveCache() {
        try {
            const cacheData = JSON.stringify(this.codehashCache);
            const cachePath = this.cacheFilePath;
            await fs.promises.writeFile(cachePath, cacheData, { encoding: 'utf8', mode: 0o600 }); // Sets the file mode to read/write for the owner only
        } catch (error) {
            if (error instanceof Error) {
                handleError(error, 'Failed to save the cache data.');
            } else {
                console.error('An unexpected error type was thrown:', error);
            }
        }
    }

    private async loadCache() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const cacheData = await fs.promises.readFile(this.cacheFilePath, 'utf8');
                this.codehashCache = JSON.parse(cacheData);
            }
        } catch (error) {
            console.error("Error loading cache: ", error);
        }
    }

    // Ensure the directory exists and has the correct permissions
    private async ensureCacheDirExists() {
        const cacheDir = path.dirname(this.cacheFilePath);
        try {
            // Create the directory if it doesn't exist
            if (!fs.existsSync(cacheDir)) {
                await fs.promises.mkdir(cacheDir, { recursive: true, mode: 0o700 }); // Sets the directory mode to read/write/execute for the owner only
            }
        } catch (error: any) {
            if (error.code !== 'EEXIST') {
                handleError(error as Error, 'Failed to create a secure cache directory.');
            }
        }
    }

    // Compute a codehash for file contents
    private computeCodehash(fileContents: string): string {
        // Normalize the file content by removing whitespace and newlines
        const normalizedContent = fileContents.replace(/\s+/g, '');
        return crypto.createHash('sha256').update(normalizedContent).digest('hex');
    }

    // Find 5 closest dart files for query
    public async findClosestDartFiles(query: string, view?: vscode.WebviewView, shortcut: boolean = false, filepath: string = ''): Promise<string> {
        //start timer
        let operationCompleted = false;
        const timeoutPromise = new Promise<void>((resolve) => {
            setTimeout(() => {
                if (!operationCompleted) {
                    this.displayWebViewMessage(view, 'stepLoader', { fetchingFileLoader: true });
                }
                resolve();
            }, 5000);
        });
        try {
            if (!this.apiKey) {
                throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
            }

            let distances = [];
            let fileContents: any[] = [];

            // Load cache if not already loaded
            if (Object.keys(this.codehashCache).length === 0) {
                await this.loadCache();
            }

            // Load this only when shortcut is not called.
            if (!shortcut) {

                // Initialize the embedding model for document retrieval
                const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });

                // Find all Dart files in the workspace
                const excludePatterns = "**/{android,ios,web,linux,macos,windows,.dart_tool}/**";
                const dartFiles = await vscode.workspace.findFiles('**/*.dart', excludePatterns);

                // Read the content of each Dart file and compute codehash
                fileContents = await Promise.all(dartFiles.map(async (file) => {
                    const document = await vscode.workspace.openTextDocument(file);
                    const relativePath = vscode.workspace.asRelativePath(file, false);
                    const text = `File name: ${file.path.split('/').pop()}\nFile path: ${relativePath}\nFile code:\n\n\`\`\`dart\n${document.getText()}\`\`\`\n\n------\n\n`;
                    const codehash = this.computeCodehash(text);
                    return {
                        text,
                        path: file.path,
                        codehash
                    };
                }));

                // Filter out files that haven't changed since last cache
                const filesToUpdate = fileContents.filter(fileContent => {
                    const cachedEntry = this.codehashCache[fileContent.path];
                    return !cachedEntry || cachedEntry.codehash !== fileContent.codehash;
                });

                // Split the filesToUpdate into chunks of 100 or fewer
                const batchSize = 100;
                const batches = [];
                for (let i = 0; i < filesToUpdate.length; i += batchSize) {
                    batches.push(filesToUpdate.slice(i, i + batchSize));
                }

                // Process each chunk to get embeddings
                for (const batch of batches) {
                    try {
                        const batchEmbeddings = await embeddingModel.batchEmbedContents({
                            requests: batch.map((fileContent) => ({
                                content: { role: "document", parts: [{ text: fileContent.text }] },
                                taskType: TaskType.RETRIEVAL_DOCUMENT,
                            })),
                        });

                        // Update cache with new embeddings
                        batchEmbeddings.embeddings.forEach((embedding, index) => {
                            const fileContent = batch[index];
                            this.codehashCache[fileContent.path] = {
                                codehash: fileContent.codehash,
                                embedding: embedding
                            };
                        });
                    } catch (error) {
                        console.error('Error embedding documents:', error);
                        // Handle the error as appropriate for your application
                    }
                }

                // Save updated cache
                await this.saveCache();

                operationCompleted = true; // -> fetching most relevant files

                // Generate embedding for the query
                const queryEmbedding = await embeddingModel.embedContent({
                    content: { role: "query", parts: [{ text: query }] },
                    taskType: TaskType.RETRIEVAL_QUERY
                });

                // Calculate the Euclidean distance between the query embedding and each document embedding
                distances = dartFiles.map((file, index) => ({
                    file: file,
                    distance: this.euclideanDistance(this.codehashCache[file.path].embedding.values, queryEmbedding.embedding.values)
                }));
            } else {
                // Shortcut is true, directly use cached embeddings
                const dartFiles = Object.keys(this.codehashCache).map(path => ({ path }));
                console.log(dartFiles);
                const queryEmbedding = await this.genAI.getGenerativeModel({ model: "embedding-001" }).embedContent({
                    content: { role: "query", parts: [{ text: query }] },
                    taskType: TaskType.RETRIEVAL_QUERY
                });
                distances = dartFiles
                    .filter(file => file.path !== filepath) // Exclude current file path.
                    .map(file => ({
                        file: file,
                        distance: this.euclideanDistance(this.codehashCache[file.path].embedding.values, queryEmbedding.embedding.values)
                    }));
            }

            // Sort the files by their distance to the query embedding in ascending order
            distances.sort((a, b) => a.distance - b.distance);

            // Construct a string with the closest Dart files and their content
            let resultstring = '';
            for (const fileEmbedding of distances.slice(0, 5)) {
                const fileContent = fileContents.find(fc => fc.path === fileEmbedding.file.path)?.text;
                resultstring += fileContent;
            }

            // Enforce the context limit of 30k tokens
            const tokenLimit = 30000;
            if (resultstring.length > tokenLimit) {
                resultstring = resultstring.substring(0, tokenLimit);
            }

            // A list of most relevant file paths
            const filePaths = distances.slice(0, 5).map(fileEmbedding => {
                return fileEmbedding.file.path.split("/").pop();
            });
            this.displayWebViewMessage(view, 'stepLoader', { creatingResultLoader: true, filePaths }); //-> generating results along with file names
            console.log("Most relevant file paths:" + filePaths);

            // Fetching most relevant files
            return resultstring.trim();
        } catch (error) {
            logError('find-closest-dart-files-error', error);
            console.error("Error finding closest Dart files: ", error);
            throw error; // Rethrow the error to be handled by the caller
        } finally {
            await timeoutPromise;
        }
    }


    private euclideanDistance(a: string | any[], b: number[]) {
        let sum = 0;
        for (let n = 0; n < a.length; n++) {
            sum += Math.pow(a[n] - b[n], 2);
        }
        return Math.sqrt(sum);
    }

    // Converts local file information to a GoogleGenerativeAI.Part object.
    private fileToGenerativePart(path: string, mimeType: string) {
        return {
            inlineData: {
                data: Buffer.from(fs.readFileSync(path)).toString("base64"),
                mimeType
            },
        };
    }

    public async optimizeCode(finalstring: string, contextualCode: string | undefined, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the instructions carefully and output response in the modified format..\n\n`;
        prompt += `Develop and optimize the following Flutter code by troubleshooting errors, fixing errors, and identifying root causes of issues. Reflect and critique your solution to ensure it meets the requirements and specifications of speed, flexibility and user friendliness.\n\n Please find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalstring + '\n```\n\n';
        if (contextualCode) {
            prompt += `Here are the definitions of the symbols used in the code\n${contextualCode} \n\n`;
        }
        let referenceEditor = getReferenceEditor(globalState);
        prompt = appendReferences(referenceEditor, prompt);
        prompt += `Output the optimized code in a single code block to be replaced over selected code.`;
        prompt += `Proceed step by step:
            1. Describe the selected piece of code.
            2. What are the possible optimizations?
            3. How do you plan to achieve that ? [Don't output code yet]
            4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION.Since this is without human review, you need to output the precise CURSOR_SELECTION`;
        console.log(prompt);
        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);
        return result;
    }

    public async fixErrors(finalstring: string, contextualCode: string | undefined, errorsDescription: string, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `Follow the instructions carefully and to the letter. You're a Flutter/Dart debugging expert.\n\n`;
        prompt += ` Please find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalstring + '\n```\n\n';
        if (errorsDescription) {
            prompt += `The errors are: ${errorsDescription}\n\n`;
        }
        if (contextualCode) {
            prompt += `Here are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
        }
        prompt = appendReferences(getReferenceEditor(globalState), prompt);

        prompt += `First give a short explanation and then output the fixed code in a single code block to be replaced over the selected code.`;
        prompt += `Proceed step by step: 
        1. Describe the selected piece of code and the error.
        2. What is the cause of the error?
        3. How do you plan to fix that? [Don't output code yet]
        4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION. Since this is without human review, you need to output the precise CURSOR_SELECTION`;

        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);
        return result;
    }

    public async refactorCode(finalstring: string, contextualCode: string | undefined, instructions: string, globalState: vscode.Memento): Promise<string | undefined> {
        let referenceEditor = getReferenceEditor(globalState);
        let prompt = 'You are a Flutter/Dart assistant helping user modify code within their editor window.';
        prompt += `Modification instructions from user:\n${instructions}.\n\nPlease find the editor file code. To represent the selected code, we have it highlighted with <CURSOR_SELECTION> ..... <CURSOR_SELECTION>.\n` + '```\n' + finalstring + '\n```\n';

        prompt = appendReferences(referenceEditor, prompt);
        if (contextualCode) {
            prompt += `\n\nHere are the definitions of the symbols used in the code\n${contextualCode}\n\n`;
        }
        prompt += `Proceed step by step: 
        1. Describe the selected piece of code.
        2. What is the intent of user's modification?
        3. How do you plan to achieve that? [Don't output code yet]
        4. Output the modified code to be be programatically replaced in the editor in place of the CURSOR_SELECTION. Since this is without human review, you need to output the precise CURSOR_SELECTION
        
        IMPORTANT NOTE: Please make sure to output the modified code in a single code block.
        Do not just give explanation prose but also give the final code at last.
        `;
        console.log(prompt);
        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);
        return result;
    }

    public async createModelClass(library: string | undefined, jsonStructure: string, includeHelpers: string | undefined, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        let referenceEditor = getReferenceEditor(globalState);
        if (referenceEditor !== undefined) {
            const referenceText = extractReferenceTextFromEditor(referenceEditor);
            if (referenceText !== '') {
                prompt += `Keeping in mind these references/context:\n${referenceText}\n`;
            }
        }
        prompt += `Create a Flutter model class, keeping null safety in mind for from the following JSON structure: ${jsonStructure}.`;

        if (library && library !== 'None') {
            prompt += `Use ${library}`;
        }
        if (includeHelpers === 'Yes') {
            prompt += `Make sure toJson, fromJson, and copyWith methods are included.`;
        }
        prompt += `Output the model class code in a single block.`;

        const result = await this.getCompletion([
            {
                role: "user",
                parts: prompt
            }
        ]);

        return result;
    }

    public async createRepositoryFromJson(description: string, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        let referenceEditor = getReferenceEditor(globalState);
        if (referenceEditor !== undefined) {
            const referenceText = extractReferenceTextFromEditor(referenceEditor);
            if (referenceText !== '') {
                prompt += `Keeping in mind these references/context:\n${referenceText}\n`;
            }
        }

        prompt += `Create a Flutter API repository class from the following postman export:\n${description}\nGive class an appropriate name based on the name and info of the export\nBegin!`;

        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);

        return result;
    }

    public async createCodeFromBlueprint(blueprint: string, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        let referenceEditor = getReferenceEditor(globalState);
        if (referenceEditor !== undefined) {
            const referenceText = extractReferenceTextFromEditor(referenceEditor);
            if (referenceText !== '') {
                prompt += `Keeping in mind these references/context:\n${referenceText}\n`;
            }
        }
        prompt += `Create Flutter/Dart code for the following blueprint: \n===${blueprint}\n===. Closely analyze the blueprint, see if any state management or architecture is specified and output complete functioning code in a single block.`;
        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);
        return result;
    }

    public async createCodeFromDescription(aboveText: string, belowText: string, instructions: string, globalState: vscode.Memento): Promise<string | undefined> {
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        let referenceEditor = getReferenceEditor(globalState);
        if (referenceEditor !== undefined) {
            const referenceText = extractReferenceTextFromEditor(referenceEditor);
            if (referenceText !== '') {
                prompt += `Keeping in mind these references/context:\n${referenceText}\n`;
            }
        }
        prompt += `Create a valid Dart code block based on the following instructions:\n${instructions}\n\n`;
        prompt += `To give you more context, here's `;
        if (aboveText.length > 0) {
            prompt += `the code above the line where you're asked to insert the code: \n ${aboveText}\n\n`;
        }
        if (belowText.length > 0) {
            if (aboveText.length > 0) { prompt += `And here's `; }
            prompt += `the code below the line where you're asked to insert the code: \n ${belowText}\n\n`;
        }
        prompt += `Should you have any general suggestions, add them as comments before the code block. Inline comments are also welcome`;

        const result = await this.getCompletion([{
            'role': 'user',
            'parts': prompt
        }]);
        return result;
    }
}