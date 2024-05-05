class AgentProvider {
  constructor(json) {
    this.json = json;
  }
  getInputs(inputString, activeAgent) {
    for (const item of this.json) {
      for (const command of item.supported_commands) {
        if (command.slug === inputString && item.name === activeAgent) {
          return JSON.parse(JSON.stringify({...command, testing: item.testing}));
        }
      }
    }
    return [];
  }
}