const {
    MessageActionRow,
    MessageButton,
    MessageSelectMenu,
    Modal,
    TextInputComponent,
    Message
} = require('discord.js')

const {embed} = require('./embed');

exports.button = (function(){
    "use strict";

    let module = {};
    
    module.createSimpleButton = (message, label, func, emoji=null, style='DANGER') => {
        const emojis = (emoji)? [emoji] : [];
        return module.createButtons(
            {
                message:message,
                labels: [label],
                styles: [style],
                emojis: emojis,
                funcs: [func]
            }
        );
    };

    module.createFilterButton = (message, label, customFilter, func, emoji=null, style='DANGER') => {
        const emojis = (emoji)? [emoji] : [];
        return module.createButtons(
            {
                message: message,
                labels: [label],
                styles: [style],
                customFilters: [customFilter],
                emojis: emojis,
                funcs: [func]
            }
        );
    };

    module.createButtons = ({message, labels, channel=message.channel, customFilters = [], filterOptions=[], emojis = [], styles =[], needsCollector=false, funcs} = {}) => {
        if(labels.length != funcs.length) return console.log('Inconsistent button attributes');
        const row = new MessageActionRow();
        let components = [];
        for(let i = 0; i < labels.length; i ++){
            // Set up the button object
            const btnCustomId = `${message.id}-${labels[i]}-${i}-btn`;
            let btn = new MessageButton()
                .setCustomId(btnCustomId)
                .setLabel(labels[i]);
            if(emojis.length == labels.length) btn.setEmoji(emojis[i]);
            if(styles.length == labels.length) btn.setStyle(styles[i]);
            else btn.setStyle('DANGER');
            
            // Check if the collecter is using a custom filter or default filer
            let filter = null;
            if(customFilters.length == labels.length){
                filter = (interaction) => {
                    return customFilters[i](interaction, btnCustomId);
                };
            }
            else {
                filter = (interaction) => defaultFilter(message, interaction, btnCustomId, 'button');
            }

            // Create the message interaction collector for this button interaction
            let collector = null;
            if (filterOptions.length == labels.length) {
                if(filterOptions[i].max) collector = channel.createMessageComponentCollector({ filter: filter,  max: filterOptions[i].max});
                else if (filterOptions[i].maxUsers) collector = channel.createMessageComponentCollector({ filter: filter,  maxUsers: filterOptions[i].maxUsers});
            }
            else collector = channel.createMessageComponentCollector({ filter: filter,  max: 1});
            if(needsCollector){
                collector.on('collect', interaction => {
                    return funcs[i](interaction, btnCustomId, collector)
                });
            }
            else collector.on('collect', funcs[i]);
            
            collector.on('end', collected => console.log(`Collected ${collected.size} interactions.`));

            // Add the button to the array of components
            components.push(btn);
        }
        row.addComponents(components);
        return row;
    };

    return module;
}());

exports.menu = (function(){
    "use strict";

    let module = {};

    module.createSelect = ({
            message, 
            placeHolder, 
            options, 
            minValues=1, 
            maxValues=1,
            isDisabeled = false,
            customFilter = null,
            func
    } = {}) => {
        const menuId = `${message.id}-${placeHolder}-select`;
        const row = new MessageActionRow().addComponents(
			new MessageSelectMenu()
				.setCustomId(menuId)
				.setPlaceholder(placeHolder)
				.setMinValues(minValues)
				.setMaxValues(maxValues)
                .setDisabled(isDisabeled)
				.addOptions(options)
		);

        let filter;
        if(customFilter){
            filter = (interaction) => {
                return customFilter(interaction, menuId);
            };
        }
        else{
            filter = (interaction) => defaultFilter(message, interaction, menuId, 'menu');
        }
        // Creates an interaction collector and filters through only one interaction
		const collector = message.channel.createMessageComponentCollector({ filter,  max: 1});
		// On the collect event, grab what video the user selected and use the url value to play the song in the voice chat
		collector.on('collect', func);
		collector.on('end', collected => console.log(`Collected ${collected.size} interactions.`));
        return row;
    };
    
    module.createManySelect = (message, placeHolder, options, func) => {
        return module.createSelect({message: message, placeHolder: placeHolder, options, maxValues: options.length,  func: func});
    };

    module.createManyFilterSelect = (message, placeHolder, options, customFilter, func) => {
        return module.createSelect({message: message, placeHolder: placeHolder, options, maxValues: options.length, customFilter: customFilter, func: func});
    };
    module.createSimpleSelect = (message, placeHolder, options, func) => {
        return module.createSelect({message: message, placeHolder: placeHolder, options, func: func});
    };

    return module;
}());

exports.modal = (function(){
    "use strict";

    let module = {};

    const {button} = require('./row.js');

    module.createSimpleModal = (message, modalTitle, inputLabel, btnLabel, func, emoji=null, style='DANGER') => {
        const modalId = `${message.id}-${modalTitle}-modal`;
        const modal = new Modal()
			.setCustomId(modalId)
			.setTitle(modalTitle);

        const textInputId = `${message.id}-${inputLabel}-textInput`
        const textInput = new TextInputComponent()
            .setCustomId(textInputId)
            .setLabel(inputLabel)
            .setStyle('SHORT');
        
        const row = new MessageActionRow().addComponents(textInput);
        modal.addComponents(row);

        const displayModal = async i => {
            await i.showModal(modal);

            const filter = (interaction) => interaction.customId == modalId;
            i.awaitModalSubmit({ filter, time: 86400000})
            .then(func)
            .catch(err => message.reply("You took too long to submit! I'll always listen to your commands, but you can't expect me to wait around all day for you to respond."));
        };
      
        return button.createSimpleButton(message, btnLabel, displayModal, emoji, style);
    };

    return module;
}());

defaultFilter = (message, interaction, customId, interactionType) => {
    // Sometimes messages can be in a channel where the message is not in
    // This allows to filter between the message in a channel or an interaction in another channel
    const isMessage = message.author != undefined;      // Will be true if a message is passed through the message parameter
    const isInteraction = message.user != undefined;    // Will be true if an interaction is passed through the message parameter

    if(interaction.customId == customId){

        const checkInteraction = (checkType, userType) => {
            if(checkType && interaction.user == userType) return true;
            else if(checkType && interaction.user != userType){
                interaction.reply({embeds:[embed.createSimpleEmbed(`${interaction.user} you can't interact with this ${interactionType} because you are not the one that requested it.`)]});
                return false;
            }
        };
        
        return checkInteraction(isMessage, message.author) || checkInteraction(isInteraction, message.user);
    }
    return false;
};