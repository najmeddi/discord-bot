const mongoose = require("../database/mongoose");
const Reminder = require("../models/reminder");
const { embed } = require("../discord-templates/embed.js");
const { imageURL } = require("../commands/private/schedule");
const { checkMembersSaved } = require("../discord-templates/actions");
const { inlineCode, memberNicknameMention } = require("@discordjs/builders");

module.exports = {
  name: "ready",
  async execute(client) {
    console.log(`${client.user.tag} has logged in`);
    // Initiate database

    await mongoose
      .init()
      .then(() => {
        let currentTime = new Date();
        // Set timeout is so that reminders are notified when actual minute time changes
        setTimeout(
          () => initReminders(client),
          (60 - currentTime.getSeconds()) * 1000
        );
      })
      .catch((err) => console.log(err));

    // Check each guild the client is added to if the members of the guild are saved in the db
    checkMembersSaved(client);

    const emoji_str =
      "🔋 🔌 💡 🔦 🪔 🧯 💸 💵 💴 💶 💷 💰 💳 💎 ⚖️ ⌚️ 📱 📲 💻 ⌨️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📞 ☎️ 📟 📠 📺 📻 🧭👋 🤚 🖐 ✋ 🖖 👌  🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦿 🦶 👣 👂 🦻 👃  🧠 🦷 🦴 👀 👅 😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾";
    const emojis = emoji_str.split(" ");
    var delayInMilliseconds = 5000; //1 second

    // Set the activity
    setInterval(function () {
      //your code to be executed after 1 second
      var emoji = emojis[Math.floor(Math.random() * emojis.length)];
      client.user.setActivity(`your commands ${emoji}`, { type: "LISTENING" });
    }, delayInMilliseconds);

    // Set the presence of the bot (i.e. online, idle, invisible)
    client.user.setStatus("dnd");
  },
};

function initReminders(client) {
  setInterval(() => {
    // Check the reminders
    Reminder.find({})
      .then((result) => {
        result.forEach((reminder) => {
          // Get the private channel in the associated guild to send messages
          const guild = client.guilds.cache.get(reminder.guildId);
          let podChannel = guild?.channels.cache.get("970913093661450340");
          // Get one channel if the other channel id is not in this guild
          podChannel = podChannel
            ? podChannel
            : guild?.channels.cache.get("976439730291519682");
          let reminderAuthor = client.users.fetch(reminder.author);
          reminderAuthor.then((author) => {
            if (reminder.reminderDate <= Date.now()) {
              const nowReminderEmbed = embed.createAuthorEmbed(
                "Reminder",
                `${memberNicknameMention(
                  reminder.author
                )} has a reminder set to go off now for ${inlineCode(
                  reminder.text
                )}`,
                { name: author.username, iconURL: author.avatarURL() },
                imageURL,
                true
              );
              podChannel?.send({
                content: `@everyone`,
                embeds: [nowReminderEmbed],
              });
              Reminder.deleteOne({ _id: reminder._id })
                .then((result) => {})
                .catch((err) => console.log(err));
            }

            const futureNotify = (numHours, titleSubstr, desSubstr) => {
              let future = new Date();
              future.setHours(future.getHours() + numHours);
              future.setSeconds(0);
              future.setMilliseconds(0);
              if (reminder.reminderDate.getTime() === future.getTime()) {
                const futureReminderEmbed = embed.createAuthorEmbed(
                  `Reminder ${titleSubstr} Notice`,
                  `${memberNicknameMention(
                    reminder.author
                  )} has a reminder set to go off in ${desSubstr} for ${inlineCode(
                    reminder.text
                  )}`,
                  { name: author.username, iconURL: author.avatarURL() },
                  imageURL,
                  true
                );
                podChannel?.send({
                  content: `@everyone`,
                  embeds: [futureReminderEmbed],
                });
              }
            };

            futureNotify(24, "One Day", "a day");
            futureNotify(8, "Eight Hours", "8 hours");
            futureNotify(1, "One Hour", "an hour");
          });
        });
      })
      .catch((err) => console.log(err));
  }, 60 * 1000);
}
