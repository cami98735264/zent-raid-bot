const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");

module.exports = {
    data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a preset list of users from a chosen server.")
    .addStringOption(option => option.setName("server").setDescription("The server to unban users from.").setAutocomplete(true).setRequired(true)),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = interaction.client.guilds.cache.filter(guild => guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)).map(guild => {
            return { name: guild.name, value: guild.id };
        })
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.map(choice => {
            return { name: choice.name, value: choice.value };
        }));
    },
    async execute(interaction) {
        const guild = interaction.client.guilds.cache.get(interaction.options.getString("server"));
        let users = JSON.parse(fs.readFileSync("./database.json"));
        console.log(users)
        let toPush = [];
        await interaction.reply({ content: "Unbanning users...", ephemeral: true });
        const filter = m => m.author.id === interaction.user.id && (m.content.toLowerCase() === "yes" || m.content.toLowerCase() === "no");
        await interaction.followUp({ embeds: [{description: ":warning: Would you wanna reset the users database? This is gonna be asked everytime you use the command to keep it simple :) (yes/no)", footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0xFFFF00}], ephemeral: true });
        await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] }).then(async collected => {
            console.log(collected.first().mentions())
            if(collected.first().content.toLowerCase() === "yes") {
                const newUsersObject = users;
                newUsersObject[0].unbanList = [];
                fs.writeFileSync("./database.json", JSON.stringify(newUsersObject));
                users = JSON.parse(fs.readFileSync("./database.json"));
                await interaction.followUp({ embeds: [{description: ":white_check_mark: The database has been reset", footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0x6AA84F}], ephemeral: true });
            }
        }).catch(async () => {
            await interaction.followUp({ content: "You didn't answer the question. Cancelling...", ephemeral: true });
            return;
        })
        if(!users[0].unbanList.length) {
            const filter = m => m.author.id === interaction.user.id && m.mentions.users.size > 0;
            await interaction.followUp({ embeds: [{description: ":warning: There are no users in the database yet, feel free to mention them below", footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0xFFFF00}], ephemeral: true });
            await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ["time"] }).then(async collected => {
                for(let user of collected.first().mentions.users) {
                    toPush.push(user[0]);
                }
                const newUsersObject = users;
                newUsersObject[0].unbanList = toPush;
                fs.writeFileSync("./database.json", JSON.stringify(newUsersObject));
                users = JSON.parse(fs.readFileSync("./database.json"));
                await interaction.followUp({ embeds: [{description: ":white_check_mark: The mentioned users have been added to the database", footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0x6AA84F}], ephemeral: true });
            }).catch(async () => {
                await interaction.followUp({ content: "You didn't mention any users. Cancelling...", ephemeral: true });
                return;
            })
        }
        for(let user of users[0].unbanList) {
            try {
                await guild.members.unban(user, "Punishment expired.");
                interaction.followUp({ embeds: [{description: `Unbanned <@${user}>!`, footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0x6AA84F}], ephemeral: false});
            } catch(err) {
                interaction.followUp({ embeds: [{description: `Failed to unban <@${user}>!`, footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, color: 0xA70000}], ephemeral: false });
            }
        }
    }
}