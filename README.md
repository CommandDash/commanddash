# FlutterGPT README

FlutterGPT is an open-source project aimed at creating a coding assistant specifically designed for Flutter Engineers. This assistant helps with creating, refactoring, and debugging code, making the development process more efficient and enjoyable.

We're starting with simple features to create, refactor, and debug with a vision to build a supercharged, free-to-use coding assistant built for and by Flutter Engineers.

We only use GPT3.5 because it's fast, highly accurate, cheap, and is available to all.

## Features

### Create 
<ol type='a'>
<li>Widget from Description</li>
<li>Model Class from JSON (Freezed, JsonSerializable with copywith function)</li>
<li>Repository Class from Postman Json</li>
<li>Complete Code from BluePrint</li>
</ol>

<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/create.png" alt="Adding Code using FlutterGPT" width="500"/>

### Refactor
<ol type='a'>
<li>Anything with Instructions</li>
<li>Fix Errors</li>
</ol>

<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/readme_refactor/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>


## Requirements
1. You'll need an [OpenAI account](https://platform.openai.com) with a valid API key. For more information on obtaining an API key, please visit the [OpenAI API documentation](https://platform.openai.com/docs/).

## Getting Started

1. After installing the extensions, please visit your VSCode setttings, search for `fluttergpt.apiKey` and paste the (OPENAI API Key)[https://platform.openai.com/account/api-keys].

2. To get started, select any piece of your dart code, open VSCode command pallete and search for `FlutterGPT`. You'll see all available commands. Details below.

Please Note: Using OpenAI APIs will incur charges. From our observations, running 500 create widget from description costs only 1$.


#### Commands:
- `FlutterGPT Create: Widget from Description`: Creates a Flutter Widget from description. Be as specific as you like.
- `FlutterGPT Create: Model Class from JSON`: Create model classes from JSON with null safety in mind. You can also choose to generate Freezed or JsonSerializable modules
- `FlutterGPT Create: API Repository from Postman JSON`: Convert your postman JSON into API Repoitory
- `FlutterGPT Create: Code from Blueprint`: Get complete code from a blueprint of a class or function with the behaviour of functions, state management and architecture of your choice.
- `FlutterGPT Refactor: From Instructions`: Refactor widgets and logic both with this command.
- `FlutterGPT Refactor: Fix Errors`: Pass your runtime errors and get fixed code back.

## Known Issues

This is the beta version and can be unstable. 

## Release Notes

### 1.0.0

First version of FlutterGPT! 

## Contributing

We welcome contributions from the community. If you'd like to contribute to the project, report issues, or suggest new features, please follow the guidelines in our [CONTRIBUTING.md](CONTRIBUTING.md) file or reach out to us through [contact information].

## License

FlutterGPT is released under the Apache License Version 2.0. See the [LICENSE file](LICENSE) for more information.