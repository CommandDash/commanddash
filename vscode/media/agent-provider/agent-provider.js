class AgentProvider {
  constructor(json) {
    this.agents = [];
    this.commands = [];
    this.json = json;

    this.json.forEach(agent => {
      if (agent.name.trim().length > 0) {
        this.agents.push(agent.name);
      } else {
        agent.supported_commands.forEach(commands => {
          this.commands.push(commands.slug);
        });
      }
    });
  }

  getInputs(inputString) {
    for (const item of data) {
      for (const command of item.supported_commands) {
        if (command.slug === inputString) {
          return command;
        }
      }
    }
    return []; // Return null if no matching slug is found
  }
}