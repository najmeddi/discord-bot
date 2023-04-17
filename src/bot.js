require('dotenv').config();

const { Client, Collection, Intents } = require('discord.js');

const fs = require('fs');

// Instance of client class (i.e. could also be called 'bot')
const client = new Client({
    // Intents are new as of version discord.js v13
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.GUILD_PRESENCES
    ]
});
// Prefix symbol to recognize commands to the bot 
client.prefix = "$";

// Instance of available bot commands
client.commands = new Collection();
// Create a collection of aliases for commands
client.aliases = new Collection();
// Initialize empty collection for cooldowns for later use
client.cooldowns = new Collection();

const commandFolders = fs.readdirSync('./src/commands');
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));

// Loops through each command category
for (const folder of commandFolders){
    
    const commandFiles = fs.readdirSync(`./src/commands/${folder}`).filter(file => file.endsWith('.js'));
    
    // Loop through each command in the category
    for (const file of commandFiles){
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);

        // Bind the alias to the command
        if (command.aliases){
            command.aliases.forEach(alias => {
                client.aliases.set(alias, command);
            });
        }

    }
}

for (const file of eventFiles){
    const event = require(`./events/${file}`);
    if(event.once){
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Make sure to add your private bot application token here
const PRIVATE_DISCORD_BOT_TOKEN = "<Add bot token here>";
client.login(PRIVATE_DISCORD_BOT_TOKEN);