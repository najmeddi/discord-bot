const ms = require("ms");

const { inlineCode, memberNicknameMention} = require('@discordjs/builders');
const {embed} = require('../../discord-templates/embed');

const alarms = new Map();
// alarms(message.guild.id, alarmsList[{time, reason}])
module.exports = {
	name: 'alarm',
	aliases: ["a", "time-left", "tl"],
	description: 'Set an alarm within a given time. Examples for time amounts include 5s, 15m, 2h. Do not combine times (e.g. 1h30m).',
    args: false,
    usage: '[time amount] [alarm reason]',
	cooldown: 2,
	category: 'Utility',
	execute(message, args, client, commandName) {
        const alarmURL = "https://cdn.discordapp.com/attachments/885611257074438154/890436694720004126/alarm.png";
        const getEmbed = (title, description, showTime=false) => embed.createThumbnailEmbed(title, description, alarmURL, showTime);

        var serverAlarms = alarms.get(message.guild.id);
        if(commandName == 'alarm' || commandName == 'a'){
            if (args.length < 2) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [getEmbed('Incorrect Number of Arguments', `Wrong number of arguments given. The arguments are ${inlineCode('[time amount] [alarm reason]')}`)]});
            let time = args[0];
            let reason = args.slice(1).join(' ');

            // Check that the alaram time is set to be less than 24 hours
            if(ms(time) > ms("1d")) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [getEmbed('Time Out of Bounds', "The alarm cannot exceed 24 hours.")]});
            
            
            const newAlarm = {
                alarmTime: ms(time),
                alarmReason: reason,
                timestamp: Date.now()
            };

            // If no alarms exists make a new alarm array for this server
            // and add this alarm in it, otherwise just add the new alarm
            // to the already existing array
            if(!serverAlarms){
                const alarmsConstructor = {
                    alarmsArray: [newAlarm]
                };

                alarms.set(message.guild.id, alarmsConstructor)
                serverAlarms = alarms.get(message.guild.id);
            } else {
                serverAlarms.alarmsArray.push(newAlarm);
            }

            // Construct embeds for when the alarm is set and when the alarm is done
            const alarmSetEmbed = getEmbed('Alarm Set', `Alarm time: ${inlineCode(time)}\nReason: ${inlineCode(reason)}`, true);
             const alarmDoneEmbed = getEmbed('Alarm Done', `Alarm time: ${inlineCode(time)}\nReason: ${inlineCode(reason)}`, true)
            // Instantly reply to the message sender that the alarm is set
            message.channel.send({content: memberNicknameMention(message.author.id), embeds: [alarmSetEmbed] });

            // Reply to the message sender that the alarm is done in the time given
            setTimeout(() => {
                message.channel.send({content: memberNicknameMention(message.author.id), embeds: [alarmDoneEmbed]});
                if(serverAlarms.alarmsArray.length > 0){
                    serverAlarms.alarmsArray.shift();
                } else {
                    alarms.delete(message.guild.id);
                }
                
            }, ms(time));
        } else if (commandName == "time-left" || commandName == "tl"){
            if (!serverAlarms || serverAlarms.alarmsArray.length < 1) return message.channel.send({content: memberNicknameMention(message.author.id), embeds: [getEmbed('No Alarms Found', "There are no alarms set to check the time left.")]});
            const now = Date.now();
            var timeLeftArray = Array();
            serverAlarms.alarmsArray.forEach(alarm => {
                const expirationTime = alarm.timestamp + alarm.alarmTime;
                if(now < expirationTime) {
                    const timeLeft = (expirationTime - now);
                    timeLeftArray.push({
                        name: `Alarm reason ${inlineCode(alarm.alarmReason)}`,
                        value: `Time left on this alarm: ${inlineCode(msToTime(timeLeft))}`
                    });
                }
            });
            const timeLeftEmbed = embed.createFieldsEmbed('Current Alarms', 'A list of alarms in this server and the time left before each go off', timeLeftArray, alarmURL);
            message.channel.send({content: memberNicknameMention(message.author.id), embeds: [timeLeftEmbed]});
        }
	},
};

const msToTime = (milTime) => {
    var minutes = Math.floor(milTime / 60000);
    var seconds = ((milTime % 60000) / 1000).toFixed(0);
	
    var minStr = "";
    var secStr = "";
    if(minutes > 1){
        minStr = `${minutes} mintues`;
    } else if (minutes == 1){
        minStr = `${minutes} mintue`;
    } else{
        minStr = "";
    } 

    if(minutes > 0 && seconds > 0){
        secStr = " and "
    }

    if(seconds > 1){
        secStr += `${seconds} seconds`;
    } else if(seconds == 1){
        secStr += `${seconds} second`;
    } else{
        secStr += "";
    }  
    return `${minStr}${secStr}`;
}