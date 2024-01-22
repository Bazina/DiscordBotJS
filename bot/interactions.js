const {replyWithCourseData, replyWithRecentFiles} = require("./helper_functions");
const {Events} = require("discord.js");

client.on(Events.InteractionCreate, async (interaction) => {

    if (!interaction.isCommand()) return;

    if (interaction.channelId !== DIVE_WITH_DRIVE_CHANNEL_ID) {
        await interaction.reply({content: `Please use <#${DIVE_WITH_DRIVE_CHANNEL_ID}> channel`, ephemeral: true});
        return;
    }

    if (interaction.commandName === 'get') {
        await replyWithCourseData(interaction);
    }

    if (interaction.commandName === 'recent')
        await replyWithRecentFiles(interaction);
});