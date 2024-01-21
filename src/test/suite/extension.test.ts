import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { filterSurroundingCode } from '../../tools/create/inline_code_completion';
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Single match', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {

			}
		  }`;
		const codeCompletion = `@override
		Widget build(BuildContext context) {
			return Sizedbox.shrink();
		}`;
		let result = filterSurroundingCode(orignalContent, codeCompletion, 6);
		assert.strictEqual(result, '			return Sizedbox.shrink();');
	});

	test('Double Matches', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);
			@override
			initState

			@override
			Widget build(BuildContext context) {

			}
		  }`;
		const codeCompletion = `@override
		initState

		@override
		Widget build(BuildContext context) {
			return Sizedbox.shrink();
		}
	}`;
		
		let result = filterSurroundingCode(orignalContent, codeCompletion, 8);
		assert.strictEqual(result, '			return Sizedbox.shrink();');
		
	});
	test('No Matches', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);
			@override
			initState

			@override
			Widget build(BuildContext context) {

			}
		  }`;
		const codeCompletion = `return Sizedbox.shrink();
		}`;
		
		let result = filterSurroundingCode(orignalContent, codeCompletion, 8);
		assert.strictEqual(result, 'return Sizedbox.shrink();');
		
	});
	test('Curly brackets surrounding with keyword', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {
				if {

				}
			}
		  }`;
		const codeCompletion = `@override
		Widget build(BuildContext context) {
			if {
				return {
					return Sizedbox.shrink();
				}
				}		
			}
		}`;
		let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
		assert.strictEqual(result, '\t\t\t\treturn {\n\t\t\t\t\treturn Sizedbox.shrink();\n\t\t\t\t}');
	});

	test('Curly brackets surrounding without keyword', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {
				{

				}
			}
		  }`;
		const codeCompletion = `@override
		Widget build(BuildContext context) {
			 {
				 {
					return Sizedbox.shrink();
				}
			}	
			}
		}`;
		let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
		assert.strictEqual(result, '\t\t\t\t {\n\t\t\t\t\treturn Sizedbox.shrink();\n\t\t\t\t}');
	});
	//TODO: This fails
	test('Extra spaces match', ()=>{
		const orignalContent = `class OldSection extends StatelessWidget {
			final CategoryFeed oldBooks;
			const OldSection(this.oldBooks);

			@override
			Widget build(BuildContext context) {

			}
		  }`;
		const codeCompletion = `@override
		Widget build(BuildContext context) {
			return Sizedbox.shrink();
		}`;
		let result = filterSurroundingCode(orignalContent, codeCompletion, 7);
		assert.strictEqual(result, '			return Sizedbox.shrink();');
	});
	
});