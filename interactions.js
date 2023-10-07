const {EmbedBuilder} = require('discord.js');
const {replyWithCourseData, replyWithRecentFiles} = require("./helper_functions");

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'edit_permissions') return;

    if (interaction.channelId !== DIVE_WITH_DIVE_CHANNEL_ID) {
        await interaction.reply({content: `Please use <#${DIVE_WITH_DIVE_CHANNEL_ID}> channel`, ephemeral: true});
        return;
    }

    if (interaction.commandName === 'get') {
        await replyWithCourseData(interaction);
    }

    if (interaction.commandName === 'recent')
        await replyWithRecentFiles(interaction);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName !== 'edit_permissions') return;

    const isAdmin = interaction.member.roles.cache.some(role => role.name === 'ADMIN');

    if (!isAdmin) {
        await interaction.reply('You must have the "ADMIN" role to edit permissions.');
        return;
    }

    const permission = interaction.options.getString('permission');
    const add_remove = interaction.options.getString('add_remove');

    // Get the command's permission data
    const permissions = null;
    // TODO:
    //some how retrieve all permission that bot have
    //then add new precision
    //then set it back or use new
    console.log(permissions);
    console.log(add_remove);
    console.log(permission);
    // Modify the permissions as needed
    if (add_remove === 'add')
        permissions.add({permissions: [permission]});
    else if (add_remove === 'remove')
        permissions.remove({permissions: [permission]});
    else
        await interaction.reply(`Invalid you must type add or remove.`);

    console.log(add_remove);
    console.log(permissions);
    // Update the command's permissions
    await interaction.command.permissions.set({permissions});

    if (add_remove === 'add') {
        await interaction.reply(`Permission ${permission} added to the slash command.`);
    } else if (add_remove === 'remove') {
        await interaction.reply(`Permission ${permission} removed from the slash command.`);
    }
});
