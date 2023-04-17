const Job = require("../../models/job");

const { bold } = require("@discordjs/builders");

const { adminRemoveItems } = require("../../discord-templates/actions");
const { getJobsProperties, imageURL } = require("./findJobs");

module.exports = {
  name: "admin-remove-jobs",
  aliases: ["arj"],
  description: `${bold(
    "For Admin only"
  )}. Removes a job or jobs from the list of members' jobs`,
  args: false,
  category: "Jobs",
  async execute(message, args, client) {
    await adminRemoveItems(
      Job,
      message,
      getJobsProperties,
      "job",
      this.name,
      imageURL
    );
  },
};
