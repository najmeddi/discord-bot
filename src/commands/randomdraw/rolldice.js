const { inlineCode, memberNicknameMention} = require('@discordjs/builders');

const {embed} = require('../../discord-templates/embed');

const dice_faces = {
    one: 'https://cdn.discordapp.com/attachments/885611257074438154/885611300565180476/dice_face_1.png',
    two: 'https://cdn.discordapp.com/attachments/885611257074438154/885611301177524244/dice_face_2.png',
    three: 'https://cdn.discordapp.com/attachments/885611257074438154/885611303425695744/dice_face_3.png',
    four: 'https://cdn.discordapp.com/attachments/885611257074438154/885611306844041226/dice_face_4.png',
    five: 'https://cdn.discordapp.com/attachments/885611257074438154/885611311441014814/dice_face_5.png',
    six: 'https://cdn.discordapp.com/attachments/885611257074438154/885611297125830806/dice_face_6.png'
};

const dice = [
    dice_faces.one, 
    dice_faces.two,
    dice_faces.three,
    dice_faces.four,
    dice_faces.five,
    dice_faces.six,
];

module.exports = {
	name: 'rolldice',
	description: 'Get a random number from 1 to 6',
    category: 'Random Draw',
	execute(message, args, client) {
        // Get a random number from 1-6
        const ROLLED_NUM = rollDice();
        // Get the dice face associated to the random number
        const diceImg = getDiceImg(ROLLED_NUM);
        // Construct embed using the random number and the dice face image
        const diceRollEmbed = embed.createThumbnailEmbed('Dice Rolled', `The dice rolled a ${inlineCode(ROLLED_NUM)}`, diceImg);
        message.channel.send({content: memberNicknameMention(message.author.id), embeds: [diceRollEmbed] });
	},
};

function getDiceImg(num){
    const offset = 1;
    return dice[num - offset];
}

function rollDice(){
    return getRandNum(1, 6);
}

function getRandNum(min, max){
   return Math.floor(Math.random() * (max - min + 1)) + min;
}