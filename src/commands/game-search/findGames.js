const Game = require("../../models/game");

const {
  inlineCode,
  memberNicknameMention,
  underscore,
} = require("@discordjs/builders");

const { embed } = require("../../discord-templates/embed.js");
const { button, menu } = require("../../discord-templates/row.js");

module.exports = {
  name: "find-games",
  description: "Gets a list of games members have added",
  args: false,
  category: "Game Search",
  imageURL:
    "https://cdn.discordapp.com/attachments/885611257074438154/890440818685542410/games.png",
  async execute(message, args, client) {
    await Game.find({ guildId: message.guildId })
      .then((result) => {
        message.channel.send(module.exports.displayGames(message, result));
      })
      .catch((err) => {
        return message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
      });
  },
  displayGames: (message, result) => {
    // Helper functions to create fields for embed and options for interactions
    const imageURL = module.exports.imageURL;
    const gamesProperties = module.exports.getGamesProperties(result);
    const findGamesEmbed = gamesProperties.findGamesEmbed;
    const options = gamesProperties.options;
    if (gamesProperties.noResults)
      return { embeds: [findGamesEmbed], components: [] };

    // Save data in new document in database
    const addMemberToGames = async (i) => {
      // const gameTitles = i.values.map(value => valueToGameTitle(value));
      // Convert the string of the option values to strings of the game title
      await Game.find({ _id: { $in: i.values }, guildId: message.guildId })
        .then((result) => {
          const addMe = require("./addMe");
          var gamesAdded = [];
          result.forEach((game) => {
            const addObj = addMe.addGameMember(message, game);
            if (addObj.gameAdded) gamesAdded.push(addObj.gameAdded);
          });
          let addedGameEmbed;
          if (gamesAdded.length > 0) {
            const desc = `You have been added to ${inlineCode(
              gamesAdded.length
            )} game(s)\nJoined games: ${inlineCode(gamesAdded.join())}`;
            addedGameEmbed = embed.createThumbnailEmbed(
              "Added to Games",
              desc,
              imageURL
            );
          } else
            addedGameEmbed = embed.createThumbnailEmbed(
              "Not Added Games",
              "You were not added to any games. You may already be a member of them",
              imageURL
            );
          const components =
            result && result.length > 0
              ? [module.exports.viewGamesRow(message)]
              : [];
          i.update({ embeds: [addedGameEmbed], components: components });
        })
        .catch((err) => {
          i.update({ embeds: [embed.createErrorEmbed(err)], components: [] });
        });
    };

    // Reply with embed and components
    const row = menu.createManySelect(
      message,
      "Select games to be added under",
      options,
      addMemberToGames
    );
    return {
      content: memberNicknameMention(message.author.id),
      embeds: [findGamesEmbed],
      components: [row],
    };
  },
  getGamesProperties: (result) => {
    if (result.length < 1) {
      return {
        findGamesEmbed: embed.createSimpleEmbed(
          `There are no games posted on this server.\nUse ${inlineCode(
            "$help"
          )} to see how to make one.`
        ),
        noResults: true,
      };
    }

    // Games to be displayed in the fields of embed
    const gamesField = result.map((game) => {
      const players = getPlayerNames(game.players);
      return {
        name: `${underscore(game.title)}`,
        value:
          players.length > 0
            ? `Members playing this game [${players.length}]:\n${players}`
            : `No members currently added to this game`,
      };
    });

    // Games to be displayed in the options of the select menu
    const options = result.map((game) => {
      return {
        label: `${game.title}`,
        value: `${game._id}`,
      };
    });

    const findGamesEmbed = embed.createFieldsEmbed(
      "Member's Games",
      "List of games members have in this server",
      gamesField,
      module.exports.imageURL
    );
    return { findGamesEmbed, options };
  },
  viewGamesRow: (message) => {
    const viewGames = async (i) => {
      await Game.find({ guildId: message.guildId })
        .then((result) => {
          i.update(module.exports.displayGames(message, result));
        })
        .catch((err) => {
          i.update({ embeds: [embed.createErrorEmbed(err)] });
        });
    };
    const row = button.createSimpleButton(
      message,
      "View Games",
      viewGames,
      "🎮"
    );
    return row;
  },
};

function getPlayerNames(playerList) {
  var players = new Array();
  playerList.forEach((player) => {
    players.push(`<@${player.id}>`);
  });
  return players;
}
