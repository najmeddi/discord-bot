/*
Embed titles are limited to 256 characters
Embed descriptions are limited to 4096 characters
There can be up to 25 fields
A field's name is limited to 256 characters and its value to 1024 characters
The footer text is limited to 2048 characters
The author name is limited to 256 characters
The sum of all characters from all embed structures in a message must not exceed 6000 characters
Ten embeds can be sent per message
*/
const { 
    inlineCode
} = require('@discordjs/builders');

const { MessageEmbed } = require('discord.js');

exports.embed = (function(){
    "use strict";

    let module = {};

    const title_char_limit = 256;
    const des_char_limit = 4096;
    const fields_size_limit = 25;
    const fields_name_limit = 256;
    const fields_value_limit = 1024;
    const footer_char_limit = 2048;
    const author_char_limit = 246;

    module.createCustomEmbed = (
        {color = null, 
        title = null, 
        url = null, 
        author = null, 
        description, 
        thumbnail = null,
        fields = null,
        image = null,
        timestamp = null,
        footer  = null} = {}) => {
        
        let customEmbed = new MessageEmbed();
        customEmbed.setDescription(applyLimit(description, des_char_limit));
        if(color) customEmbed.setColor(color);
        if(title) customEmbed.setTitle(applyLimit(title, title_char_limit));
        if(url) customEmbed.setURL(url);
        if(author) {
            let editAuthor = author;
            editAuthor.name = applyLimit(editAuthor.name, author_char_limit);
            customEmbed.setAuthor(editAuthor);
        }
        if(thumbnail) customEmbed.setThumbnail(thumbnail);
        if(fields) {
            fields.forEach(field =>{
                const name = applyLimit(field.name, fields_name_limit);
                const value = applyLimit(field.value, fields_value_limit);
                if(field.inline) customEmbed.addField(name, value, true);
                else customEmbed.addField(name, value, false);
            });
        }
        if(image) customEmbed.setImage(image);
        if(timestamp) customEmbed.setTimestamp(timestamp);
        if(footer) customEmbed.setFooter(applyLimit(footer, footer_char_limit));
        return customEmbed;
    };

    module.createBaseEmbed = (attributes) =>{
        attributes.color = getRandColor();
        return module.createCustomEmbed(attributes);
    };

    module.createSimpleEmbed = (description) => {
        return module.createBaseEmbed({description: description});
    };

    module.createTitleEmbed = (title, description) => {
        return module.createBaseEmbed({title: title, description: description});
    };

    module.createThumbnailEmbed = (title, description, thumbnailURL, defaultTimestamp=false) => {
        return  module.createBaseEmbed({title: title, description: description, thumbnail: thumbnailURL, timestamp: (defaultTimestamp)? new Date(): null});
    };

    module.createErrorEmbed = (err) => {
        const title = 'Oops! Something went wrong';
        const description = `An error occurred when I was trying to perform that last command. More details: ${inlineCode(err)}`;
        const thumbnailURL = 'https://cdn.discordapp.com/attachments/885611257074438154/980954007222771832/error.png';
        return module.createThumbnailEmbed(title, description, thumbnailURL);
    };

    module.createFieldsEmbed = (title, description, fields, thumbnail=null) => {
        return module.createBaseEmbed({title: title, description: description, thumbnail: thumbnail, fields: applyFieldSizeLimit(fields, fields_size_limit)});
    };

    module.createAuthorEmbed = (title, description, author, thumbnail=null, defaultTimestamp=false) => {
        return  module.createBaseEmbed({title: title, description: description, author: author, thumbnail: thumbnail, timestamp: (defaultTimestamp)? new Date(): null});
    }

    module.createThumbnail

    function applyLimit(text, limit){
        let text_edit = text;
        // Check that the number of characters in the text is not over limit
        if(text_edit.length > limit) text_edit = text_edit_edit.slice(0, limit - 4) + "...";
        const embedObj = {
            color: getRandColor(),
            description: text_edit
        }
        return text_edit;
    }

    function applyFieldSizeLimit(fields, limit){
        let fields_edit = fields;
        if(fields_edit.length > limit) fields_edit.slice(0, limit);
        return fields_edit;
    }

    function getRandColor(){
        const color_codes = [16711680, 16776960];
        const randomColor = color_codes[Math.floor(Math.random() * color_codes.length)];
        return randomColor;
    }
    
    return module;
}());