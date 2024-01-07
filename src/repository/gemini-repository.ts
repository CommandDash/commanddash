import { ContentEmbedding, GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import * as fs from 'fs';
import * as vscode from "vscode";
import * as crypto from 'crypto';
import path = require("path");

function handleError(error: Error, userFriendlyMessage: string): never {
    console.error(error); // Log the detailed error for debugging purposes
    // Here you could also include logic to log to an external monitoring service
    throw new Error(userFriendlyMessage); // Throw a user-friendly message
}

export class GeminiRepository {
    private apiKey?: string;
    private genAI: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.ensureCacheDirExists().catch(error => {
            handleError(error, 'Failed to initialize the cache directory.');
        });
    }

    public async generateTextFromImage(prompt: string, image: string, mimeType: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro-vision" });
        const imageParts = [
            this.fileToGenerativePart(image, mimeType),
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        return text;
    }

    public async getCompletion(prompt: { role: string, parts: string }[], isReferenceAdded?: boolean): Promise<string> {

        if (!this.apiKey) {
            throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
        }
        let lastMessage = prompt.pop();
        if (lastMessage && isReferenceAdded) {
            const dartFiles = await this.findClosestDartFiles(lastMessage.parts);
            lastMessage.parts = "You're a vscode extension copilot, you've complete access to the codebase. I'll provide you with top 5 closest files code as context and your job is to read following workspace code end-to-end and answer the prompt initialised by `@workspace` symbol. If you're unable to find answer for the requested prompt, suggest an alternative solution as a dart expert. Be crisp & crystal clear in your answer. Make sure to provide your thinking process in steps. Here's the code: \n\n" + dartFiles + "\n\n" + lastMessage.parts;
        }
        const chat = this.genAI.getGenerativeModel({ model: "gemini-pro", generationConfig: { temperature: 0.0, topP: 0.2 } }).startChat(
            {
                history: prompt,
            }
        );
        const result = await chat.sendMessage(lastMessage?.parts ?? "");

        const response = result.response;
        const text = response.text();

        // Creating a result for you
        return text;
    }

    // Cache structure
    private codehashCache: { [filePath: string]: { codehash: string, embedding: ContentEmbedding } } = {};


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
            await fs.promises.mkdir(cacheDir, { recursive: true, mode: 0o700 }); // Sets the directory mode to read/write/execute for the owner only
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
    public async findClosestDartFiles(query: string): Promise<string> {
        try {
            if (!this.apiKey) {
                throw new Error('API token not set, please go to extension settings to set it (read README.md for more info)');
            }

            // Load cache if not already loaded
            if (Object.keys(this.codehashCache).length === 0) {
                await this.loadCache();
            }

            // Initialize the embedding model for document retrieval
            const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });

            // Find all Dart files in the workspace
            const dartFiles = await vscode.workspace.findFiles('**/*.dart');

            // Read the content of each Dart file and compute codehash
            const fileContents = await Promise.all(dartFiles.map(async (file) => {
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

            //Accessing work structure(it can take a while in first time)

            // Generate embedding for the query
            const queryEmbedding = await embeddingModel.embedContent({
                content: { role: "query", parts: [{ text: query }] },
                taskType: TaskType.RETRIEVAL_QUERY
            });

            // Calculate the Euclidean distance between the query embedding and each document embedding
            const distances = dartFiles.map((file, index) => ({
                file: file,
                distance: this.euclideanDistance(this.codehashCache[file.path].embedding.values, queryEmbedding.embedding.values)
            }));

            // Sort the files by their distance to the query embedding in ascending order
            distances.sort((a, b) => a.distance - b.distance);

            // Construct a string with the closest Dart files and their content
            let resultString = '';
            for (const fileEmbedding of distances.slice(0, 5)) {
                const fileContent = fileContents.find(fc => fc.path === fileEmbedding.file.path)?.text;
                resultString += fileContent;
            }

            // Fetching most relevant files
            return resultString.trim();
        } catch (error) {
            console.error("Error finding closest Dart files: ", error);
            throw error; // Rethrow the error to be handled by the caller
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

}