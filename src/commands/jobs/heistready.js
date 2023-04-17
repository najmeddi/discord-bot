const { memberNicknameMention, inlineCode } = require("@discordjs/builders");

const { displayJobDetails } = require("./customready");
const { embed } = require("../../discord-templates/embed.js");
const { menu } = require("../../discord-templates/row.js");

module.exports = {
  name: "heist-ready",
  description: "Let everyone know you have a GTA V heist ready",
  category: "Jobs",
  async execute(message, args, client) {
    const MONEY_IMG_URL =
      "https://cdn.discordapp.com/attachments/885611257074438154/890440257013710879/heistready.png";
    const heistTypes = {
      heists: {
        name: "Heists",
        details: [
          "The Fleeca Job",
          "The Prison Break",
          "The Humane Labs Raid",
          "Series A Funding",
          "The Pacific Standard",
        ],
      },
      doomsdayHeists: {
        name: "Doomsday Heists",
        details: [
          "The Data Breaches",
          "The Bogdan Problem",
          "The Doomsday Scenario",
        ],
      },
      diamondCasinoHeist: {
        name: "The Diamond Casino Heist",
        details: [
          "Silent & Sneaky Approach",
          "Aggressive Approach",
          "The Big Con Approach",
        ],
      },
      cayoPericoHeist: {
        name: "The Cayo Perico Heist",
        details: [
          "Sinsimito Tequila",
          "Ruby Necklace",
          "Bearer Bonds",
          "Madrazo Files",
          "Pink Diamond",
          "Panther Statue",
        ],
      },
    };

    const heistOptions = Object.keys(heistTypes).map((heist) => {
      return {
        label: heistTypes[heist].name,
        value: heistTypes[heist].name,
      };
    });

    const selectHeist = (interaction) => {
      let heistEmbedTitle = "No Heist Type Selected";
      let heistEmbedDescription =
        "There was not any heist type selected from the select menu";
      if (interaction.values.length > 0) {
        const heist = Object.values(heistTypes).find(
          (value) => value.name == interaction.values[0]
        );
        const jobDetails = heist.details.map(
          (detail) => `${heist.name} - ${detail}`
        );
        displayJobDetails(message, "heist", MONEY_IMG_URL, jobDetails);
        heistEmbedTitle = "Heist Type Selected";
        heistEmbedDescription = `You selected the heist type ${inlineCode(
          heist.name
        )}`;
      }

      interaction.update({
        embeds: [
          embed.createThumbnailEmbed(
            heistEmbedTitle,
            heistEmbedDescription,
            MONEY_IMG_URL
          ),
        ],
        components: [],
      });
    };

    const selectHeistEmbed = embed.createThumbnailEmbed(
      "Select a Heist",
      "Choose the type of heist you want to run from the select menu below",
      MONEY_IMG_URL
    );
    const row = menu.createSimpleSelect(
      message,
      "Select the heist type",
      heistOptions,
      selectHeist
    );

    message.channel.send({
      content: memberNicknameMention(message.author.id),
      embeds: [selectHeistEmbed],
      components: [row],
    });
  },
};
