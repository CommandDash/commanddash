import * as vscode from "vscode";
import { GeminiRepository } from "../../repository/gemini-repository";
import { removeSpacesAndNewlines } from "../../utilities/string-manipluation";
import { extractDartCode } from "../../utilities/code-processing";
import { ExtensionKeyConstants } from "../../shared/types/constants";
import { addNewLine, setState } from "../../utilities/vscode-helper-methods";

export function setupInlineCodeCompletion(
  context: vscode.ExtensionContext,
  geminiRepo: GeminiRepository
) {
  // InlineCompletionModule Block #START

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "fluttergpt.inlineCodeCompletion.menu",
      () => registerInlineCodeCompletion(geminiRepo, context.globalState)
    )
  );

  // After user accepts the suggested inline code,
  // We need to perform cleanup and code formatter
  let inlineSuggestionCleanupCommand = vscode.commands.registerCommand(
    "fluttergpt.inlineCodeCompletion.cleanup",
    async () => {
      context.globalState.update(
        ExtensionKeyConstants.inlineCodeCompletionKey,
        ""
      );
      // Execute the formatter command
      vscode.commands.executeCommand("editor.action.format");
    }
  );

  context.subscriptions.push(inlineSuggestionCleanupCommand);

  // Registering inline completion for dart files only
  vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**/*.dart" },
    {
      provideInlineCompletionItems(document, position, _, __) {
        const output = context.globalState.get<string>(
          ExtensionKeyConstants.inlineCodeCompletionKey,
          ""
        );

        const inlineList: vscode.InlineCompletionItem[] = [
          {
            insertText: output,
            command: {
              command: "fluttergpt.inlineCodeCompletion.cleanup",
              title: "FlutterGPT: Inline code completion cleanup",
            },
          },
        ];
        return inlineList;
      },
    }
  );
  // InlineCompletionModule Block #END
}

async function registerInlineCodeCompletion(
  aiRepo: GeminiRepository,
  globalState: vscode.Memento
) {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FlutterGpt: Running",
      cancellable: false,
    },
    (progress, token) => {
      return longRunningInlineCompleteTask(aiRepo, globalState);
    }
  );
}

async function longRunningInlineCompleteTask(
  aiRepo: GeminiRepository,
  globalState: vscode.Memento
) {
  // Move the cursor to new line
  await addNewLine();
  // Get the active text editor
  const editor = vscode.window.activeTextEditor;
  // Record the GPT conversation
  const _conversationHistory: Array<{ role: string; parts: string }> = [];

  if (editor) {
    // Update the variable inlineCodeCompletionKey when we are waiting for GPT response
    globalState.update(
      ExtensionKeyConstants.inlineCodeCompletionKey,
      "in-progress"
    );

    //! READ THE IMPLEMENTATION
    setState();

    // Get the current cursor position
    const position = editor.selection.active;

    // add "[FILL HERE]" at the cursor positon
    // Let GPT know the location for the missing piece user is looking for
    await editor.edit(async (editorBuilder) => {
      editorBuilder.insert(position, "[FILL HERE]");
    });

    // Get the whole active file content
    let fileContent = vscode.window.activeTextEditor!.document.getText()!;

    {
      // BLOCK #START
      // This piece of code is used for removing the "[FILL HERE]"
      // Because we now have captured the reponse (including "[FILL HERE]" in fileContent variable)
      // we want to send to GPT But we dont want to keep showing it to the user
      const selection = editor.selection;
      const startLine = selection.start.line;
      const endLine = selection.end.line;

      // Determine the range of the current line(s)
      const range = new vscode.Range(
        startLine,
        0,
        endLine,
        editor.document.lineAt(endLine).text.length
      );

      // delete "[FILL HERE]"
      await editor.edit(async (editorBuilder) => {
        editorBuilder.delete(range);
      });
    } // BLOCK #END

    // Adding conversation history for GPT warm-up
    _conversationHistory.push(
      {
        role: "user",
        parts:
          "You are a flutter/dart development expert who specializes in providing production-ready well-formatted code.\n\n Only share source code with no explanations.",
      },
      {
        role: "model",
        parts:
          "I am a flutter/dart development expert who specializes in providing production-ready well-formatted code. How can I help you?\n\n",
      }
    );

    // pushing the filecontent to GPT
    _conversationHistory.push({ role: "user", parts: fileContent });

    // Waiting for the response
    const result = await aiRepo.getCompletion(_conversationHistory);

    // extract the dart code out of GPT response
    let finalresult = removeSpacesAndNewlines(extractDartCode(result));

    {
      // BLOCK #START
      // We are only looking to keep the information we dont have
      // to extract that information from the dart code
      // We first need to perform cleanup by removing any unnecessary spaces and new lines
      // And trim the response body

      // Split the file content into two halves "prefix" and "suffix"
      let splitText = fileContent.split("[FILL HERE]");

      let prefixText = removeSpacesAndNewlines(splitText[0]).trim();
      let suffixText = removeSpacesAndNewlines(splitText[1]).trim();

      // Order is important
      // 1st
      if (prefixText.length > 0 && prefixText !== "") {
        finalresult = finalresult.split(prefixText)[1] || finalresult;
      }
      // 2nd
      if (suffixText.length > 0 && prefixText !== "") {
        finalresult = finalresult.split(suffixText)[0] || finalresult;
      }
      // 3rd
      finalresult = finalresult.replace(/([;{}])/g, "$1\n");
    } // BLOCK #END

    // Update the inlineCodeCompletionKey with the finalresult
    globalState.update(
      ExtensionKeyConstants.inlineCodeCompletionKey,
      finalresult
    );

    //! READ THE IMPLEMENTATION
    setState();
  }
}
