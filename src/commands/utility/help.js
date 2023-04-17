const { underscore, memberNicknameMention } = require("@discordjs/builders");

const { embed } = require("../../discord-templates/embed.js");
const { menu } = require("../../discord-templates/row.js");

module.exports = {
  name: "help",
  description: "Displays all the commands for the bot",
  category: "Utility",
  execute(message, args, client) {
    const imageURL =
      "https://cdn.discordapp.com/attachments/885611257074438154/978484958849024030/help_logo.png";

    // Array of categories to hide/show depending on the channel help is issued
    const blacklist_categories = ["Private"];

    // Make a category array that holds categories of each command
    var categories = new Array();
    // Make a list of options for selecting which category to select
    var options = [];
    client.commands.forEach((cmd) => {
      // Check if this command is under the blacklist categories
      if (!cmd.channels?.includes(message.channelId)) {
        if (blacklist_categories.includes(cmd.category)) return;
      }

      // Placeholder string if there exists an alias for the command
      var alias_note = "";
      // Check if there are aliases for the command
      if (cmd.aliases) alias_note = `or \`${client.prefix}${cmd.aliases}\``;

      // This variable stores the text object for a single command
      var cmd_str_arr = [];
      // This variable is the same as above but shorter for the main help embed
      var cmd_str_short;
      // Since the play command uses aliases as commands the format for this will be uniquely constructed
      if (cmd.name == "play") {
        cmd_str_arr = [
          {
            name: `\`${client.prefix}${cmd.name}\` or \`${client.prefix}${cmd.aliases[0]}\` \`${cmd.usage}\``,
            value: cmd.description,
          },
          {
            name: `\`${client.prefix}${cmd.aliases[1]}\``,
            value: `Skip the current song track playing in the voice channel`,
          },
          {
            name: `\`${client.prefix}${cmd.aliases[2]}\` or \`${client.prefix}${cmd.aliases[3]}\``,
            value: `Stop playing in the voice channel and remove the song track queue`,
          },
          {
            name: `\`${client.prefix}${cmd.aliases[4]}\` or \`${client.prefix}${cmd.aliases[5]}\``,
            value: `View your playlist of saved YouTube links (max. ${25}). You can also add or remove tracks, as well as, queue tracks or queue the entire playlist.`,
          },
          {
            name: `\`${client.prefix}${cmd.aliases[6]}\` or \`${client.prefix}${cmd.aliases[7]}\``,
            value: `View the current track queue and remove tracks from the queue`,
          },
        ];
        cmd_str_short = `-\`${cmd.name}\`, or \`${cmd.aliases[0]}\`\n-\`${cmd.aliases[1]}\`\n-\`${cmd.aliases[2]}\`, or \`${cmd.aliases[3]}\`\n-\`${cmd.aliases[4]}\`, or \`${cmd.aliases[5]}\`\n-\`${cmd.aliases[6]}\`, or \`${cmd.aliases[7]}\``;
        // Check if the usage needs to be added (i.e. parameters) to the text
      } else if (cmd.name == "alarm") {
        cmd_str_arr = [
          {
            name: `\`${client.prefix}${cmd.name}\` or \`${client.prefix}${cmd.aliases[0]}\` \`${cmd.usage}\``,
            value: cmd.description,
          },
          {
            name: `\`${client.prefix}${cmd.aliases[1]}\` or \`${client.prefix}${cmd.aliases[2]}\``,
            value: `See the remaining time left on all ongoing alarms`,
          },
        ];
        cmd_str_short = `-\`${cmd.name}\`, or \`${cmd.aliases[0]}\`\n-\`${cmd.aliases[1]}\`, or \`${cmd.aliases[2]}\``;
      } else if (cmd.usage) {
        cmd_str_arr = [
          {
            name: `\`${client.prefix}${cmd.name}\` ${alias_note} \`${cmd.usage}\``,
            value: cmd.description,
          },
        ];
        cmd_str_short = `-\`${cmd.name}\` ${alias_note}`;
      } else {
        cmd_str_arr = [
          {
            name: `\`${client.prefix}${cmd.name}\` ${alias_note}`,
            value: cmd.description,
          },
        ];
        cmd_str_short = `-\`${cmd.name}\` ${alias_note}`;
      }
      // Make a new category if there isn't one and add the command to it
      if (cmd.category) {
        var categoryIndex = categories.findIndex(
          (category) => category.key === cmd.category
        );
        let categoryNotFound = categoryIndex == -1;

        // If no category found then make one. Later on, others with the same key, category match will be grouped together
        if (categoryNotFound) {
          categories.push({
            name: underscore(`${categoryNameBeautify(cmd.category)}`),
            value: cmd_str_short,
            info: cmd_str_arr,
            key: cmd.category,
            inline: true,
          });

          // Create and append the category as an option in the select menu
          options.push({ label: `${cmd.category}`, value: `${cmd.category}` });
        } else {
          // Concat the text of a single command with the rest of the commands in a particular category
          categories[categoryIndex].value += `\n${cmd_str_short}`;
          categories[categoryIndex].info =
            categories[categoryIndex].info.concat(cmd_str_arr);
        }
      }
    });

    // Construct the embed using the text of categories and their commands created above
    const helpEmbed = embed.createBaseEmbed({
      title: "Bot Commands",
      thumbnail: imageURL,
      description: "List of commands that the bot can execute",
      fields: categories,
    });

    const getCategoryHelp = (i, client) => {
      let categoryEmbed = [];
      // Get the help category selected
      i.values.forEach((value) => {
        // Get the category with the given value
        const category = categories.find(
          (categories) => categories.key === value
        );
        categoryEmbed = getCmdHelpEmbed(category, client);
      });
      i.update({ embeds: [categoryEmbed], components: [] });
    };

    // Construct the select menu for categories to select
    const row = menu.createSimpleSelect(
      message,
      "Select a category for help",
      options,
      (i) => getCategoryHelp(i, client)
    );
    message.channel.send({
      content: memberNicknameMention(message.author.id),
      embeds: [helpEmbed],
      components: [row],
    });
  },
};

function categoryNameBeautify(categoryStr) {
  var beautifiedStr = categoryStr;
  if (categoryStr == "Game Search") {
    beautifiedStr = `${categoryStr} 🎮`;
  } else if (categoryStr == "Random Draw") {
    beautifiedStr = `${categoryStr} 🎲`;
  } else if (categoryStr == "Utility") {
    beautifiedStr = `${categoryStr}🛠`;
  } else if (categoryStr == "Voice Chat") {
    beautifiedStr = `${categoryStr} 🔊`;
  } else if (categoryStr == "Jobs") {
    beautifiedStr = `${categoryStr} 💼`;
  } else if (categoryStr == "Private") {
    beautifiedStr = `${categoryStr} 🎙️`;
  }

  return beautifiedStr;
}

function getCmdHelpEmbed(category, client) {
  const EMBED_COLOR = 16711680;
  const embed = {
    color: EMBED_COLOR,
    thumbnail: {
      url: "https://cdn.discordapp.com/attachments/885611257074438154/978484958849024030/help_logo.png",
    },
    title: category.name,
    fields: category.info,
  };
  return embed;
}
