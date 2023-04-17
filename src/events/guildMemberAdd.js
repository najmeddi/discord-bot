const {memberNicknameMention} = require('@discordjs/builders');

const Member = require ('../models/member');
const {embed} = require('../discord-templates/embed');
const {button} = require('../discord-templates/row');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member){
        const channel = member.guild.channels.cache.find(i => i.name === 'announcement');
        const WELCOME_GIF_LINK = 'https://i.gifer.com/8wdJ.gif';

        const welcomeEmbed = embed.createBaseEmbed({
            title: `Welcome to ${member.guild.name}!`,
            description: `Glad you can join us ${memberNicknameMention(member.user.id)}! We don't do much and are pretty chill. Two brain cell limit`,
            author: {name: member.user.username, iconURL: member.user.avatarURL()},
            thumbnail: member.guild.iconURL(),
            image: WELCOME_GIF_LINK,
            timestamp: new Date()
        });

        // Save the new guild member to the database
        const dbMember =  new Member({
            username: member.user.username,
            userId: member.user.id,
            guildId: member.guild.id
        });

        await dbMember.save()
            .then(async result => {
                const message = await channel.send({content: `${memberNicknameMention(member.user.id)}`});
                const filter = (interaction, btnId) => {
                    if(interaction.customId == btnId && interaction.user != member.user){
                        channel.send({embeds:[embed.createSimpleEmbed(`${interaction.user} you can't interact with this button because you are not the one that requested it.`)]});
                        return false;
                    }
                    return true;
                };
                const row = button.createFilterButton(message, "Take this pill so I know you're cool", filter, i => {
                    channel.send({content: `${memberNicknameMention(member.user.id)} https://www.youtube.com/watch?v=HnOk0wrmQRk`});
                    i.update({ components: []});
                }, '💊');
                return channel.send({embeds: [welcomeEmbed], components: [row]});
            })
            .catch(err => {
                return channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
    }
}