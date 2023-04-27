import * as vscode from 'vscode';
import { OpenAIRepository } from '../../repository/openai-repository';
import { extractDartCode, extractExplanation } from '../../utilities/code-processing';
import * as fs from 'fs';
import * as path from 'path';

export async function createResponsiveWidgetFromCode(openAIRepo: OpenAIRepository) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
    }

    const blueprint = editor.document.getText(editor.selection);
    if (!blueprint) {
        vscode.window.showErrorMessage('No Code selected');
        return;
    }

    const enteredWidgetName = await vscode.window.showInputBox({
        prompt: 'Enter the widget name',
        placeHolder: 'MyWidget i.e. same as the name of the class selected',
    });

    if (!enteredWidgetName) {
        vscode.window.showErrorMessage('No widget name provided.');
        return;
    }
    const webFileName = `${toSnakeCase(enteredWidgetName)}_web.dart`;
    const tabletFileName = `${toSnakeCase(enteredWidgetName)}_tablet.dart`;
    const selectorFileName = `${toSnakeCase(enteredWidgetName)}.dart`;

    const folderPath = path.dirname(editor.document.uri.fsPath);
    const webFilePath = path.join(folderPath, webFileName);
    const tabletFilePath = path.join(folderPath, tabletFileName);
    const selectorFilePath = path.join(folderPath, selectorFileName);

    // Generate responsive code for web and tablet
    const webCode = await generateWebCode(blueprint, openAIRepo, enteredWidgetName);
    const tabletCode = await generateTabletCode(blueprint, openAIRepo, enteredWidgetName);
    const selectorCode = generateSelectorCode(enteredWidgetName);


    // Create and write to the new files
    fs.writeFileSync(webFilePath, webCode);
    fs.writeFileSync(tabletFilePath, tabletCode);
    fs.writeFileSync(selectorFilePath, selectorCode);

    vscode.window.showInformationMessage(`Files ${webFileName} and ${tabletFileName} created successfully.`);
}

async function generateWebCode(selectedText: string, openAIRepo: OpenAIRepository, widgetName: String): Promise<string> {
    try {
        const modifiedName = toPascalCase(widgetName + "Web");
        var dartCode = "";
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        prompt += `Create Flutter/Dart code for the following dart code: ${selectedText} such that the widget is website compatible.
        change the class or widget name to ${modifiedName}.use responsive sizing and add Web to the widget name at the end. 
        Closely analyze the blueprint, see if any state management or architecture is specified and output complete functioning code 
        in a single block. The widget dimension should increase and decrease as the width of the screen changes.use relative sizing.`;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating Code",
            cancellable: false
        }, async (progress) => {
            let progressPercentage = 0;
            let prevProgressPercentage = 0;
            const progressInterval = setInterval(() => {
                prevProgressPercentage = progressPercentage;
                progressPercentage = (progressPercentage + 10) % 100;
                const increment = progressPercentage - prevProgressPercentage;
                progress.report({ increment });
            }, 200);
            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            dartCode = extractDartCode(result);
        });
        if (!dartCode) {
            return '';
        } else {
            return dartCode;
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating web code: ${error}`);
        return '';
    }
}


async function generateTabletCode(selectedText: string, openAIRepo: OpenAIRepository, widgetName: String): Promise<string> {
    try {
        const modifiedName = toPascalCase(widgetName + "Tablet");
        var dartCode = "";
        let prompt = `You're an expert Flutter/Dart coding assistant. Follow the user instructions carefully and to the letter.\n\n`;
        prompt += `Create Flutter/Dart code for the following dart code: ${selectedText} such that the widget is table compatible.
        change the class or widget name to ${modifiedName}. use responsive sizing. Closely analyze the blueprint, 
        see if any state management or architecture is specified and output complete functioning code in a single block.
        The widget dimension should increase and decrease as the width of the screen changes.use relative sizing.`;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Creating Code",
            cancellable: false
        }, async (progress) => {
            let progressPercentage = 0;
            let prevProgressPercentage = 0;
            const progressInterval = setInterval(() => {
                prevProgressPercentage = progressPercentage;
                progressPercentage = (progressPercentage + 10) % 100;
                const increment = progressPercentage - prevProgressPercentage;
                progress.report({ increment });
            }, 200);
            const result = await openAIRepo.getCompletion([{
                'role': 'user',
                'content': prompt
            }]);
            clearInterval(progressInterval);
            progress.report({ increment: 100 });

            dartCode = extractDartCode(result);
        });
        if (!dartCode) {
            return '';
        } else {
            return dartCode;
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating web code: ${error}`);
        return '';
    }
}

function generateSelectorCode(widgetName: string): string {

    var mobileWidgetName = widgetName + 'Mobile';
    var webWidgetName = widgetName + 'Web';
    var tabletWidgetName = widgetName + 'Tablet';

    const selectorCode = `
import 'package:flutter/material.dart';
import 'package:responsive_builder/responsive_builder.dart';
import '${toSnakeCase(mobileWidgetName)}.dart';
import '${toSnakeCase(webWidgetName)}.dart';
import '${toSnakeCase(tabletWidgetName)}.dart';

class ${widgetName} extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
        builder: (context, constraints) => ScreenTypeLayout.builder(
          mobile: (p0) =>  ${toPascalCase(mobileWidgetName)}(),
          tablet: (p0) =>  ${toPascalCase(tabletWidgetName)}(),
          desktop: (p0) =>  ${toPascalCase(webWidgetName)}(),
        ),
      );
  }


}
`;

    return selectorCode;
}

//convert a snakecase to Pascal case
function toPascalCase(str: string): string {
    return str.replace(/(^|_)(\w)/g, function (x) {
        return x.toUpperCase().replace(/_/, ' ');
    });
}


function toSnakeCase(str: string): string {
    return str
        .replace(/[\w]([A-Z])/g, (m) => m[0] + '_' + m[1])
        .toLowerCase();
}
