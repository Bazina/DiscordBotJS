const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const {
    authorize,
    buildNotificationMessage,
    getFoldersMetaDataInFolder,
    getFolderMetaDataById,
    pullChanges
} = require("./drive")
const maxLength = 20;
let recentFilesIds = [];
let lastTimestamp = new Date();

function pushRecentFile(fileId) {
    if (recentFilesIds.length < maxLength)
        recentFilesIds.push(fileId);
    else {
        recentFilesIds.shift();
        recentFilesIds.push(fileId);
    }
}

async function loopOverChanges(changedFiles) {
    if (!changedFiles || !changedFiles.data || !changedFiles.data.activities || changedFiles.data.activities.length === 0)
        return;

    let currentTimestamp = new Date().toISOString();

    changedFiles.data.activities.forEach((activity) => {
        console.log(activity.primaryActionDetail);
        console.log(activity.targets);

        activity.targets.forEach((target) => {
            let fileId = target.driveItem.name.split('/')[1];
            let timeStamp = activity.timestamp;
            console.log(fileId, timeStamp);
            if (new Date(timeStamp).getDate() < new Date(lastTimestamp).getDate()) {
                lastTimestamp = currentTimestamp;
                console.log(lastTimestamp, "\tupdated before return");
                return;
            }

            pushRecentFile(fileId);
            const diveChannel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);
            notifyDriveChanges(fileId, diveChannel);
        });

    });

    lastTimestamp = currentTimestamp;
    console.log(lastTimestamp, "\tupdated at the end of the call");
}

async function notifyDriveChanges(fileID, diveChannel) {
    console.log("Notifying with fileId =", fileID);
    await authorize()
        .then(async (driveClient) => {
            await buildNotificationMessage(driveClient, fileID).then((responseMessage) => {
                console.log("File Data = \n", responseMessage);

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
            console.log("Authorized to get course data");
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

async function replyWithRecentFiles(interaction) {
    const number = interaction.options.getInteger('number');
    if (number <= 0 || number > maxLength) {
        await interaction.reply({
            content: 'Invalid number. Please enter a value between 1 and 20.',
            ephemeral: true
        });
        return;
    }

    const selectedRecentFilesIds = recentFilesIds.slice(Math.max(-number, -recentFilesIds.length));
    if (selectedRecentFilesIds.length > 0 ) {
        const listEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Recent Files')
            .setDescription(`Here are the ${selectedRecentFilesIds.length} most recent files:`);

        for (const selectedFileId of selectedRecentFilesIds) {
            await authorize()
                .then(async (driveClient) => {
                    await buildNotificationMessage(driveClient, selectedFileId).then((responseMessage) => {
                        console.log("File Data = \n", responseMessage);

                        listEmbed.addFields(
                            {
                                name: responseMessage.name,
                                value: `Link      :    ${responseMessage.webViewLink}\nDirectory   :    ${responseMessage.directory}\nFile Type    :    ${responseMessage.mimeType}`,
                                inline: true
                            }
                        );

                    });
                })
                .then(async () => {
                    await interaction.reply({embeds: [listEmbed], ephemeral: true});
                })
                .catch(console.error);
        }
    } else {
        await interaction.reply({content: 'No recent files found.', ephemeral: true});
    }
}

async function createChannels(guild) {
    try {
        const diveInDriveChannel = await guild.channels.create('dive-in-drive');
        const diveWithDriveChannel = await guild.channels.create('dive-with-drive');

        console.log('Channels created successfully');
        console.log('dive-in-drive channel ID:', diveInDriveChannel.id);
        console.log('dive-with-drive channel ID:', diveWithDriveChannel.id);
    } catch (error) {
        console.error('Error creating channels:', error);
    }
}

setInterval(() => {
    authorize().then(async (driveClient) => {
        console.log("Authorized to pull changes from ", lastTimestamp);
        let changes = await pullChanges(driveClient, DRIVE_ID, lastTimestamp);
        await loopOverChanges(changes);
    });
}, 1800000);

module.exports = {
    notifyDriveChanges,
    createChannels,
    replyWithCourseData,
    replyWithRecentFiles
};