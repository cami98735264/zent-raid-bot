const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Just a ping command!"),
    async execute (interaction) {
        await interaction.reply("Pong!");
        console.log(bot)
    }
}