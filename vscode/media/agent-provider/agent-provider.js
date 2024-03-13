class AgentProvider {
    constructor() {
        this.agents = ['workspace', 'settings'];
        this.commands = ['refactor'];

        // Add your additional commands and agents
        this.agentCommandsMap = {
            'settings': ['apikey'],
        };

        // Description for commands and agents
        this.description = {
            'refactor': 'Refactor code with instructions',
            'workspace': 'Ask questions across your workspace',
            'apikey': 'Manage API keys',
        };

        this.commandsExecution = {
            'refactor': (input) => {
                this.executeRefactor(input);
            },
            'apikey': (input) => {
                this.executeApiKey(input);
            }
        };

        // Concatenate agent-specific commands to the agents array
        this.agents = this.agents.filter(agent => !(agent in this.agentCommandsMap)).concat(
            Object.entries(this.agentCommandsMap)
                .filter(([agent, cmds]) => cmds.length > 0)
                .map(([agent, cmds]) => cmds.map(cmd => `${agent} /${cmd}`))
                .flat()
        );
    }

    executeRefactor(input) {
        commandEnable = true;
        input.textContent = '';

        const inputJson = {
            "slug": "/refactor",
            "field_text": "",
            "text_field_layout": "<805088184> <736841542>",
            "inputs": [
                {
                    "id": "805088184",
                    "display_text": "Code Attachment",
                    "type": "code_input"
                },
                {
                    "id": "736841542",
                    "display_text": "Refactor instructions",
                    "type": "string_input"
                }
            ]
        };
        const agentBuilder = new AgentUIBuilder(input, inputJson);
        agentBuilder.buildAgentUI();

        setTimeout(() => {
            adjustHeight();
        }, 0);
    }

    executeApiKey(input) {
        input.textContent = "";

        const inputJson = {
            "slug": "/apikey",
            "field_text": "",
            "text_field_layout": "Update your API key <805088184>",
            "inputs": [
                {
                    "id": "805088184",
                    "display_text": "API Key",
                    "type": "string_input"
                }
            ]
        };

        const agentUIBuilder = new AgentUIBuilder(input, inputJson);
        agentUIBuilder.buildAgentUI();

        setTimeout(() => {
            adjustHeight();
        }, 0);
    }

    getAgentCommands(agent) {
        return this.agentCommandsMap[agent] || [];
    }

    getDescription(item) {
        return this.description[item] || '';
    }

    executeCommand(command, input) {
        if (command in this.commandsExecution) {
            this.commandsExecution[command](input);
        } else {
            console.log(`Command ${command} not found.`);
        }
    }
}