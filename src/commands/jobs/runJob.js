const Job = require('../../models/job');

const { 
    inlineCode,
    memberNicknameMention
} = require('@discordjs/builders');

const {embed} = require('../../discord-templates/embed.js');
const {menu} = require('../../discord-templates/row.js');

const {displayJobs, getJobsProperties, imageURL} = require('./findJobs');

module.exports = {
	name: 'run-jobs',
	description: 'Runs and makes a job active, notifying everyone subscribed to it. Can add optional parameters to finish or revert to inactive a job too.',
    usage: '<-f|-finish | -i|-inactive>',
    args: false,
    category: 'Jobs',
	async execute(message, args, client) {
        let status = args[0];
        // Save data in new document in database
        await Job.find({jobAuthor: String(message.author.id), guildId: message.guildId})
            .then((result) => {
                const jobsProperties = getJobsProperties(result);
                const findJobsEmbed = jobsProperties.findJobsEmbed;
                const options = jobsProperties.options;
                if(jobsProperties.noResults) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [findJobsEmbed], components: []});

                const runJob = async i => {
                    var notifyPlayers = false;      // Tracks whether players are added to a job, therefore needed to be notified
                    var isFinished = false;         // Tracks if the -finsihed option is enbaled, so no one is notifyed
                    var playersStr = '';            // String used to notify all the members in a job(s)
                    var newActive;                  // The string to represent the active status in the db
                    
                    // Check if the finish option was selected
                    if(status == '-f' || status == '-finish'){
                        newActive = "Finished";
                        isFinished = true;
                    } else if (status == '-i' || status == '-inactive' ){
                        newActive = "Inactive";
                        isFinished = true;  // not actually finished, just bypasses notifying
                    }
                    else newActive = "Active";

                    // Convert the string of the option values to strings of the job title
                    await Job.find({_id: {$in: i.values}})
                        .then(result => {
                            var jobsModifed = 0;
                            result.forEach(job => {
                                if(job != null){
                                    job.active = newActive;
                                    job.save();
                                    if(job.players.length > 0){
                                        notifyPlayers = true;
                                        job.players.forEach(player => {
                                            if(player.id != job.jobAuthor) playersStr += `${memberNicknameMention(player.id)} `
                                        });
                                    }
                                    // Check if job is now made active
                                    if(notifyPlayers && !isFinished) {
                                        const author = {name: message.author.username, iconURL: message.author.avatarURL()};
                                        const description = getJobsProperties(result).findJobsEmbed.fields[0].value;
                                        const runGameEmbed = embed.createAuthorEmbed(`Job Now ${newActive}`, description, author, imageURL, true);
                                        message.channel.send({
                                            content: `${playersStr}`,
                                            embeds: [runGameEmbed]
                                        });
                                        // Reset the notification tracker and player string for the next job
                                        notifyPlayers = false;
                                        playersStr = '';
                                    }
                                    jobsModifed ++;
                                } else {
                                    message.channel.send({
                                        content: memberNicknameMention(message.author.id), 
                                        embeds: [embed.createThumbnailEmbed('Job Not Found', 'Cannot run job because it could not be found. It may have been already removed.', imageURL)]
                                    });
                                }
                            });

                            return i.update(
                                { 
                                    embeds: [embed.createThumbnailEmbed(`Jobs ${newActive}`, `Total of ${inlineCode(jobsModifed)} are now ${inlineCode(newActive)}`, imageURL)], 
                                    components: [] 
                                });
                        })
                        .catch(err => {
                            return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                        });
                };

                const row = menu.createManySelect(message, 'Select jobs to run', options, runJob);
                return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [findJobsEmbed], components: [row]});
            }).catch(err => {
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
	},
};