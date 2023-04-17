const Reminder = require("../../models/reminder");

const { bold } = require("@discordjs/builders");

const { adminRemoveItems } = require("../../discord-templates/actions");
const { getRemindersProperties, imageURL } = require("./schedule");
const { embed } = require("../../discord-templates/embed.js");

module.exports = {
  name: "admin-remove-reminders",
  aliases: ["arr"],
  description: `${bold(
    "For Admin only"
  )}.Removes reminder(s) from the servers list of member made reminders`,
  args: false,
  category: "Private",
  channels: ["970915093661250340", "95643973029719682"],
  async execute(message, args, client) {
    await adminRemoveItems(
      Reminder,
      message,
      async (result) => await getRemindersProperties(result, message, false),
      "reminder",
      this.name,
      imageURL
    );
  },
};
