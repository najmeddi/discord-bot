const Topic = require("../../models/topic");
const Reminder = require("../../models/reminder");
const { embed } = require("../../discord-templates/embed.js");
const { button, menu, modal } = require("../../discord-templates/row.js");
const { getMemberTimeZone } = require("../../discord-templates/actions");
const { inlineCode, memberNicknameMention } = require("@discordjs/builders");

const {
  saveReminder,
  hasDatePassed,
  checkDateFormat,
} = require("./addReminder");

module.exports = {
  name: "topics",
  description: `View topics for the private channel(s)`,
  args: false,
  category: "Private",
  channels: ["970915093661250340", "95643973029719682"],
  imageURL:
    "https://cdn.discordapp.com/attachments/885611257074438154/984953773346652220/topic_thumbnail.png",
  async execute(message, args, client) {
    await Topic.find({ guildId: message.guildId })
      .then(async (result) => {
        message.channel.send(await this.displayTopics(message, result));
      })
      .catch((err) => {
        return message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
      });
  },
  displayTopics: async (message, result) => {
    const imageURL = module.exports.imageURL;
    const topicsProperties = await module.exports.getTopicsProperties(
      result,
      message
    );
    const findTopicsEmbed = topicsProperties.findTopicsEmbed;
    const options = topicsProperties.options;
    if (topicsProperties.noResults)
      return {
        content: memberNicknameMention(message.author.id),
        embeds: [findTopicsEmbed],
        components: [],
      };

    // Function that schedules topics by selecting them from a select
    const schedule_topic = (i) => {
      i.update({
        components: [
          menu.createManySelect(message, "Select your topics", options, (i) => {
            // Add selected topics to the schedule
            Topic.find({ _id: { $in: i.values } })
              .then((result) => {
                result.forEach((t) => {
                  Reminder.findOne({
                    text: t.topicDescription,
                    guildId: message.guildId,
                  })
                    .then((r) => {
                      // If this topic is not scheduled then the result array should be empty
                      if (!r) {
                        const addTopicEmbed = embed.createThumbnailEmbed(
                          "Schedule Topic",
                          `Enter a date to schedule: ${inlineCode(
                            t.topicDescription
                          )}`,
                          imageURL
                        );
                        const inputLabel = `Schedule ${t.topicDescription}`;
                        const textInputId = `${message.id}-${inputLabel}-textInput`;

                        const scheduleTopicFunc = async (interaction) => {
                          const date =
                            interaction.fields.getTextInputValue(textInputId);
                          const dateTimeStr = await checkDateFormat(
                            date,
                            message.author.id,
                            message.guildId
                          );
                          const incorrectDateFormatEmbed =
                            embed.createThumbnailEmbed(
                              "Bad Date Format",
                              `Incorrect date given, make sure correct values were given. Correct format is ${inlineCode(
                                "/mm/dd/(yy)yy@HH(:MM)[am|pm]"
                              )} (Hint: things in round brackets are optional, things in square brackets are required, '|' means either or)`,
                              imageURL
                            );

                          // Check that an appropriate date was given as an argument
                          if (dateTimeStr.length > 0) {
                            const reminderDate = new Date(
                              Date.parse(dateTimeStr)
                            );
                            if (isNaN(reminderDate))
                              return message.channel.send({
                                content: memberNicknameMention(
                                  message.author.id
                                ),
                                embeds: [incorrectDateFormatEmbed],
                              });

                            // Check that the reminder date is not in the past
                            if (await hasDatePassed(message, reminderDate))
                              return;
                            // Create a new reminder and store in the db
                            const reminder = new Reminder({
                              author: t.topicAuthor,
                              text: t.topicDescription,
                              reminderDate: reminderDate,
                              guildId: message.guildId,
                            });

                            saveReminder(message, interaction, reminder);
                          } else
                            return message.channel.send({
                              content: memberNicknameMention(message.author.id),
                              embeds: [incorrectDateFormatEmbed],
                            });
                        };

                        const scheduleTopicModal = modal.createSimpleModal(
                          message,
                          "Enter a date to schedule this topic",
                          inputLabel,
                          `Schedule ${t.topicDescription.substring(0, 10)}`,
                          scheduleTopicFunc,
                          "📅"
                        );
                        message.channel.send({
                          content: memberNicknameMention(message.author.id),
                          embeds: [addTopicEmbed],
                          components: [scheduleTopicModal],
                        });
                      } else
                        message.channel.send({
                          content: memberNicknameMention(message.author.id),
                          embeds: [
                            embed.createThumbnailEmbed(
                              "Duplicate Topic",
                              `${inlineCode(
                                t.topicDescription
                              )} already exists in the schedule.`,
                              imageURL
                            ),
                          ],
                        });
                    })
                    .catch((err) => {
                      return message.channel.send({
                        embeds: [embed.createErrorEmbed(err)],
                      });
                    });
                });
              })
              .catch((err) => {
                return message.channel.send({
                  embeds: [embed.createErrorEmbed(err)],
                });
              });
            i.update({ components: [] });
          }),
        ],
      });
    };

    // Function to remove topics by selecting them from a select menu
    const remove_topics = (i) => {
      i.update({
        components: [
          menu.createManySelect(
            message,
            "Select your topics to remove",
            options,
            (i) => {
              Topic.deleteMany({ _id: { $in: i.values } })
                .then((result) => {
                  i.update({
                    embeds: [
                      embed.createThumbnailEmbed(
                        "Topics Removed",
                        `Removed ${inlineCode(result.deletedCount)} topic(s)`,
                        imageURL
                      ),
                    ],
                    components: [module.exports.getViewTopicsBtn(message)],
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
    const row = button.createButtons({
      message: message,
      labels: ["Schedule Topic", "Remove Topics"],
      emojis: ["📅", "❌"],
      styles: ["DANGER", "SECONDARY"],
      funcs: [schedule_topic, remove_topics],
    });
    // If the user has posted any topics then show buttons otherwise don't attach them
    const components = options.length > 0 ? [row] : [];
    return {
      content: memberNicknameMention(message.author.id),
      embeds: [findTopicsEmbed],
      components: components,
    };
  },
  getTopicsProperties: async (result, message, authorOnly = true) => {
    // Check if there are any topics added
    if (result.length < 1)
      return {
        findTopicsEmbed: embed.createThumbnailEmbed(
          "No Topics Found",
          `There are currently no topics posted.\nUse ${inlineCode(
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

    // Construct the fields for the embed using the topic's attributes
    const fields = result.map((t) => {
      let topicCreationDate = new Date(t.date.getTime());
      topicCreationDate.setHours(
        topicCreationDate.getHours() + parseInt(timezone.substring(3, 6))
      );

      return {
        name: t.topicDescription,
        value: `Created by ${memberNicknameMention(
          t.topicAuthor
        )} at ${inlineCode(
          topicCreationDate.toLocaleString("en-US", dateOptions) +
            ` (${timezone})`
        )}`,
      };
    });

    // Grab all topics where the author is the same as the user who requested this command
    const userTopics = authorOnly
      ? result.filter((t) => t.topicAuthor == message.author)
      : result;
    const options = userTopics.map((t) => {
      return {
        label: t.topicDescription,
        value: `${t._id}`,
      };
    });
    const findTopicsEmbed = embed.createFieldsEmbed(
      "Topics",
      "These are potential topics for the private given by users.",
      fields,
      module.exports.imageURL
    );
    return { findTopicsEmbed, options };
  },
  getViewTopicsBtn: (message) => {
    const viewTopicFunc = async (i) => {
      await Topic.find({ guildId: message.guildId })
        .then(async (result) => {
          i.update(await module.exports.displayTopics(message, result));
        })
        .catch((err) => {
          return message.channel.send({
            embeds: [embed.createErrorEmbed(err)],
          });
        });
    };
    const viewTopicsBtn = button.createSimpleButton(
      message,
      "View Topics",
      viewTopicFunc,
      "📝"
    );
    return viewTopicsBtn;
  },
};
