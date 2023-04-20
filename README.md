<p align="center">
  <a href="" rel="noopener">
 <img height=200px src="https://storage.googleapis.com/cms-storage-bucket/0dbfcc7a59cd1cf16282.png" alt="Flutter-logo"></a>
</p>
<h1 align="center">FlutterGPT</h1>
<div align="center">

[![VScode Downloads](https://img.shields.io/visual-studio-marketplace/d/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![VScode version](https://img.shields.io/visual-studio-marketplace/v/WelltestedAI.fluttergpt)](https://marketplace.visualstudio.com/items?itemName=WelltestedAI.fluttergpt&ssr=false#overview)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](/LICENSE)

<h4>Use ChatGPT right inside your IDE to create, refactor and debug Flutter code</h4>
</div>

-----------------
FlutterGPT is an open-source project aimed at creating a coding assistant specifically designed for Flutter Engineers. This assistant helps with creating, refactoring, and debugging code, making the development process more efficient and enjoyable.

We're starting with simple features to create, refactor, and debug with a vision to build a supercharged, free-to-use coding assistant built for and by Flutter Engineers.

We only use GPT3.5 because it's fast, highly accurate, cheap, and is available to all.

-----------------

## Features


### 🪄 Create

<p align="center">
<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>
</p>

#### Widget from Description
Create flutter widgets based on the description you provide. Be as specific as you like.

`FlutterGPT Create: Widget from Description`

#### Model Class from JSON
Create model classes from JSON with null safety in mind. You can also choose to generate Freezed or JsonSerializable modules

`FlutterGPT Create: Model Class from JSON`


#### Repository Class from Postman Json

Convert you postman collection exports json to API repository class

`FlutterGPT Create: API Repository from Postman JSON`

#### Complete Code from BluePrint

Get complete code from a blueprint of a class or function with the behaviour of functions, state management and architecture of your choice.

`FlutterGPT Create: Code from Blueprint`


### 🛠️ Refactor

<p align="center">
<img src="https://raw.githubusercontent.com/Welltested-AI/fluttergpt/main/media/refactor.png" alt="Refactoring Code using FlutterGPT" width="500"/>
</p>

#### From Instruction
Refactor widgets and logic both with this command.

`FlutterGPT Refactor: From Instructions`

#### Fix Errors
Pass your runtime errors and get fixed code back.

`FlutterGPT Refactor: Fix Errors`

## Requirements
1. You'll need an [OpenAI account](https://platform.openai.com) with a valid API key. For more information on obtaining an API key, please visit the [OpenAI API documentation](https://platform.openai.com/docs/).

## Getting Started

1. After installing the extensions, please visit your VSCode setttings, search for `fluttergpt.apiKey` and paste the (OPENAI API Key)[https://platform.openai.com/account/api-keys].

2. To get started, select any piece of your dart code, open VSCode command pallete and search for `FlutterGPT`. You'll see all available commands. Details below.

Please Note: Using OpenAI APIs will incur charges. From our observations, running 500 create widget from description costs only 1$.

## Known Issues

This is the beta version and can be unstable. 

## Release Notes

### 1.0.0

First version of FlutterGPT! 

## Contributing

We welcome contributions from the community. If you'd like to contribute to the project, report issues, or suggest new features, please follow the guidelines in our [CONTRIBUTING.md](CONTRIBUTING.md) file or reach out to us through [contact information].

## License

FlutterGPT is released under the Apache License Version 2.0. See the [LICENSE file](LICENSE) for more information.