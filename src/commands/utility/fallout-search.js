const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const cheerio = require('cheerio'); //  parses markup and provides an API for traversing/manipulating the resulting data structure

const { 
    bold,
    underscore,
    memberNicknameMention,
    inlineCode
} = require('@discordjs/builders');

const {
    MessageActionRow,
    MessageSelectMenu,
} = require('discord.js');

const {embed} = require('../../discord-templates/embed');
const {menu} = require('../../discord-templates/row');

module.exports = {
	name: 'fallout-search',
	description: 'Search keywords in the Fallout 76 wiki',
    args: true,
    usage: '[search keywords]',
    category: 'Utility',
	async execute(message, args, client) {
        const imageURL = 'https://freepngimg.com/thumb/fallout/140360-pip-boy-fallout-free-png-hq.png';

        // Get the search keywords and store the string
        const keywords = args.join('+');
        const argv = args.join(' ');

        try {
            // Create a query string for the URL so that server can parse it and know what to search.
            // Fetch response data from the website
            const response = await fetch(`https://fallout.fandom.com/wiki/Special:Search?query=${keywords}+fallout+76`);
            // Get the HTML body from the response as text string
            const body = await response.text();
            
            // Parse the HTML body text and save the object
            const parsedBody = cheerio.load(body);
            // Get all text from tags with <p>
            const links = [];
            const linkObjects = parsedBody('a', ".unified-search__result__header");
            linkObjects.each((index, element) => {
                links.push({
                    text: parsedBody(element).text(), // get the text
                    href: parsedBody(element).attr('href'), // get the href attribute
                });
            });
            
            if (links.length == 0) return message.channel.send({
                content: memberNicknameMention(message.author.id),
                embeds: [embed.createThumbnailEmbed('No Results Found', `No results could be found for ${inlineCode(argv)}`, imageURL)]
            });

            var options = [];
            links.forEach(link => {
                if(!hasDuplicates(options, `${link.href}`)){
                    options.push({
                        label: link.text,
                        value: `${link.href}`
                    });
                }
            });

            const searchResultsEmebed = embed.createThumbnailEmbed(`Search results for "${argv}"`, `Found ${inlineCode(links.length)} search results for ${inlineCode(argv)}.\nUse the select menu below to see the results and pick one to get more information.`, imageURL);
            
            var link = '';
            const displaySearchResults =  async i => {
                // Convert the string of the option values to strings of the job title
                i.values.forEach(value =>{
                    link = value;
                }); // end of loop
                try {
                    // Fetch the link that was found
                    const res = await fetch(link);
                    // Get the HTML body from the response as text string
                    const searchBody = await res.text();
                    const searchBodyParsed = cheerio.load(searchBody);
                    const bodyContent = searchBodyParsed(".page-content").html();
                    // Parse the HTML body text and save the object
                    const $ = cheerio.load(bodyContent);
                    const paraObjects = $('p, h2, li');
    
                    const pageTitle = searchBodyParsed(".page-header__title").text();
                    var image = searchBodyParsed("img", ".pi-image").attr("src");
                    
                    
                    var fields = [];
                    var currField = 0;
                    
                    paraObjects.each((index, element) => {
                        var elementStr = $(element).text().trim();
                        if (element.name === 'li'){
                            if (!(element.parent.parent.name === 'li')) elementStr = '- ' + elementStr;
                            else elementStr = '';
                        } 

                        if(element.name === 'h2'){
                            if(fields.length > 0){
                                currField ++;
                            }
                            fields.push({
                                name: elementStr + '\n',
                                value: ''
                            });
                        } else if (element.name === 'p' || element.name === 'li'){
                            if(fields.length == 0){
                                fields.push({
                                    name: '',
                                    value: elementStr + '\n'
                                })
                            } else if (fields.length > 0){
                                fields[currField] = {
                                    name: fields[currField].name,
                                    value: fields[currField].value + elementStr + '\n'
                                }
                            }

                        }
                    });
                    
                    // There may be fields that have their name and value as empty strings, this
                    // resolves issues with discord js putting it into an embed
                    var fieldsFilterd = '';
                    fields.forEach(field => {
                        if(field.name === '') fieldsFilterd += `${field.value}\n`;
                        else if (field.value === '') fieldsFilterd +='';
                        else fieldsFilterd += `${underscore(bold(field.name))}${field.value}\n`;
                    });
                    // console.log(fields);
    
                    // Resolves any error if a URL image could not be found
                    if (image == undefined) image = '';
    
                    // The embed description is capped at 4096 characters. If too long, use a substring + link
                    if (fieldsFilterd.length > 4095) fieldsFilterd = fieldsFilterd.substring(0, 4091) + '...';
                    const searchResultEmbed = embed.createFieldsEmbed(`${pageTitle}`, fieldsFilterd, [{name: "Original Wiki Link", value: link}], `${image}`);
                    i.update({embeds: [searchResultEmbed], components: []});
                } catch (err) {
                    message.channel.send({embeds: [embed.createErrorEmbed(err)]});
                }
            };
            
            const row = menu.createSimpleSelect(message, 'Select one of the search results', options, displaySearchResults);
            message.channel.send({content: memberNicknameMention(message.author.id), embeds: [searchResultsEmebed], components: [row]});
        } catch (err) {
            message.channel.send({embeds: [embed.createErrorEmbed(err)]});
        }
    },
};

function hasDuplicates(arr, value) {
    for(var i = 0; i < arr.length; i ++){
        if(arr[i].value == value){
            return true
        }
    }
    return false;
}