const Game = require('../../models/game');

const {embed} = require('../../discord-templates/embed.js');

const {
    imageURL,
    viewGamesRow
} = require('./findGames');

const { 
    inlineCode,
    memberNicknameMention
} = require('@discordjs/builders');

module.exports = {
	name: 'remove-me',
	description: 'Removes you from a list of Discord members playing a given game',
    args: true,
    usage: '[game title]',
    category: 'Game Search',
	execute(message, args, client) {
        // Convert the args to strings to get game title
        let gameTitle = args.join(' ');

        // Check if the game title already exists by finding it
        Game.findOne({title: gameTitle, guildId: message.guildId})
            .then((result) => {
                if(result != null){
                    var playerIndex = findPlayerIndex(result.players, message.author.id);
                    let title;
                    let description;
                    if(playerIndex != -1){
                        result.players.splice(playerIndex, 1)
                        result.save();
                        title = "Removed From Game";
                        description = `${message.author} is removed from the game ${inlineCode(result.title)}`;
                    } else {
                        title = "Unable Remove From Game";
                        description = "You cannot be removed from this game because you are not added as a member of this game.";
                    }
                    const removeMeEmbed = embed.createThumbnailEmbed(title, description, imageURL);
                    const row = viewGamesRow(message);
                    message.channel.send({content: memberNicknameMention(message.author.id), embeds: [removeMeEmbed], components: [row]});
                } else {
                    message.channel.send(
                        {
                            content: memberNicknameMention(message.author.id),
                            embeds: [embed.createThumbnailEmbed('Game Title Not Found', "This game title does not exist. Note that the game title is case sensitive. Try `$add-game <game title>`", imageURL)],
                            components: [viewGamesRow(message)]
                        }
                    );
                }
            })
            .catch(err => {
                // Catch and display any kind of error
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
	},
};

function findPlayerIndex(arr, id) {
    for(var i = 0; i < arr.length; i ++){
        if(arr[i].id == id){
            return i;
        }
    }
    return -1;
}