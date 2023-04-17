const { 
    inlineCode,
    memberNicknameMention
} = require('@discordjs/builders');

const Member = require ('../models/member');
const {embed} = require('./embed.js');
const {menu} = require('./row.js');

module.exports = {
    adminRemoveItems: async (database, message, getItemsProperties, itemName, commandName, imageURL) => {
        if(!hasPermissions(message, 'Admin')){
            return message.channel.send({
                content: memberNicknameMention(message.author.id),
                embeds: [embed.createThumbnailEmbed('Unauthorized Command', `You can't request this command because you are not an adminstrator.`, imageURL)]
            });
        }
        // Save data in new document in database
        await database.find({guildId: message.guildId})
            .then(async (result) => {
            const itemsProperties = await getItemsProperties(result);
            const findItemsEmbed = itemsProperties[Object.keys(itemsProperties)[0]];
            const options = itemsProperties.options;
            if(itemsProperties.noResults) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [findItemsEmbed]});
            // Filters the type of interaction that will be collected
            const filter = (interaction, id) => {
                // Make sure that filter only interactions involving adding a member to a items in the database
                if(interaction.customId == id && interaction.user === message.author  && hasPermissions(message, 'Admin')) return true;
                if(!hasPermissions(message, 'Admin')){
                    return interaction.reply({
                        embeds: [embed.createThumbnailEmbed('Unauthorized Command', `${interaction.user} you can't remove ${itemName}s using this command because you are not an adminstrator.`, imageURL)]
                    });
                }
                if(interaction.customId == id){
                    return interaction.reply({
                        embeds: [embed.createThumbnailEmbed('Invalid Removal', `${interaction.user} you can't interact with this message because you are not the one who requested it.\nUse \`$${commandName}\` for your own selections`, imageURL)]
                    });
                }
                return false;
            };
            
            const removeItems = i => module.exports.removeItems(i, database, message, itemName, imageURL);
            const row = menu.createManyFilterSelect(message, `Select ${itemName}s to be removed`, options, filter, removeItems);
            // Call back function when this Promise resolves
            message.channel.send({content: memberNicknameMention(message.author.id), embeds: [findItemsEmbed], components: [row]});
        }).catch(err => {
            return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
        });
    },
    removeItems: async (i, database, message, itemName, imageURL, components=[]) => {
        if (i.user === module.exports.getUser(message) && hasPermissions(message, 'Admin')) {
            await database.deleteMany({_id: {$in: i.values}})
                .then((result) =>{
                    let title;
                    let description;
                    if(result.deletedCount < 1){
                        title = 'Nothing Removed';
                        description = `No ${itemName}s were removed. There may be no ${itemName}s added to this server.`
                    }
                    else{
                        const itemNameCap = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                        title = `${itemNameCap}s Removed`;
                        description = `Successfully removed ${inlineCode(result.deletedCount)} ${itemName}(s)`
                    }
                    const removedItemsEmbed = embed.createThumbnailEmbed(title, description , imageURL);
                    i.update({embeds: [removedItemsEmbed], components: components});
                })
                .catch(err => {
                    return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                });
        } 
    },
    checkMembersSaved: async (client) => {

        const sendErrorEmbed = (guild, err) => {
            // Given at least one text channel exists in the guild, send the error message to that channel
            const channels = guild.channels.cache.filter(channel => channel.type == 'GUILD_TEXT');
            if(channels.size > 0){
                const [channel] = channels.values();
                channel.send({embeds: [embed.createErrorEmbed(err)]});
            }
        };

        client.guilds.cache.forEach( async (guild) => {
            await Member.find({guildId: guild.id})
                .then(async result => {
                    const guildMembers = guild.members.cache.filter(member => !member.user.bot);
                    const addMember = async(guildMember) => {
                        const user = guildMember.user;
                        // Initialize the Member schema object and save it in the db
                        const member = new Member({
                            username: user.username,
                            userId: user.id,
                            guildId: guild.id
                        });
                        await member.save().catch(err => {
                            sendErrorEmbed(guild, err);
                            return;
                        });
                    };
                    // Given that the results show there are no members of this guild in the database, add all existing members
                    // Otherwise check if the number of guild members matches the number of members found in the result
                    if (result.length < 1){
                        guildMembers.forEach(async guildMember => {
                            await addMember(guildMember);
                        });
                    } 
                    else if (result.length < guildMembers.size){
                        // Given that more members exist in the guild than the results, add the members not listed in the db
                        const membersNotAdded = guildMembers.filter(guildMember => !result.map(member => member.userId).includes(guildMember.user.id));
                        membersNotAdded.forEach(async guildMember => {
                            await addMember(guildMember);
                        });
                    }
                    else if (result.length > guildMembers.size){
                        // Given that less members exist in the guild than the results, remove the members not listed in the guild
                        const membersRemoved = result.filter(member => !guildMembers.map(guildMember => guildMember.user.id).includes(member.userId));
                        await Member.deleteMany({_id: {$in: membersRemoved}, guildId: guild.id}).catch(err => {
                            sendErrorEmbed(guild, err);
                            return;
                        });
                    }
                })
                .catch(err => {
                    sendErrorEmbed(guild, err);
                    return;
                });
        });
    },
    getMemberTimeZone: async (message) => {
        const timezone = await Member.findOne({userId: message.author.id, guildId: message.guildId})
            .then(member => {
                return member.timezone.toString();
            })
            .catch(err => {
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
        return timezone;
    },
    getUser: (message) => {
        return (message.author)? message.author : message.user;
    },
    getUserId: (message) => {
        return module.exports.getUser(message).id;
    }
};

function hasPermissions(message, roleName){
    const authorRoles = message.member.roles.cache.map(role => role.name);
    return authorRoles.includes(roleName);
}