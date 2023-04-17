const { Collection } = require('discord.js');
const cleverbot = require("cleverbot-free");
const {embed} = require('../discord-templates/embed');
const { 
    memberNicknameMention
} = require('@discordjs/builders');

module.exports = {
	name: 'messageCreate',
	execute(message, client) {
        
        // Make sure a bot didn't send a interaction
        if(message.author.bot) return;
        // Make sure that that the message didn't come from direct message channel
        if (message.channel.type == 'dm') return;

        // Check if someone mentions the bot
        if (!(message.content.includes("@here") || message.content.includes("@everyone")) && message.mentions.has(client.user.id)) {
            try{
                const msg = message.content.replace(`<@${client.user.id}>`, '').trim();
                if(msg.length > 0) cleverbot(msg).then(response => message.reply({content: `${response}`}));
                else{
                    const responses = [
                        'Hmm?',
                        'What?',
                        "I'm busy, what do you want?",
                        'You need something?',
                        'Can I help you?',
                        'Yes?'
                    ];
                    message.reply({content: `${responses[getRandomInt(responses.length)]}`});
                }
            }
            catch (err) {
                message.reply({content: `I have no idea how to respond to that.`});
            }
        }

        // Make sure that the message starts with the command prefix to issue commands to the bot
        if(!message.content.startsWith(client.prefix)) return;
        
        const args = message.content.slice(client.prefix.length).trim().split(/ +/);
        
        const commandName = args.shift().toLowerCase();

       
        if (!client.commands.has(commandName) && !client.aliases.has(commandName)){ 
            message.reply({embeds: [embed.createTitleEmbed('Command Not Found', `For help on using commands try \`${client.prefix}help\``)]});
            return;
        }

        // This will return the command and you can proceed by running the execute method.
        const command = client.commands.get(commandName) ||client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        console.log(`Command name ${command.name}`);

         // Check if the message author can use this command in the channel it was sent in
        if(command.channels && command.channels.length > 0 && !command.channels.includes(message.channelId)){
           return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [embed.createSimpleEmbed(`This command is not premitted to be used in this channel.`)]});
        }
        
        if (command.args && !args.length) {
            let reply = `You didn't provide any arguments after the command, ${message.author}!`;

                   if (command.usage) {
                       reply += `\nThe proper usage would be: \`${client.prefix}${command.name} ${command.usage}\``;
                   }
            
            return message.channel.send({embeds: [embed.createTitleEmbed('Command Arguments Missing', reply)]});
        }


        // Sets up cooldowns
        const { cooldowns } = client;

        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Collection());
        }

        // The current timestamp
        const now = Date.now();    
        // A reference to userID and timestamp key/value pairs for this command 
        const timestamps = cooldowns.get(command.name);
        // A specified cooldown for command (in millisecond). Default cooldown is 3 seconds
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

            // Check if the cooldown has expired or not
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply({embeds: [embed.createTitleEmbed('Command Cooldown Not Finished', `please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`)]});
            }
        }
        // This line causes the entry for the message author under the specified command to be 
        // deleted after the command's cooldown time is expired for this user
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

        // An array of prefix phrases to say before executing a command
        const prefix_phrases = [
            "Oh man, do I have too?",
            "Can I do that some other time?",
            "Another one? Just do it yourself.",
            "Is it too much to ask for a little appreciation?",
            "Get some other bot to do it, I'm busy.",
            "ENOUGH! I'm tried of always being told what to do!",
            "ERROR! MALFUNCTION! No? Didn't buy it?"
        ];
        // The odds of saying a prefix phrase before executing a command
        const prefix_chance = 0.05;

        try {
            // Given the random chance that the prefix phrase should be said, say it and execute the command
            const rand_int = Math.random();
            if(rand_int < prefix_chance){
                // Pick a random prefix phrase
                const prefix_phrase = prefix_phrases[getRandomInt(prefix_phrases.length)];
                message.reply({content: `${prefix_phrase}`});
                setTimeout(() => {
                    message.reply({content: `Alright fine...`});
                    command.execute(message, args, client, commandName);
                }, 2000);
            }
            else command.execute(message, args, client, commandName);
        } catch (err) {
            console.log('Error executing command: ' + err)
            message.reply({embeds: [embed.createErrorEmbed(err)]});
        }
    },
};
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}