const Reminder = require('../../models/reminder');
const Member = require('../../models/member');
const {embed} = require('../../discord-templates/embed.js');
const {modal, button, menu} = require('../../discord-templates/row.js');
const {getViewScheduleBtn, imageURL} = require('./schedule');
const { 
    inlineCode,
    memberNicknameMention
} = require('@discordjs/builders');

module.exports = {
	name: 'add-reminder',
	description: `Add a reminder to the schedule`,
    args: true,
    usage: '[date & time (/DD/MM/(YY)YY@hh(:mm)[am|pm])]',
    category: 'Private',
    channels: ['970915093661250340', '95643973029719682'],
	async execute(message, args, client) {
        const dateTimeStr = await module.exports.checkDateFormat(args[0], message.author.id, message.guildId);
        const incorrectDateFormatEmbed = embed.createThumbnailEmbed('Bad Date Format', `Incorrect date given, make sure correct values were given. Correct format is ${inlineCode('/DD/MM/(YY)YY@hh(:mm)[am|pm])')} (Hint: things in round brackets are optional, things in square brackets are required, '|' means either or)`, imageURL);
        // Check that an appropriate date was given as an argument
        if(dateTimeStr.length > 0){
            const reminderDate = new Date(dateTimeStr);
            if(isNaN(reminderDate)) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [incorrectDateFormatEmbed]});
             
            const datePassed = await module.exports.hasDatePassed(message, reminderDate);
            // Check that the reminder date is not set in the past, otherwise notify the user that reminders must be set in the future
            if(datePassed) return;

            // Create the modal to get the topic/note from the text input
            const inputLabel = 'Topic or Discussion';
            const textInputId = `${message.id}-${inputLabel}-textInput`;

            // Function to save the author, date, and topic/discussion to the db when modal is submitted
            const func = async interaction => {
                const topic = interaction.fields.getTextInputValue(textInputId);
                const reminder = new Reminder({
                    author: message.author,
                    text: topic,
                    reminderDate: reminderDate,
                    guildId: message.guildId
                });

                // Check if a reminder with the same topic already exists, if not save it, otherwise notify that duplicates are not allowed
                await Reminder.findOne({text: reminder.text, guildId: message.guildId})
                    .then(result => {
                        if(!result) module.exports.saveReminder(message, interaction, reminder);
                        else return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [embed.createThumbnailEmbed('Duplicate Topic', `${inlineCode(reminder.text)} already exists in the schedule.`, imageURL)]});
                    })
                    .catch(err => {
                        return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                    });
            };

            const enterTopicEmbed = embed.createThumbnailEmbed('Enter Topic', 'Enter the topic/discussion you want set for this date. WARNING: you can click this button only once', imageURL);
            message.channel.send({content: memberNicknameMention(message.author.id), embeds: [enterTopicEmbed], components: [modal.createSimpleModal(message, 'What is the topic/discussion?', inputLabel, 'Enter topic', func, '📝')]});
        }
        else {
            return message.channel.send({embeds: [incorrectDateFormatEmbed]})
        }

    },
    hasDatePassed: async (message, reminderDate) => {
        const currentDate = new Date();
        
        // Check that the reminder date occurs before current date
        if (currentDate > reminderDate){
            await Member.findOne({userId: message.author.id, guildId: message.guild.id})
                .then(member => {
                    // Calculate the users current time based on the current UTC time and the provided timezone of the user
                    const memberTimezone = member.timezone + '';
                    const currentUTCHour = currentDate.getUTCHours();
                    const currentUTCMinute = currentDate.getUTCMinutes();
                    let memberHour = currentUTCHour + parseInt(memberTimezone.substring(3, 6));   // This isolates the hour and removes the prefix 'GMT' and suffix ':mm'
                    memberHour = (memberHour < 0)? 24 + memberHour : memberHour;
                    const memberTimeStr = inlineCode(`${memberHour}:${(currentUTCMinute < 10)? `0${currentUTCMinute}` : currentUTCMinute} (${member.timezone})`);
                    
                    // Given that this function is called, display a select menu with all available timezones to choose from
                    // and update user timezone if one is selected
                    const displayTimezones = (interaction) => {
                        // Create an options array of timezones and their current hour and minute (24 hour based)
                        let options = [];
                        for(let i = -12; i <= 12; i ++){
                            const memberMinute = (currentUTCMinute < 10)? `0${currentUTCMinute}` : currentUTCMinute;
                            const adjustedHour = (currentUTCHour + i < 0)? 24 + (currentUTCHour + i) : currentUTCHour + i;
                            const timezoneStr = (i < 0)? `GMT-${((i * -1) < 10)? `0${i * -1}` : i * -1}:00`: `GMT+${(i < 10)? `0${i}` : i}:00`;
                            options.push({
                                    label: `${adjustedHour}:${memberMinute}  (${timezoneStr})`,
                                    value: timezoneStr
                            });
                        }

                        // Saves the selected timezone under the users timezone in the db
                        const saveTimezone = async (i) => {
                            await Member.findOne({userId: message.author.id, guildId: message.guildId})
                                .then(result => {
                                    const newTimezone = i.values[0]
                                    result.timezone = i.values[0];
                                    result.save();
                                    const tzChangeEmbed = embed.createSimpleEmbed(`Your timezone has been changed to ${inlineCode(newTimezone)}. You may now perform your previous command`);
                                    i.update({embeds: [tzChangeEmbed], components: []});
                                })
                                .catch(err => {
                                    return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                                });
                        }

                        // Create the select menu with timezones
                        const row = menu.createSimpleSelect(message, 'Select your timezone', options, saveTimezone);

                        interaction.update({components: [row]});
                    };
                    // Create a button for the user to change their saved timezone
                    const row = button.createSimpleButton(message, 'Change My Timezone', displayTimezones, '⌚');
                    
                    
                    message.channel.send({
                        content: memberNicknameMention(message.author.id),
                        embeds: [embed.createThumbnailEmbed('Date Not Allowed', `Unless you got a time machine, you cannot set a reminder in the past. Your timezone is set to ${memberTimeStr}. If this is not correct, click the button below`, imageURL)],
                        components: [row]
                    });
                })
                .catch(err => {
                    return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                });
            return true;
        }
        return false;
    },
    saveReminder: async (message, interaction, reminder) => {
        await reminder.save()
            .then(async result => {
                const viewScheduleBtn = getViewScheduleBtn(message);
                const reminderDate = new Date(result.reminderDate.getTime());
                await Member.findOne({userId: message.author.id, guildId: message.guildId})
                    .then(member =>{
                        const timezone = member.timezone.toString();
                        reminderDate.setHours(reminderDate.getHours() + parseInt(timezone.substring(3,6)));
                        let reminderDateString = reminderDate.toUTCString();
                        reminderDateString = reminderDateString.substring(0, reminderDateString.length - 3) + timezone
                        interaction.update({embeds: [embed.createThumbnailEmbed('Reminder Added to Schedule', `Reminder set for ${inlineCode(result.text)}\non ${inlineCode(reminderDateString)}`, imageURL)],components: [viewScheduleBtn]});
                    })
                    .catch(err => {
                        return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                    });
                
            })
            .catch(err =>{
                return message.channel.send({embeds: [embed.createErrorEmbed(err)]});
            });
    },
    checkDateFormat: async (dateTimeStr, userId, guildId) => {
        // To check and store dates the user provided dates need to be accomponied by a timezone
        // if the user that provided the date is given then fetch their timezone, otherwise default to some timezone
        let timezone = 'GMT-04:00';
        const dateTimeFormated = await Member.findOne({userId: userId, guildId: guildId})
            .then(result => {
                const dateTimeArr = dateTimeStr.split('@');
                if (dateTimeArr.length != 2) return '';
                // Extract the date and the time
                const dateStr = dateTimeArr[0];
                let timeStr = dateTimeArr[1];
            
                // Check if the date is formatted correctly
                let dateArr = dateStr.split('/')
                dateArr.shift();
                if(dateArr.length != 3) return '';
                // Check that the values given for day, month, and year are numerical
                for (let i in dateArr){
                    if(isNaN(dateArr[i])) return '';
                }
            
                // Extract the day, month, and year from the date string
                const day = dateArr[0];
                const month = dateArr[1];
                const year = dateArr[2];
                
                let timePeriod = 'PM';
                timeStr = timeStr.toUpperCase();
                // Check if the time is formatted correctly
                if(timeStr.includes('PM') || timeStr.includes('AM')){
                    if(timeStr.includes('AM')) timePeriod = 'AM';
                    let hourMinStr = timeStr.split(timePeriod)[0];
                    
                    // Check if format is HH or HH:MM
                    const hourMinArr = hourMinStr.split(':');
                    if(hourMinArr.length == 1){
                        if(isNaN(hourMinStr)) return '';
                        hourMinStr = hourMinStr.concat(':00');
                    } 
                    else if(hourMinArr.length == 2){
                        for(let i in hourMinArr){
                            if(isNaN(hourMinArr[i])) return '';
                        }
                    }
                    else return '';

                    timezone = (result.timezone)? result.timezone : timezone;
                    return `/${month}/${day}/${year}` + '@' + hourMinStr + ' ' + timePeriod + ' ' + timezone;
                }
                else return '';
    
            })
            .catch(err => {
                return '';
            });
        return dateTimeFormated;
    }
}