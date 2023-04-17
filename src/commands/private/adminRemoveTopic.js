const Topic = require("../../models/topic");

const { bold } = require("@discordjs/builders");

const { adminRemoveItems } = require("../../discord-templates/actions");
const { getTopicsProperties, imageURL } = require("./topics");

const { embed } = require("../../discord-templates/embed.js");

module.exports = {
  name: "admin-remove-topics",
  aliases: ["art"],
  description: `${bold(
    "For Admin only"
  )}.Removes topic(s) from the servers list of member made topics`,
  args: false,
  category: "Private",
  channels: ["970915093661250340", "95643973029719682"],
  async execute(message, args, client) {
    await adminRemoveItems(
      Topic,
      message,
      async (result) => await getTopicsProperties(result, message, false),
      "topic",
      this.name,
      imageURL
    );
  },
};
