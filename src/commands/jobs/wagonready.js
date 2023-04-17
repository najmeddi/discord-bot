const { displayJobDetails } = require("./customready");

module.exports = {
  name: "wagon-ready",
  description: "Let everyone know you have a RDR2 wagon ready",
  category: "Jobs",
  async execute(message, args, client) {
    const WAGON_IMG_LINK =
      "https://cdn.discordapp.com/attachments/885611257074438154/890440573356490752/wagonready.png";
    const jobDetails = ["Trader Goods", "Moonshine"];
    displayJobDetails(message, "wagon", WAGON_IMG_LINK, jobDetails);
  },
};
