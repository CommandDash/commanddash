<p align="center">
  <a href="" rel="noopener">
 <img height=200px src="https://storage.googleapis.com/cms-storage-bucket/0dbfcc7a59cd1cf16282.png" alt="Flutter-logo"></a>
</p>
<h1 align="center">FlutterGPT</h1>
<div align="center">

[![VScode Downloads](https://img.shields.io/visual-studio-marketplace/d/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![VScode version](https://img.shields.io/visual-studio-marketplace/v/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![License: APACHE](https://img.shields.io/badge/License-APACHE%202.0-yellow)](/LICENSE)

<h4>Use ChatGPT right inside your IDE to create, refactor and debug Flutter code</h4>
</div>

-----------------
FlutterGPT is an open-source project aimed at creating a coding assistant specifically designed for Flutter Engineers. This assistant helps with creating, refactoring, and debugging code, making the development process more efficient and enjoyable.

We're starting with simple features to create, refactor, and debug with a vision to build a supercharged, free-to-use coding assistant built for and by Flutter Engineers.

We only use GPT3.5 because it's fast, highly accurate, cheap, and is available to all.

-----------------

## Features

### 🪄 Create

<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/create.png" alt="Creating Code using FlutterGPT" width="500"/>

#### 1. **Widget from Description**

Create flutter widgets based on the description you provide. Be as specific as you like.

`FlutterGPT Create: Widget from Description`

#### 2. **Model Class from JSON**

Create model classes from JSON with null safety in mind. You can also choose to generate Freezed or JsonSerializable modules

command: `FlutterGPT Create: Model Class from JSON`

#### 3. **Repository Class from Postman Json**

Convert you postman collection exports json to API repository class

command: `FlutterGPT Create: API Repository from Postman JSON`

#### 4. **Complete Code from BluePrint**

Get complete code from a blueprint of a class or function with the behaviour of functions, state management and architecture of your choice.

command: `FlutterGPT Create: Code from Blueprint`

#### 5. **Create Web and Tablet Counterparts**

Create Web and Tablet widgets from mobile code. Write the mobile code and let the AI do the rest. i.e create the tablet and web code.

command: `FlutterGPT Create: Web and Tablet Counterparts`

#### 6. **Create Mobile, Web and Tablet Counterpart from description**

Create Mobile, Web and Tablet widgets from description. Select a folder and write the description. The AI will create the code for you. i.e. create the mobile, tablet and web code and a selector file to choose the right code.

command: `FlutterGPT Create: Mobile, Web and Tablet Widget From Description`

### 🛠️ Refactor

<p align="center">
<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>
</p>

#### 1. **From Instruction**

Refactor widgets and logic both with this command.

command: `FlutterGPT Refactor: From Instructions`

#### 2. **Fix Errors**

Pass your runtime errors and get fixed code back.

command: `FlutterGPT Refactor: Fix Errors`


### 📝 Add to Reference

LLM's work great when provided with references along with the instructions. FlutterGPT users can now add any piece of code or customized descriptions as reference and they'll be passed to model for any command being used.

**Practical usecases:**

1. Having widgets follow a state management and use a view model already defined in your code.

2. Use snippets as a reference while refactoring large part of projects to use the same style and structure.

3. In, `codeFromBluePrint` to generate full-fledged classes taking state management, architecture and style as reference from an existing class.

## Requirements

1. You'll need an [OpenAI account](https://platform.openai.com) with a valid API key. For more information on obtaining an API key, please visit the [OpenAI API documentation](https://platform.openai.com/docs/).

## Getting Started

1. After installing the extensions, please visit your VSCode setttings, search for `fluttergpt.apiKey` and paste the [OPENAI API Key](https://platform.openai.com/account/api-keys).

2. To get started, select any piece of your dart code, open VSCode command pallete and search for `FlutterGPT`. You'll see all available commands. Details below.

Please Note: Using OpenAI APIs will incur charges. From our observations, running 500 create widget from description costs only 1$.


## FAQs

1. **How safe and secure is it to use, and can you explain why?**
- FlutterGPT communicates directly with the SSL-encrypted OpenAI APIs, which are protected by SOC2 Compliance. Additionally, any data sent to OpenAI via the APIs is not used for training, ensuring complete privacy and security. Therefore, it is completely safe to use for personal or company projects.

2. **Do I need to pay to use FlutterGPT?**
- FlutterGPT is an open-source and free-to-use project. However, you will need to use OpenAI APIs, which are paid. You can start with a free $5 credit, which equates to approximately 2500 create widget requests. After that, you pay on a usage basis. For more information on OpenAI pricing, please refer to their website: [https://openai.com/pricing](https://openai.com/pricing)

3. **I am an Android Studio user. Can I use FlutterGPT?**
- FlutterGPT is available for IntelliJ-based IDEs and can be downloaded from the plugin marketplace. Please follow this link: [https://plugins.jetbrains.com/plugin/21568-fluttergpt]

### Ways to contribute

- **File feature requests**: If you have an idea for a new feature that'll make your development life easier, please file a feature request on our [issues board](https://github.com/Welltested-AI/fluttergpt/issues).
- **Fix existing issues**: You can help us by fixing any existing issues in the project. Check out our [issues board](https://github.com/Welltested-AI/fluttergpt/issues) to find out what needs to be done.
- **Pick up approved features**: You can also contribute by picking up approved features from our [Roadmap](ROADMAP.md).

## Contributing

We welcome contributions from the Flutter community to help improve FlutterGPT. You can contribute to the project by reporting issues, suggesting new features and taking up next tasks from the [ROADMAP.md](ROADMAP.md). To contribute, please follow the guidelines in our [CONTRIBUTING.md](CONTRIBUTING.md) file. You can also reach out to us at team@welltested.ai if you have any questions or feedback.

## Running Locally for Contribution
 1. Clone the repository.
 2. Run `npm install`
 3. Use the `Run Extension` command from launch.json for running the extension.
 4. Ensure you've specified the OPENAI secret key in the settings.

## Roadmap

To get a sense of direction of where we're heading, please check out our [Roadmap](ROADMAP.md).

## Known Issues

This is the beta version and can be unstable. Please check our [issues board](https://github.com/Welltested-AI/fluttergpt/issues) for any known issues.


## Release Notes

### 0.0.6

- Add to Reference
- Create:
	- Web and Tablet Counterparts
	- Mobile, Web and Tablet Widget From Description
- Refactor:
	- Optimize


### 0.0.5

Refactors and UX improvements

### 0.0.4

First version of FlutterGPT!

## License

FlutterGPT is released under the Apache License Version 2.0. See the [LICENSE file](LICENSE) for more information.
