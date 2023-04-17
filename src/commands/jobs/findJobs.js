const Job = require('../../models/job');

const {embed} = require('../../discord-templates/embed.js');
const {button, menu} = require('../../discord-templates/row.js');
const {removeItems, getUser, getUserId} = require('../../discord-templates/actions')

const { 
    memberNicknameMention,
    inlineCode,
    underscore
} = require('@discordjs/builders');

module.exports = {
	name: 'find-jobs',
	description: 'Gets a list of all active jobs members have open. Can also add yourself to job(s) or remove job(s) you created.',
    args: false,
    category: 'Jobs',
    imageURL:'https://cdn.discordapp.com/attachments/885611257074438154/890437824149598218/jobs.png',
	async execute(message, args, client) {
        // Save data in new document in database
        await Job.find({guildId: message.guildId})
            .then((result) => {
                message.channel.send(module.exports.displayJobs(message, result));
            }).catch(err => {
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
	},
    displayJobs: (message, result) => {
        const imageURL = module.exports.imageURL;
        const jobsProperties = module.exports.getJobsProperties(result);
        const findJobsEmbed = jobsProperties.findJobsEmbed;
        const options = jobsProperties.options;
        if(jobsProperties.noResults) return {embeds: [findJobsEmbed], components: []};
        
        

        const getJoinJobsMenu = interaction => {
            const joinJob = async i => {
                // Convert the string of the option values to strings of the job title
                await Job.find({_id: {$in: i.values}})
                    .then((result) => {
                        if(result != null && result.length > 0){
                            result.forEach(job => {
                                // Check if the job author is joining their own job
                                if(job.jobAuthor === i.user.id) return i.update({embeds: [embed.createThumbnailEmbed('Unable to Join Job', `${i.user} you can't add yourself to your own job because you are its creator`, imageURL)], components: []});
                                if(!hasDuplicates(job.players, message)){
                                    job.players.push(getUser(message));
                                    job.save();
                                    const addMeEmbed = embed.createThumbnailEmbed("You've Joined a Job", `${message.author} is added under a ${inlineCode(job.jobType)} job`, imageURL);
                                    i.update({embeds: [addMeEmbed], components: [module.exports.viewJobsRow(message)]});
                                } 
                                else {
                                    i.update({embeds: [embed.createThumbnailEmbed('Already Joined Job', `You are already added to this job's list of players`, imageURL)], components: []});
                                }
                            });
                        } 
                        else {
                            i.update({embeds: [embed.createThumbnailEmbed('Job Not Found', "This job(s) does not exist.", imageURL)], components: []});
                        }
                    })
                    .catch(err => {
                        return i.update({embeds: [embed.createErrorEmbed(err)], components: []});
                });
            };
            const joinJobMenu = menu.createManySelect(message,'Select jobs to be added under', options, joinJob);
            interaction.update({components: [joinJobMenu]})
        }

        const getRemoveJobsMenu = async i => {
            Job.find({jobAuthor: getUserId(message), guildId: message.guildId})
                .then(result => {
                    // Check if the user made any jobs in order for anything to be removed
                    if(result.length < 1) i.update({
                        content: memberNicknameMention(userId), 
                        embeds: [embed.createThumbnailEmbed('No Jobs', "You are not the leader of any jobs", imageURL)],
                        components: [module.exports.viewJobsRow(message)]
                    });

                    const jobsProperties = module.exports.getJobsProperties(result);
                    const findJobsEmbed = jobsProperties.findJobsEmbed;
                    const options = jobsProperties.options;
                    if(jobsProperties.noResults) i.update({content: memberNicknameMention(userId), embeds: [findJobsEmbed], components: []});
                    const row = menu.createManySelect(message, 'Select jobs to remove', options, i => removeItems(i, Job, message, 'job', imageURL, [module.exports.viewJobsRow(message)]));
                    i.update({
                        content: memberNicknameMention(userId), 
                        embeds: [findJobsEmbed], 
                        components: [row]
                    });
                })
                .catch(err => {
                    i.update({
                        embeds: [embed.createErrorEmbed(err)],
                        components: []
                    });
                });
        }
        const row = button.createButtons({
                message: message,
                labels: ['Join Job', 'Remove Job'],
                styles: ['SUCCESS', 'DANGER'],
                emojis: ['➕', '✖️'],
                funcs: [getJoinJobsMenu, getRemoveJobsMenu]
            }
        );
        // Call back function when this Promise resolves
        const userId = getUserId(message);
        return { content: memberNicknameMention(userId), embeds: [findJobsEmbed], components: [row]};
    },
    getJobsProperties: (result) => {
        if(result.length < 1) {
            return {findJobsEmbed: embed.createSimpleEmbed(`There are currently no jobs available.\nUse ${inlineCode('$help')} to see how to make one.`), noResults: true};
        }
      
        // Jobs to be displayed in the fields of embed
        const jobsField = result.map(job =>{
            const jobCreatorStr = `Job creator: ${memberNicknameMention(job.jobAuthor)}`;
            const jobDetailStr = (job.jobDetail)? `\nJob details: ${inlineCode(job.jobDetail)}` : '';
            const activeStr = `Status: ${inlineCode(job.active)}`;
            const dateOptions = {  year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};
            const dateStr = `created at ${inlineCode(job.date.toLocaleDateString("en-US", dateOptions))}`;
            const players = getPlayerNames(job.players);
            const listOrder = result.indexOf(job) + 1;
            return {
                name: underscore(`${listOrder}. ${(job.jobType)}`),
                value: (players.length > 0)? `${jobCreatorStr}${jobDetailStr}\n${activeStr}\nMembers in this job [${players.length}]:\n${players}\n${dateStr}`: `${jobCreatorStr}${jobDetailStr}\n${activeStr}\nNo members currently added to job\n${dateStr}`
            };
        });
        
        // Jobs to be displayed in the options of the select menu
        const options = result.map(job => {
            const listOrder = result.indexOf(job) + 1;
            return {
                label: `${listOrder}. ${job.jobType}`,
                value: `${job._id}`,
            };
        });
        const findJobsEmbed = embed.createFieldsEmbed("List of Available Jobs", 'List of jobs available in this server', jobsField, module.exports.imageURL);
        return {findJobsEmbed, options};
    },
    viewJobsRow: (message) => {
        const viewJobs = async i => {
            await Job.find({guildId: message.guildId})
                .then((result) => {
                    i.update(module.exports.displayJobs(message, result));
                })
                .catch(err => {
                    i.update({embeds: [embed.createErrorEmbed(err)]});
                });
        };
        const row = button.createSimpleButton(message, 'View Jobs', viewJobs, '💼');
        return row
    },
};

function getPlayerNames(playerList){
    var players = new Array();
    playerList.forEach(player => {
        players.push(`<@${player.id}>`);
    });
    return players;
}


function hasDuplicates(arr, message) {
    const id = (message.author)? message.author.id: message.user.id;
    for(var i = 0; i < arr.length; i ++){
        if(arr[i].id == id){
            return true
        }
    }
    return false;
}