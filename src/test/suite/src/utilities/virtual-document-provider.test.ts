import * as vscode from 'vscode';
import * as assert from 'assert';
import { tempScheme, virtualDocumentProvider } from '../../../../utilities/virtual-document-provider';

suite('VirtualDocumentProvider Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests for VirtualDocumentProvider.');

    test('Add and provide document content successfully', async () => {
        const testUri = vscode.Uri.parse(`${tempScheme}:///test-doc`);
        const testContent = 'Test content for our document';
        
        // Simulate adding a document
        virtualDocumentProvider.addDocument(testUri, testContent);

        // Attempt to retrieve the document's content
        const returnedContent = await virtualDocumentProvider.provideTextDocumentContent(testUri, new vscode.CancellationTokenSource().token);

        // Assert that the returned content matches what we added
        assert.strictEqual(returnedContent, testContent);
    });

    test('Remove a document and ensure it\'s gone', async () => {
        const testUri = vscode.Uri.parse(`${tempScheme}:///to-be-removed-doc`);
        const testContent = 'This document will be removed';

        // Add then remove a document
        virtualDocumentProvider.addDocument(testUri, testContent);
        virtualDocumentProvider.removeDocument(testUri);

        // Attempt to retrieve the now-removed document's content
        try {
            await virtualDocumentProvider.provideTextDocumentContent(testUri, new vscode.CancellationTokenSource().token);
            // If the above line does not throw, the test should fail
            assert.fail('Expected provideTextDocumentContent to throw for removed document, but it did not.');
        } catch (error) {
            if (error instanceof Error){
                assert.strictEqual(error.message, 'No Document Found Error');
            }
            else {throw new Error('error is not Error');}
        }
    });

    test('Attempt to fetch content of a non-existent document', async () => {
        // Define a URI for a document we know does not exist
        const nonexistentUri = vscode.Uri.parse(`${tempScheme}:///nonexistent-doc`);

        // Attempt to fetch this document's content, expecting an error
        try {
            await virtualDocumentProvider.provideTextDocumentContent(nonexistentUri, new vscode.CancellationTokenSource().token);
            // If the above line does not throw, the test should fail
            assert.fail('Expected an error for non-existent document content, but did not get one.');
        } catch (error) {
        
            if (error instanceof Error){
                assert.strictEqual(error.message, 'No Document Found Error');
            }
            else {throw new Error('error is not Error');}
            
        }
    });
});