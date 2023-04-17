const Game = require('../../models/game');

const {embed} = require('../../discord-templates/embed.js');

const {
    imageURL,
    viewGamesRow
} = require('./findGames');

const { 
    memberNicknameMention, 
    inlineCode
} = require('@discordjs/builders');

module.exports = {
	name: 'add-me',
	description: 'Adds you to a list of Discord members playing a given game',
    args: true,
    usage: '[game title]',
    category: 'Game Search',
    async execute(message, args, client) {
        // Convert the args to strings to get game title
        var gameTitle = args.join(' ');
        await Game.findOne({title: gameTitle, guildId: message.guildId})
            .then(result => {
                const row = viewGamesRow(message);
                let replyObj = module.exports.addGameMember(message, result);
                replyObj.components = [row];
                message.channel.send(replyObj);
            })
            .catch(err => {
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            })
	},
    addGameMember: (message, result) => {
        let gameAdded = null;
        if(!result || result.length < 1) return {
            content: memberNicknameMention(message.author.id),
            embeds: [embed.createThumbnailEmbed('Game Title Not Found', "This game title does not exist. Note that the game title is case sensitive. Try `$add-game <game title>`", imageURL)], 
            gameAdded
        };
        if(!hasDuplicates(result.players, message.author.id)){
            result.players.push(message.author);
            result.save();
            const addMeEmbed = embed.createThumbnailEmbed("You've Joined a Game", `${message.author} is added under ${inlineCode(result.title)}`, imageURL);
            gameAdded = result.title;
            return {content: memberNicknameMention(message.author.id), embeds: [addMeEmbed], gameAdded};
        }
        return {
            content: memberNicknameMention(message.author.id),
            embeds: [embed.createThumbnailEmbed('Already a Member', "You are already added to this game's list of players", imageURL)],
            gameAdded
        };               
    }
};

function hasDuplicates(arr, id) {
    for(var i = 0; i < arr.length; i ++){
        if(arr[i].id == id){
            return true
        }
    }
    return false;
}