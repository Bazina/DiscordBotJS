const {EmbedBuilder} = require('discord.js');
const {replyWithCourseData} = require("./helper_functions");

client.on('interactionCreate', async (interaction) => {

    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'edit_permissions') return;

    if (interaction.channelId !== DIVE_WITH_DIVE_CHANNEL_ID) {
        await interaction.reply({content: `Please use <#${DIVE_WITH_DIVE_CHANNEL_ID}> channel`, ephemeral: true});
        return;
    }
    if (interaction.commandName === 'recent') {
        const number = interaction.options.getInteger('number');
        if (number <= 0 || number > 50) {
            await interaction.reply({
                content: 'Invalid number. Please enter a value between 1 and 50.',
                ephemeral: true
            });
            return;
        }

        const fileInfos = await db.list();

        const recentFiles = fileInfos.slice(0, number);
        if (recentFiles.length > 1) {
            const listEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Recent Files')
                .setDescription(`Here are the ${Math.min(number, recentFiles.length - 1)} most recent files:`);

            for (const fileInfo of recentFiles) {
                try {
                    const fileInfoValue = await db.get(fileInfo);
                    console.log(fileInfoValue);
                    listEmbed.addFields(
                        {
                            name: fileInfoValue[dbIndices.name],
                            value: `Link      :    ${fileInfoValue[dbIndices.webViewLink]}\nDirectory   :    ${fileInfoValue[dbIndices.directory]}\nFile Type    :    ${fileInfoValue[dbIndices.mimeType]}`,
                            inline: true
                        }
                    );
                } catch (error) {
                    console.error(error);
                }
            }
            await interaction.reply({embeds: [listEmbed], ephemeral: true});
        } else {
            await interaction.reply({content: 'No recent files found.', ephemeral: true});
        }

    }
    if (interaction.commandName === 'get') {
        await replyWithCourseData(interaction);
    }
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
