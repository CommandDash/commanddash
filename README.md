<p align="center">
  <a href="" rel="noopener">
 <img height=200px src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/icon.png"></a>
</p>
<h1 align="center">FlutterGPT</h1>
<div align="center">

[![VScode Downloads](https://img.shields.io/visual-studio-marketplace/d/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![VScode version](https://img.shields.io/visual-studio-marketplace/v/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![License: APACHE](https://img.shields.io/badge/License-APACHE%202.0-yellow)](/LICENSE)

<h4> Your Flutter AI Copilot powered with Gemini Code & Vision.</h4>
</div>

-----------------
FlutterGPT is an open-source coding assistant specifically designed for Flutter Engineers. The assistant allows you to chat with Gemini inside VSCODE and create, refactor and debug code. 

##### ✨ Powered by Gemini 
##### 🤝 Dart Analyzer Inside
##### 👨🏼‍💻 For and by Flutter Engineers

Our vision is to make Flutter development faster and easily adoptable by automating low-level workflows that we as developers work on a daily basis.

-----------------
## Getting Started

##### 1. Create Free Gemini API Key
Visit [Makersuite by Google](https://makersuite.google.com/) and create your free API Key.
##### 2. Add the key to FlutterGPT
In your VSCODE settings, search for `fluttergpt.apiKey` and paste the API Key.
##### 3. Run your first command.
To get started, right-click on your editor in a dart project. Checkout all features below. 🔽

## Features

### 🚀 Chat
<p align="center">
<img src="https://media.giphy.com/media/T4ZnPW67QbajS5z4nU/giphy.gif" alt="Chat with Gemini inside VSCODE" width="500"/>
</p>

Chat with Gemini Pro right from your IDE. Ask anything related to Flutter or Dart and get instant answers. Query your workspace using `@workspace` command.

### 💬 Generate
<p align="center">
<img src="https://media.giphy.com/media/5kEGTvZhP7joI0wbu4/giphy.gif" alt="Generate code with Gemini inside VSCODE" width="500"/>
</p>

Generate code snippets directly in your IDE with the inline code generation feature. Simply type your request and let Gemini provide you with instant code solutions. 

### 💡 Create
<p align="center">
<img src="https://media.giphy.com/media/ytNTZHcMLFYmwbrgcA/giphy.gif" alt="Creating Widget using FlutterGPT" width="500"/>
</p>

#### 1. **Widget from Image or Description**

Use Gemini's multimodal capabilities to create widget from a image with added description. 

Command: `FlutterGPT Create: Widget from Image or Description`

#### 2. **Complete Code from BluePrint**

Get complete code from a blueprint of a class or function with the behaviour of functions, state management and architecture of your choice.

Command: `FlutterGPT Create: Code from Blueprint`

#### 3. **Complete Code from Description**

Generate complete classes from your description.

Command: `FlutterGPT Create: Code from Description`


### ✨ Refactor

<p align="center">
<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>
</p>

#### 1. **From Instruction**

Refactor widgets and logic both with this command.

Command: `FlutterGPT Refactor: From Instructions`

#### 2. **Optimize Code**

Pass your runtime errors and get fixed code back.

Command: `FlutterGPT Refactor: Optimize`

#### 3. **Auto Fix**

Select any method or code with errors, run Auto Fix .

Command: `FlutterGPT Refactor: Fix Errors`

### 📝 Add to Reference

LLM's work great when provided with references along with the instructions. FlutterGPT users can now add any piece of code or customized descriptions as reference and they'll be passed to model for any command being used.

**Practical usecases:**

1. Having widgets follow a state management and use a view model already defined in your code.

2. Use snippets as a reference while refactoring large part of projects to use the same style and structure.

3. In, `codeFromBluePrint` to generate full-fledged classes taking state management, architecture and style as reference from an existing class.

## FAQs

1. **How safe and secure is it to use, and can you explain why?**
- FlutterGPT is powered by Google's  Gemini Models and is secure to use for personal usage or work - [Safety and Security Guidelines](https://blog.google/technology/ai/google-gemini-ai/#responsibility-safety)

2. **Do I need to pay to use FlutterGPT?**

- Gemini PRO is currently in early access and is completely free to use for upto 60 requests for minute. Please check the [pricing](https://ai.google.dev/pricing) here.

3. **I am an Android Studio user. Can I use FlutterGPT?**
- FlutterGPT is available for IntelliJ-based IDEs and can be downloaded from the plugin marketplace. Please follow this link: [https://plugins.jetbrains.com/plugin/21568-fluttergpt]



## Contributing

FlutterGPT 💙 is community centric and any contribution is most welcome to make it useful for you!

### Ways to contribute

- **File feature requests**: Suggest features that'll make your development process easier in the [issues board](https://github.com/Welltested-AI/fluttergpt/issues).
- **Pick up open issues**: Pick up and fix existing issues in [issues board](https://github.com/Welltested-AI/fluttergpt/issues).
- **Participate in discussions**: Help by sharing your ideas in the [active discussions](https://github.com/Welltested-AI/fluttergpt/discussions/182). 

To contribute, please follow the guidelines in our [CONTRIBUTING.md](CONTRIBUTING.md) file.

## Community

We have friendly mentors and a supportive community ready to guide you every step of the way [Join Now](https://join.slack.com/t/welltested-ai/shared_invite/zt-25u09fty8-gaggH9HbmopB~4tialTrlA)

## Running Locally for Contribution
 1. Clone the repository.
 2. Run `npm install`
 3. Use the `Run Extension` command from launch.json for running the extension.
 4. Ensure you've specified the Gemini API key in the settings.

## Roadmap

To get a sense of direction of where we're heading, please check out our [Roadmap](ROADMAP.md).

## Known Issues

This is the beta version and can be unstable. Please check our [issues board](https://github.com/Welltested-AI/fluttergpt/issues) for any known issues.


## Release Notes: 0.2.4

- Added inline code generation feature
- Created a centralised command registration method

## License

FlutterGPT is released under the Apache License Version 2.0. See the [LICENSE](LICENSE) file for more information.