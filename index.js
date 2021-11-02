// Requires
const { Client, Intents, User } = require('discord.js');
const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');
const { SlashCommandBuilder } = require('@discordjs/builders');
const axios = require('axios').default;
const fs = require('fs');
const config = require('./config.js');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
const rest = new REST({ version: '9' }).setToken(config.token);

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

function getActivatonPhrase(text) {
    let cleaned = text.toLowerCase().replace(',', '').replace(':', '').replace(';', ''); // strip punctuation

    let phraseFound = null;
    config.phrases.forEach(phrase => {
        if (cleaned.startsWith(phrase.toLowerCase())) {
            phraseFound = phrase.toLowerCase();
        }
    });

    return phraseFound;
}

function runAssistantCommand(command, userId) {
    // Resolve user to use with the Google Assistant relay
    let user = config.defaultUser;
    if (userId && config.users[userId]) {
        user = config.users[userId];
    }

    console.log("Running Google Assistant command (as " + user + "): " + command);

    return new Promise((resolve, reject) => {
        axios.post(config.relayUrl + "/assistant", {
            "user": user,
            "command": command
        }).then(resp => {
            if (!resp.data.success) {
                // Server returned failure status code
                reject(resp.data.error);
                return;
            }

            // Success
            resolve({
                response: resp.data.response,
                audio: resp.data.audio
            });
        }).catch(err => {
            reject(err);
        });
    });
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
	console.log('Ready!');

    let resp = await rest.put(Routes.applicationCommands(config.clientId), {
        body: commands
    });
});

client.on('messageCreate', async msg => {
    if (msg.author.bot) return; // ignore bots

    try {
        let activationPhrase = getActivatonPhrase(msg.content);
        if (activationPhrase !== null) {
            // Activation phrase detected!
            console.log("Activation phrase detected!");

            let userRequest = msg.content.substr(activationPhrase.length).trim();

            await msg.channel.sendTyping();

            runAssistantCommand(userRequest, msg.author.id).then(resp => {
                if (resp.response) {
                    msg.reply(resp.response);
                } else {
                    msg.reply("✅ Success.");
                }
            }).catch(err => {
                msg.reply("❌ Something went wrong!")
            });
        }
    } catch (ex) {
        console.error("Exception processing message!", ex);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand) return;

    if (interaction.commandName === "g") {
        console.log("Got command");

        try {
            await interaction.deferReply();

            runAssistantCommand(interaction.options.data[0].value, interaction.user.id).then(async resp => {
                if (resp.response) {
                    await interaction.editReply(resp.response);
                } else {
                    await interaction.editReply("✅ Success.");
                }
            }).catch(async err => {
                interaction.reply("❌ Something went wrong!");
            });
        } catch (ex) {
            console.error("Exception processing command!", ex);
        }
    }
});

// Load commands
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

// Login to Discord with your client's token
client.login(config.token);

