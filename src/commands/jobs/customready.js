const Job = require("../../models/job");

const { inlineCode, memberNicknameMention } = require("@discordjs/builders");

const { embed } = require("../../discord-templates/embed.js");
const { button, menu } = require("../../discord-templates/row.js");

const { viewJobsRow, imageURL } = require("./findJobs");

module.exports = {
  name: "custom-ready",
  description: "Let everyone know you have something ready",
  args: true,
  usage: "[custom job name] <-d|-detail [job details]>",
  category: "Jobs",
  async execute(message, args, client) {
    const IMG_URL =
      "https://cdn.discordapp.com/attachments/885611257074438154/890439718477643786/customready.png";
    const argsString = args.join(" ");
    // Check if the detail flag is given
    if (args.includes("-d") || args.includes("-detail")) {
      // Make sure that the flag is only supplied once
      let flagCount = 0;
      let detailFlag = "-d"; // Store whether the shorthand or longer verision of the flag string is used
      args.forEach((arg) => {
        if (arg == "-d" || arg == "-detail") {
          detailFlag = arg;
          flagCount++;
        }
      });
      if (flagCount > 1)
        return message.channel.send({
          content: memberNicknameMention(message.author.id),
          embeds: [
            embed.createTitleEmbed(
              "Flag Given Too Many Times",
              `You supplied the ${inlineCode(
                "-detail"
              )} flag too many times when issuing the command. The flag can be applied at most once.`
            ),
          ],
        });

      // Extract the job name and job details
      const jobArr = argsString.split(detailFlag);
      const jobType = jobArr[0].trim();
      const jobDetail = jobArr[1].trim();
      if (jobDetail.length == 0)
        return message.channel.send({
          content: memberNicknameMention(message.author.id),
          embeds: [
            embed.createTitleEmbed(
              "No Job Details Provided",
              `You did not enter any arguments for the job detail after the ${inlineCode(
                "-detail"
              )} flag.`
            ),
          ],
        });

      module.exports.postJob(message, jobType, IMG_URL, jobDetail);
    } else {
      // Build the job name from the args
      const jobType = argsString;
      module.exports.postJob(message, jobType, IMG_URL);
    }
  },
  postJob: async (message, jobType, thumbnailURL, jobDetail = undefined) => {
    const CHANNEL_ID = message.guild.channels.cache.find(
      (i) => i.name === "jobs-for-hire"
    ).id;

    // Create new instance use job model
    const job = new Job({
      jobAuthor: message.author,
      jobType: jobType,
      jobDetail: jobDetail,
      guildId: message.guildId,
    });

    // Save the job instance in the database
    await job
      .save()
      .then((result) => {
        message.guild.channels
          .fetch(CHANNEL_ID)
          .then((channel) => {
            // Construct the embed
            const author = {
              name: message.author.username,
              iconURL: message.author.avatarURL(),
            };
            const jobTitle = jobType.charAt(0).toUpperCase() + jobType.slice(1);
            const jobDetailStr = jobDetail
              ? `\nJob details: ${inlineCode(jobDetail)}`
              : "";
            const addJobEmbed = embed.createAuthorEmbed(
              `${jobTitle} Ready`,
              `${message.author} has a ${inlineCode(
                jobType
              )} ready${jobDetailStr}`,
              author,
              thumbnailURL,
              true
            );
            // Filter and count the non-bot members of this guild
            const actualMembers = message.guild.members.cache.filter(
              (member) => !member.user.bot
            );

            // Filters the type of interaction that will be collected
            const mfilter = (interaction, id) => {
              // Make sure that filter only interactions involving adding a member to a job
              if (
                interaction.customId == id &&
                interaction.user != message.author
              ) {
                return true;
              }
              if (
                interaction.customId == id &&
                interaction.user == message.author
              ) {
                channel.send({
                  embeds: [
                    embed.createThumbnailEmbed(
                      "Unable to Join Job",
                      `${interaction.user} you can't add yourself to your own job because you are its creator`,
                      imageURL
                    ),
                  ],
                });
              }
              return false;
            };

            // Filters for removing the job
            const filterRemoveJob = (interaction, id) => {
              // Make sure that filter only interactions involving the author wanting to remove a job
              if (
                interaction.customId == id &&
                interaction.user.id === message.author.id
              ) {
                return true;
              }
              // Otherwise check that the button pressed was to remove a job
              if (interaction.customId == id) {
                channel.send({
                  embeds: [
                    embed.createThumbnailEmbed(
                      "Unable to Remove Job",
                      `${interaction.user} you can't remove the job because you are not the one who added it.`,
                      imageURL
                    ),
                  ],
                });
              }
              return false;
            };

            const removeJob = async (i, id, collector) => {
              // Find the job title, delete it if it exists, and remove the original
              // add job reply
              const jobType = result.jobType;
              await Job.deleteOne({ _id: result._id, guildId: message.guildId })
                .then((result) => {
                  if (result.deletedCount > 0) {
                    const jobRemovedEmbed = embed.createThumbnailEmbed(
                      "Job Removed",
                      `A ${inlineCode(jobType)} job has been removed by ${
                        i.user
                      }`,
                      imageURL
                    );
                    i.update({ embeds: [jobRemovedEmbed], components: [] });
                  } else {
                    i.update({
                      content: " ",
                      embeds: [
                        embed.createThumbnailEmbed(
                          "Job Not Found",
                          "This job(s) does not exist.",
                          imageURL
                        ),
                      ],
                      components: [],
                    });
                  }
                })
                .catch((err) => {
                  // Catch and display any kind of error
                  i.update({ embeds: [embed.createErrorEmbed(err)] });
                });
            };

            const addMember = async (i, id, collector) => {
              // Add any member that clicks the button to the job that has been added
              // This is the same code in the add-me command
              await Job.findOne({ _id: result._id })
                .then((result) => {
                  if (result != null) {
                    if (!hasDuplicates(result.players, i.user.id)) {
                      result.players.push(i.user);
                      result.save();
                      const addMeEmbed = embed.createThumbnailEmbed(
                        "You've Joined a Job",
                        `${message.author} is added under a ${inlineCode(
                          job.jobType
                        )} job`,
                        imageURL
                      );
                      channel.send({
                        embeds: [addMeEmbed],
                        components: [viewJobsRow(i)],
                      });
                      // Check the total number of interactions. Update the embed if total interactions is the total
                      // number of guild members currently
                      if (collector.total < actualMembers.size - 1) {
                        i.deferUpdate();
                      } else {
                        // If all players signed up to the job, update the original message to remove the buttons
                        // except the remove button
                        const updatedRow = button.createFilterButton(
                          i,
                          "Remove Job",
                          filterRemoveJob,
                          removeJob,
                          "✖️"
                        );
                        i.update({ components: [updatedRow] });
                      }
                    } else {
                      i.deferUpdate();
                      channel.send({
                        embeds: [
                          embed.createThumbnailEmbed(
                            "Already Joined Job",
                            `You are already added to this job's list of players`,
                            imageURL
                          ),
                        ],
                        components: [],
                      });
                    }
                  } else {
                    i.update({
                      content: " ",
                      embeds: [
                        embed.createThumbnailEmbed(
                          "Job Not Found",
                          "This job(s) does not exist.",
                          imageURL
                        ),
                      ],
                      components: [],
                    });
                  }
                })
                .catch((err) => {
                  // Catch and display any kind of error
                  return i.update({
                    embeds: [embed.createErrorEmbed(err)],
                    components: [],
                  });
                });
            };

            const row = button.createButtons({
              message: message,
              labels: ["Add Me", "Remove Job"],
              channel: channel,
              customFilters: [mfilter, filterRemoveJob],
              filterOptions: [{ maxUsers: actualMembers.size - 1 }, { max: 1 }],
              styles: ["SUCCESS", "DANGER"],
              emojis: ["➕", "✖️"],
              needsCollector: true,
              funcs: [addMember, removeJob],
            });
            // Send the embed to everyone in the appropriate channel
            channel.send({
              content: "@everyone",
              embeds: [addJobEmbed],
              components: [row],
            });
          })
          .catch((err) => {
            return channel.send({
              embeds: [embed.createErrorEmbed(err)],
              components: [],
            });
          });
      })
      .catch((err) => {
        // Catch and display any kind of error
        message.channel.send({
          embeds: [embed.createErrorEmbed(err)],
          components: [],
        });
      });
  },
  displayJobDetails: (message, jobType, thumbnailURL, jobDetails) => {
    const jobTitle = jobType.charAt(0).toUpperCase() + jobType.slice(1);
    const jobDetailsOptions = jobDetails.map((jobDetail) => {
      return {
        label: jobDetail,
        value: jobDetail,
      };
    });
    const selectDetail = (interaction) => {
      const jobDetail = interaction.values[0];
      let jobEmbedTitle = "No Job Detail Selected";
      let jobEmbedDescription = `You have not selected any job detail. The job will not be posted`;
      let components = [];
      if (jobDetail) {
        module.exports.postJob(message, jobType, thumbnailURL, jobDetail);
        jobEmbedTitle = "Job Detail Selected";
        jobEmbedDescription = `You selected ${inlineCode(
          jobDetail
        )}. The job will now be posted`;
        components = [viewJobsRow(interaction)];
      }
      interaction.update({
        embeds: [
          embed.createThumbnailEmbed(
            jobEmbedTitle,
            jobEmbedDescription,
            thumbnailURL
          ),
        ],
        components: components,
      });
    };
    const row = menu.createSimpleSelect(
      message,
      "Select a job detail",
      jobDetailsOptions,
      selectDetail
    );
    const selectDetailEmbed = embed.createThumbnailEmbed(
      `Select the ${jobTitle} Type`,
      `Let members know which type of ${inlineCode(
        jobType
      )} you will run using the select menu below`,
      thumbnailURL
    );

    message.channel.send({
      content: memberNicknameMention(message.author.id),
      embeds: [selectDetailEmbed],
      components: [row],
    });
  },
};

function hasDuplicates(arr, id) {
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].id == id) {
      return true;
    }
  }
  return false;
}
