const {memberNicknameMention} = require('@discordjs/builders');

const Member = require ('../models/member');
const {embed} = require('../discord-templates/embed');
const {button} = require('../discord-templates/row');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member){
        const channel = member.guild.channels.cache.find(i => i.name === 'announcement');
        const goodbyeImageURL = 'https://media.giphy.com/media/kaBU6pgv0OsPHz2yxy/giphy.gif';
        const memberRemovedEmbed = embed.createBaseEmbed({
            title: `Member left ${member.guild.name}`,
            description: `${memberNicknameMention(member.user.id)} has left/been kicked from ${member.guild.name}. At least I have one less person to take orders from`,
            author: {name: member.user.username, iconURL: member.user.avatarURL()},
            thumbnail: member.guild.iconURL(),
            image: goodbyeImageURL,
            timestamp: new Date()
        });

        await Member.deleteMany({userId: member.user.id, guildId: member.guild.id})
            .then(async result => {
                const message = await channel.send({content: '@here'});
                const filter = (interaction, btnId) => {
                    if(interaction.customId == btnId){
                        return true;
                    }
                    return false;
                };
                const row = button.createFilterButton(message, "Let's celebrate", filter, i => {
                    channel.send({content: `${memberNicknameMention(i.user.id)} I was kidding. I'm too busy listening to your commands, I don't have time to celebrate.`});
                    i.update({ components: []});
                }, '🎉');
                return channel.send({embeds: [memberRemovedEmbed], components: [row]});
            })
            .catch(err => {
                return channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
    }
}