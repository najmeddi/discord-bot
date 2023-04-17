const Game = require('../../models/game');

const { 
    bold
} = require('@discordjs/builders');

const {adminRemoveItems} = require('../../discord-templates/actions')
const {getGamesProperties, imageURL} = require('./findGames');

module.exports = {
	name: 'admin-remove-games',
    aliases: ["arg"],
	description: `${bold('For Admin only')}.Removes a game or game(s) from the list of members' games`,
    args: false,
    category: 'Game Search',
	async execute(message, args, client) {
        await adminRemoveItems(Game, message, getGamesProperties, 'game', this.name, imageURL);
    },
}