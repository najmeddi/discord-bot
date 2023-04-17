const Reminder = require("../../models/reminder");
const { embed } = require("../../discord-templates/embed.js");
const { button, menu } = require("../../discord-templates/row.js");
const { getMemberTimeZone } = require("../../discord-templates/actions");

const { inlineCode, memberNicknameMention } = require("@discordjs/builders");

module.exports = {
  name: "schedule",
  description: `View schedule for the private channel(s)`,
  args: false,
  category: "Private",
  channels: ["970915093661250340", "95643973029719682"],
  imageURL:
    "https://cdn.discordapp.com/attachments/885611257074438154/984937678082568243/schedule_thumbnail.png",
  async execute(message, args, client) {
    await Reminder.find({ guildId: message.guildId })
      .then(async (result) => {
        message.channel.send(await this.displaySchedule(message, result));
      })
      .catch((err) => {
        return message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
      });
  },
  displaySchedule: async (message, result) => {
    imageURL = module.exports.imageURL;
    const remindersProperties = await module.exports.getRemindersProperties(
      result,
      message
    );
    const findRemindersEmbed = remindersProperties.findRemindersEmbed;
    const options = remindersProperties.options;
    if (remindersProperties.noResults)
      return {
        content: memberNicknameMention(message.author.id),
        embeds: [findRemindersEmbed],
        components: [],
      };

    const removeReminders = (i) => {
      i.update({
        components: [
          menu.createManySelect(
            message,
            "Select reminders to remove",
            options,
            (i) => {
              Reminder.deleteMany({ _id: { $in: i.values } })
                .then((result) => {
                  i.update({
                    embeds: [
                      embed.createThumbnailEmbed(
                        "Reminder Removed from Schedule",
                        `Removed ${inlineCode(
                          result.deletedCount
                        )} reminders(s)`,
                        imageURL
                      ),
                    ],
                    components: [module.exports.getViewScheduleBtn(message)],
                  });
                })
                .catch((err) => {
                  return message.channel.send({
                    embeds: [embed.createErrorEmbed(err)],
                  });
                });
            }
          ),
        ],
      });
    };
    return {
      content: memberNicknameMention(message.author.id),
      embeds: [findRemindersEmbed],
      components: [
        button.createSimpleButton(
          message,
          "Remove Reminders",
          removeReminders,
          "❌",
          "SECONDARY"
        ),
      ],
    };
  },
  getRemindersProperties: async (result, message, authorOnly = true) => {
    // Check if there is anything scheduled
    if (result.length < 1)
      return {
        findRemindersEmbed: embed.createThumbnailEmbed(
          "Nothing Scheduled",
          `There isn't anything scheduled.\nUse ${inlineCode(
            "$help"
          )} to see how to make one.`,
          module.exports.imageURL
        ),
        noResults: true,
      };

    const dateOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      timeZone: "UTC",
    };
    const timezone = await getMemberTimeZone(message);

    const fields = result.map((reminder) => {
      let reminderDate = new Date(reminder.reminderDate.getTime());
      reminderDate.setHours(
        reminderDate.getHours() + parseInt(timezone.substring(3, 6))
      );
      return {
        name: reminder.text,
        value: `Scheduled for ${inlineCode(
          reminderDate.toLocaleString("en-US", dateOptions) + ` (${timezone})`
        )} by ${memberNicknameMention(reminder.author)}`,
      };
    });

    // Grab all reminders where the author is the same as the user who requested this command
    const userReminders = authorOnly
      ? result.filter((reminder) => reminder.author == message.author)
      : result;
    const options = userReminders.map((reminder) => {
      return {
        label: reminder.text,
        value: `${reminder._id}`,
      };
    });

    const findRemindersEmbed = embed.createFieldsEmbed(
      "Schedule",
      "Here is the list of scheduled reminders",
      fields,
      module.exports.imageURL
    );
    return { findRemindersEmbed, options };
  },
  getViewScheduleBtn: (message) => {
    const viewScheduleBtn = button.createSimpleButton(
      message,
      "View Schedule",
      async (i) => {
        await Reminder.find({ guildId: message.guildId })
          .then(async (result) => {
            i.update(await module.exports.displaySchedule(message, result));
          })
          .catch((err) => {
            return message.channel.send({
              embeds: [embed.createErrorEmbed(err)],
            });
          });
      },
      "📅"
    );
    return viewScheduleBtn;
  },
};
