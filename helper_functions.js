const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const {authorize, buildNotificationMessage, getFoldersMetaDataInFolder, getFolderMetaDataById, pullChanges} = require("./drive")
let lastCreatedFileId = "";

async function loopOverChanges(changedFiles) {
    let newLastCreatedFileId = changedFiles.data.activities[0].targets[0].driveItem.name.split('/')[1];

    changedFiles.data.activities.forEach((activity) => {
        console.log(activity.primaryActionDetail);
        console.log(activity.targets);
        if (activity.primaryActionDetail.create) {
            activity.targets.forEach(async (target) => {
                let fileId = target.driveItem.name.split('/')[1];
                if (fileId === lastCreatedFileId) {
                    lastCreatedFileId = newLastCreatedFileId;
                    return;
                }

                const diveChannel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);
                await notifyDriveChanges(fileId, diveChannel);
            });
        }
    });
}

async function notifyDriveChanges(message, diveChannel) {
    console.log(message.content);
    await authorize()
        .then(async (driveClient) => {
            console.log("Authorized");
            await buildNotificationMessage(driveClient, message.content).then((responseMessage) => {
                console.log(responseMessage);

                let embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle(responseMessage.name)
                    .setURL(responseMessage.webViewLink)
                    .setDescription(`New file has been uploaded to ${responseMessage.directory}`)
                    .setThumbnail(responseMessage.iconLink)
                    .addFields({name: 'File Type', value: responseMessage.mimeType, inline: true})
                    .setImage(responseMessage.thumbnailLink)
                    .setTimestamp();

                diveChannel.send({content: "@here", embeds: [embed]});
            });
        })
        .catch(console.error);
}

async function replyWithCourseData(interaction) {
    let courseId = interaction.options.get('course').value;
    let embed = new EmbedBuilder();
    let buttonsRow = [];

    await authorize()
        .then(async (driveClient) => {
            console.log("Authorized");
            await getFolderMetaDataById(driveClient, courseId).then((responseMessage) => {
                console.log(responseMessage);

                embed.setColor(0x0099FF)
                    .setTitle(responseMessage.name)
                    .setURL(responseMessage.webViewLink)
                    .setDescription(`The Course Main Folder`)
                    .setTimestamp();
            });

            await getFoldersMetaDataInFolder(driveClient, courseId).then((response) => {
                let actionRow = new ActionRowBuilder();
                let cnt = 0;
                for (const file of response) {
                    cnt++;
                    const button = new ButtonBuilder()
                        .setLabel(file.name)
                        .setStyle(ButtonStyle.Link)
                        .setURL(file.webViewLink);
                    if (file.mimeType !== 'application/vnd.google-apps.folder')
                        button.setEmoji('📄');
                    else
                        button.setEmoji('📁');

                    actionRow.addComponents(button);

                    if (cnt % 5 === 0) {
                        buttonsRow.push(actionRow);
                        actionRow = new ActionRowBuilder();
                    }
                }
                if (cnt % 5 !== 0)
                    buttonsRow.push(actionRow);
            });
        })
        .then(async () => {
            await interaction.reply({embeds: [embed], components: buttonsRow, ephemeral: true});
        })
        .catch(console.error);
}

async function createChannels(guild) {
    try {
        const diveInDriveChannel = await guild.channels.create('dive-in-drive');
        const diveWithDriveChannel = await guild.channels.create('dive-with-drive');
        const zapierChannel = await guild.channels.create('zapier');

        console.log('Channels created successfully');
        console.log('dive-in-drive channel ID:', diveInDriveChannel.id);
        console.log('dive-with-drive channel ID:', diveWithDriveChannel.id);
        console.log('zapier channel ID:', zapierChannel.id);
    } catch (error) {
        console.error('Error creating channels:', error);
    }
}

setInterval(() => {
    authorize().then(async (driveClient) => {
        let changes = await pullChanges(driveClient, DRIVE_ID);
        await loopOverChanges(changes);
    });
}, 60000);

module.exports = {
    notifyDriveChanges,
    createChannels,
    replyWithCourseData
};