class AgentProvider {
  constructor(json) {
    this.agents = [];
    this.commands = [];
    this.json = json;

    this.json.forEach(agent => {
      if (agent.name.trim().length > 0) {
        agent.supported_commands.forEach(commands => {
          this.agents.push(`${agent.name} - ${commands.slug}`);
        });
      } else {
        this.commands.push();
        agent.supported_commands.forEach(commands => {
          this.commands.push(commands.slug);
        });
      }
    });
  }

  getInputs(inputString) {
    const [agent, command] = inputString.split(' - ');
    if (agent && command) {
      const agentData = data.find(item => item.name === agent);
      if (agentData) {
        const commandData = agentData.supported_commands.find(cmd => cmd.slug === command);
        if (commandData) {
          return commandData;
        }
      }
    } else if (inputString.startsWith('/')) {
      const commandData = data.find(item => item.name.trim().length === 0).supported_commands.find(cmd => cmd.slug === inputString);
      if (commandData) {
        return commandData;
      }
    }

    return [];
  }
}