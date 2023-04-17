const { inlineCode, memberNicknameMention} = require('@discordjs/builders');
const {embed} = require('../../discord-templates/embed');

module.exports = {
	name: 'flipcoin',
	description: 'Flip a coin to get either heads or tails',
    category: 'Random Draw',
	execute(message, args, client) {
        const FACE = flipCoin();
        var face_url = "";
        if (FACE === "heads") face_url = "https://cdn.discordapp.com/attachments/885611257074438154/990753343750144000/heads.png";
        else face_url  = "https://cdn.discordapp.com/attachments/885611257074438154/990753496976490506/tails.png";
        
        const coinEmbed = embed.createThumbnailEmbed('Coin Flipped', `The coin flipped ${inlineCode(FACE)}`, face_url);
        // Reply the sender of the message with the coin embed
        message.channel.send({
            content: memberNicknameMention(message.author.id),
            embeds: [coinEmbed]
        });
	},
};

function flipCoin(){
    const HEADS = 1;
    const TAILS = 2;
    var face_num = getRandNum(1, 2);
    var face = "";

    if (face_num == HEADS) face = "heads";
    else face = "tails";

    return face;
}

function getRandNum(min, max){
   return Math.floor(Math.random() * (max - min + 1)) + min;
}