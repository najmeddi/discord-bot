const Game = require('../../models/game');

const { 
    memberNicknameMention, 
    inlineCode
} = require('@discordjs/builders');

const {embed} = require('../../discord-templates/embed.js');
const {button} = require('../../discord-templates/row.js');
const {imageURL} = require('./findGames');

module.exports = {
	name: 'add-game',
	description: 'Adds a game to the list so everyone can see',
    args: true,
    usage: '[game title]',
    category: 'Game Search',
	async execute(message, args, client) {
        // Convert the args to strings to get game title
        const gameTitle = args.join(' ');

        // Create new instance use game model
        const game = new Game({
            title: gameTitle,
            guildId: message.guildId
        });

        // Check if the game title already exists by finding it
        Game.find({title: gameTitle})
            .then((result) => {
                if(result.length > 0){
                    const duplicateGameEmbed = embed.createThumbnailEmbed('Duplicate Game Title', "This game title or something similar to it has already been added to the list", imageURL);
                    message.channel.send({content: memberNicknameMention(message.author.id), embeds: [duplicateGameEmbed] });
                } else {
                    // Save data in new document in database
                    game.save().then((result) => {
                        // Filters the type of interaction that will be collected
                        const mfilter = (i, id) => {
                            // Make sure that filter only interactions involving adding a member to a game
                            if(i.customId == id){
                                return true;
                            }
                            return false;
                        };

                        // Filters for removing the game
                        const filterRemoveGame = (i, id) => {
                            // Make sure that filter only interactions involving the author wanting to remove a game
                            if(i.customId == id && i.user.id === message.author.id){
                                return true;
                            } 
                            // Otherwise check that the button pressed was to remove a game
                            if (i.customId == id){
                                i.channel.send({
                                    embeds: [embed.createSimpleEmbed(`${i.user} you can't remove the game because you are not the one who added it.`)]
                                });
                            }
                            return false;
                        };
                        
                        // Filter and count the non-bot members of this guild
                        const actualMembers = message.guild.members.cache.filter(member => !member.user.bot);
                       
                        const addMember = (i, id, collector) => {
                            // Add any member that clicks the button to the game that has been added
                            // This is the same code in the add-me command
                            Game.findOne({title: gameTitle, guildId: message.guildId})
                            .then((result) => {
                                if(result != null){
                                    // Get the nickname of the member that clicked the button
                                    const memberNickname = memberNicknameMention(i.user.id);
                                    if(!hasDuplicates(result.players, i.user.id)){
                                        result.players.push(i.user);
                                        result.save();
                                        const addMeEmbed = embed.createThumbnailEmbed("Member Joined a Game", `${memberNickname} is added under the game ${inlineCode(result.title)}`, imageURL);
                                        message.channel.send({content: memberNickname, embeds: [addMeEmbed]});
                                        // Check the total number of interactions. Update the embed if total interactions is the total
                                        // number of guild members currently
                                        if(collector.total < actualMembers.size){
                                            i.deferUpdate();
                                        } else {
                                            // If all players signed up to the game, update the original message to remove the buttons
                                            // except the remove button
                                            const updatedRow = button.createFilterButton(message, 'Remove game', filterRemoveGame, removeGame, '✖️');
                                            i.update({components: [updatedRow]});
                                        }
                                    } else {
                                        i.deferUpdate();
                                        message.channel.send({embeds: [embed.createSimpleEmbed(`${memberNickname} you are already added to this game's list of players`)]});
                                    }
                                } else {
                                    i.deferUpdate();
                                    message.channel.send({embeds: [embed.createSimpleEmbed("This game title does not exist. Note that the game title is case sensitive. Try `$add-game <game title>`")]});
                                }
                            })
                            .catch(err => {
                                // Catch and display any kind of error
                                message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                            }); // This the end of the same code in the add-me command
                        };

                        const removeGame = (i, id, collector) =>{
                            // Find the game title, delete it if it exists, and remove the original
                            // add game reply
                            Game.deleteOne({title: gameTitle, guildId: message.guildId})
                                .then(result => {
                                    if(result.deletedCount > 0){
                                        const gameRemovedEmbed = embed.createThumbnailEmbed("Game removed", `${inlineCode(gameTitle)} has been removed`, imageURL);
                                        i.update({content: `${i.user}`,embeds: [gameRemovedEmbed], components: []});
                                    } else {
                                        i.update({embeds: [embed.createSimpleEmbed(`${i.user} this game title could not be found.`)], components: []});
                                    }
                                })
                                .catch(err => {
                                    // Catch and display any kind of error
                                    message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                                });
                        };

                        // Create the embed used to display that the game has been added to the database    
                        const addGameEmbed = embed.createThumbnailEmbed("New Game Added", `${message.author} has added the game ${inlineCode(gameTitle)}`, imageURL);
                        // Create the row of buttons that the user will interact with
                        const row = button.createButtons(
                            {
                                message,
                                labels: ['Add me', 'Remove game'],
                                customFilters: [mfilter, filterRemoveGame],
                                filterOptions: [
                                    {maxUsers: actualMembers},
                                    {max: 1}
                                ],
                                styles: ['SUCCESS', 'DANGER'],
                                emojis: ['➕', '✖️'],
                                needsCollector: true,
                                funcs: [addMember, removeGame]
                            }
                        );

                        message.channel.send({embeds: [addGameEmbed], components: [row]})

                    }).catch(err => {
                        // Catch and display any kind of error
                        message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                    });
                }
            })
            .catch(err => {
                // Catch and display any kind of error
                message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
	},
};

function hasDuplicates(arr, id) {
    for(var i = 0; i < arr.length; i ++){
        if(arr[i].id == id){
            return true
        }
    }
    return false;
}