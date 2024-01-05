import * as vscode from "vscode";

export async function addNewLine() {
  await vscode.commands.executeCommand("type", {
    source: "keyboard",
    text: "\n",
  });
}

export async function setState() {
  // setState block #START
  // Programatically triggering "setState" to update
  //! It's a work-around, I am not sure if this it is how we do it.
  //! Playaround with it by disabling code below.
  await vscode.commands.executeCommand("type", {
    source: "keyboard",
    text: " ",
  });
}
