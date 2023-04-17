const Topic = require("../../models/topic");
const { embed } = require("../../discord-templates/embed.js");
const { getViewTopicsBtn, imageURL } = require("./topics");
const { inlineCode, memberNicknameMention } = require("@discordjs/builders");

module.exports = {
  name: "add-topic",
  description: `Adds a topic for the private channel(s)`,
  args: true,
  category: "Private",
  channels: ["970915093661250340", "95643973029719682"],
  async execute(message, args, client) {
    const topic = new Topic({
      topicAuthor: message.author,
      topicDescription: args.join(" "),
      guildId: message.guildId,
    });

    module.exports.saveTopic(message, topic);
  },
  saveTopic: async (message, topic) => {
    await topic
      .save()
      .then(async (result) => {
        message.channel.send({
          content: memberNicknameMention(message.author.id),
          embeds: [
            embed.createThumbnailEmbed(
              "Topic Added",
              `Topic successfully added: ${inlineCode(
                result.topicDescription
              )}`,
              imageURL
            ),
          ],
          components: [await getViewTopicsBtn(message)],
        });
      })
      .catch((err) => {
        return message.channel.send({ embeds: [embed.createErrorEmbed(err)] });
      });
  },
};
