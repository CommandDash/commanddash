Dash AI Roadmap
---------------

This document serves as a living record of the current and projected priorities for the Dash AI project. It is subject to change and aims to provide the community with insight into our future plans.

If you have concerns about the roadmap, you can email the devs at team@welltested.ai or raise a GitHub issue. Please note that bug fixes and miscellaneous features are not considered "roadmap projects" and will be addressed during normal development. This page outlines large-scale future plans for Dash AI.

## 🔽 [Full contextual knowledge](https://github.com/orgs/Welltested-AI/projects/2/)

To perform a task, humans or LLMs both need to understand the complete contextual code. This ticket has two main parts:

### 1. Getting the Nested Code

This involves incorporating nested methods/classes along with their inline documentation and passing them into the prompt context. Currently, the extension uses Dart Analyzer to achieve this, but only to a depth of one layer. This will be further enhanced.

### 2. Identifying Feature Scope Groups

When working with codebases, groups of files are often edited together for features. For example, when updating features, LLMs need to comprehend the entire layer, from UI to Domain to Repository to Datasource. Different scope groups exist depending on the task and architecture choices within the user's project. We require an AI programmatic method to automatically extract these groups based on user queries.

Note: This can currently be done manually in chat.

## 🔽 Up-to-Date Syntax

Programming languages constantly evolve, with new libraries, packages, architectures, and practices impacting developer code writing and maintenance. However, LLMs are trained once with data at a specific point in time and are not frequently updated.

To address this, we will utilize Retrieval Augmented Generation (RAG) to bridge the knowledge gap and allow LLMs to output the latest code. We will strive to consolidate the latest data and collaborate with the community to create the strongest Flutter dataset possible.

## 🔽 Ability to Run and Operate the App

Modern LLMs are multimodal, understanding text, code, visuals, and even audio. When connected to Dart Tools (analyzer, debugger, devtools) and Dart Runtime (VM), they can leverage their multimodal capabilities to not only write code but also:

Run and operate the app.
Interact with UI elements (tap, swipe, etc.).
Analyze logs and screen data to inform further actions and code iterations.

This allows us to mimic developer behavior and automate large-scale tasks in their entirety.

## 🔽 Specific Features

We have begun with basic features like inline code generation, refactoring and optimizing code, and fixing errors. We will continue to add features to automate all low-level tasks. You can also request features that would be helpful to you by filing [issues](https://github.com/Welltested-AI/dash-ai/issues).




