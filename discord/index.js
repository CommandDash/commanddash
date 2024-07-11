require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
// const fetch = require('node-fetch'); // Ensure you have node-fetch installed
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    console.log('message received');

    // Ignore messages from the bot itself
    if (message.author.bot) return;

    // Check if the bot is tagged in the message
    if (message.mentions.has(client.user)) {
        const fetch = (await import('node-fetch')).default;

        // Fetch agent details
        const agentName = "flame_engine";
        let agentDetails;
        try {
            const response = await fetch("https://api.commanddash.dev/agent/get-latest-agent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: agentName }),
            });

            if (!response.ok) {
                throw new Error(`Failed to load the agent: ${await response.json()}`);
            }

            agentDetails = await response.json();
            console.log(agentDetails)
        } catch (error) {
            console.error('Error fetching agent details:', error);
            message.channel.send('Sorry, I could not fetch the agent details.');
            return;
        }

        // Function to split message into chunks of 2000 characters or less
        function splitMessage(message, maxLength = 2000) {
            if (message.length <= maxLength) return [message];
            const parts = [];
            while (message.length > maxLength) {
                let part = message.slice(0, maxLength);
                const lastNewline = part.lastIndexOf('\n');
                if (lastNewline > -1) {
                    part = part.slice(0, lastNewline + 1);
                }
                parts.push(part);
                message = message.slice(part.length);
            }
            parts.push(message);
            return parts;
        }

        // Function to keep typing indicator active
        function keepTyping(channel) {
            const interval = setInterval(() => {
                channel.sendTyping();
            }, 5000); // Typing indicator lasts for 10 seconds, so we refresh it every 5 seconds
            return interval;
        }

        // Function to stop typing indicator
        function stopTyping(interval) {
            clearInterval(interval);
        }

        // Check if the message is in a thread
        if (message.channel.type === ChannelType.PublicThread || message.channel.type === ChannelType.PrivateThread) {
            const thread = message.channel;

            // Start typing indicator
            const typingInterval = keepTyping(thread);

            try {
                // Fetch all messages in the thread
                const messages = await thread.messages.fetch({ limit: 100 });
                messages.forEach(msg => {
                    if (msg.author.id === client.user.id) {
                        console.log(`Model message: ${msg.content}`);
                    } else {
                        console.log(`User message: ${msg.content}`);
                    }
                });
                history = messages.map(msg => ({
                    "role": msg.author.id === client.user.id ? "model" : "user",
                    "text": msg.content
                }));

                history.push({ "role": "user", "text": message.content })

                // Prepare data for agent answer API
                const agentData = {
                    agent_name: agentDetails.name,
                    agent_version: agentDetails.version,
                    chat_history: history,
                    included_references: [],
                    private: agentDetails.testing,
                };

                // Get answer from agent
                const response = await fetch("https://api.commanddash.dev/v2/ai/agent/answer", {
                    method: "POST",
                    body: JSON.stringify(agentData),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                const modelResponse = await response.json();
                console.log(modelResponse)

                // Split the response into chunks and send each chunk
                const responseChunks = splitMessage(modelResponse.response);
                for (const chunk of responseChunks) {
                    await thread.send(chunk);
                }
            } catch (error) {
                console.error('Error getting answer from agent:', error);
                thread.send('Sorry, I could not get an answer from the agent.');
            } finally {
                stopTyping(typingInterval); // Stop typing indicator
            }
        } else {
            // Create a new thread if the message is not in a thread
            const thread = await message.startThread({
                name: `Thread for ${message.author.username}`,
                autoArchiveDuration: 60,
            });

            // Start typing indicator
            const typingInterval = keepTyping(thread);

            try {
                // Prepare data for agent answer API
                const agentData = {
                    agent_name: agentDetails.name,
                    agent_version: agentDetails.version,
                    chat_history: [{ "role": "user", "text": message.content }],
                    included_references: [],
                    private: agentDetails.testing,
                };

                // Get answer from agent
                const response = await fetch("https://api.commanddash.dev/v2/ai/agent/answer", {
                    method: "POST",
                    body: JSON.stringify(agentData),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
                const modelResponse = await response.json();
                console.log(modelResponse)

                // Split the response into chunks and send each chunk
                const responseChunks = splitMessage(modelResponse.response);
                for (const chunk of responseChunks) {
                    await thread.send(chunk);
                }
            } catch (error) {
                console.error('Error getting answer from agent:', error);
                thread.send('Sorry, I could not get an answer from the agent.');
            } finally {
                stopTyping(typingInterval); // Stop typing indicator
            }
        }
    }
});

// Handle errors to prevent the bot from crashing
client.on('error', error => {
    console.error('An error occurred:', error);
});

client.login(process.env.DISCORD_TOKEN);