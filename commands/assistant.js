const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports.data = new SlashCommandBuilder()
	.setName('g')
	.setDescription('Asks the Google Assistant!')
	.addStringOption(option =>
		option.setName('query')
			.setDescription('What to ask Google')
			.setRequired(true));
