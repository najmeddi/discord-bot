const {inlineCode, memberNicknameMention} = require('@discordjs/builders');
const {embed} = require('../../discord-templates/embed.js');
var unirest = require('unirest');

module.exports = {
	name: 'madam-nazar',
	description: "Get Madam Nazar's current location",
    aliases: ["mn"],
    cooldown: 10,
    category: 'Utility',
	execute(message, args, client) {
        unirest
            .get('https://madam-nazar-location-api.herokuapp.com/today')
            .end(res => {
                if (res.error) return message.channel.send({embed: [embed.createErrorEmbed(res.error)]});
                const location_name = res.body['data']['current_location']['data']['location']['region']['name'];
                const location_precise = res.body['data']['current_location']['data']['location']['region']['precise'];
                const location_nearby = res.body['data']['current_location']['data']['location']['near_by'];
                const location_image =  res.body['data']['current_location']['data']['location']['image'];
                const location_date = res.body['data']['current_location']['dataFor'];
                
                const mnEmbed = embed.createBaseEmbed(
                    {
                        title: "Madam Nazar's Current Location",
                        description: `Madam Nazar is at ${inlineCode(location_name)} in ${inlineCode(location_precise)}, near by ${inlineCode(location_nearby[0])} and ${inlineCode(location_nearby[1])}`,
                        image: location_image,
                        footer: {text: `Location for the date of ${location_date}`}
                    }
                );
                
                message.channel.send({content: memberNicknameMention(message.author.id), embeds: [mnEmbed]});
            });
	},
};

/*
{"data": {
    "date":"2021-07-21T20:12:48.751Z",
    "current_location":{
        "data":{
            "_id":6,
            "name":"point 6",
            "location":{
                "region":{
                    "name":"new hanover",
                    "precise":"the heartlands"
                },
                "cardinals":{
                    "full":"north east",
                    "simplified":"ne"
                },
                "near_by":["emerald ranch","dewberry creek"],
                "image":"https://madamnazar.github.io/images/location/rdo_map_nazar_6_bjgzyx.jpg"
            }
        },
        "dataFor":"2021/7/21"
    },
    "cycle":2
}}
*/