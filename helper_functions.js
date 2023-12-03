const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const {
    authorize,
    buildNotificationMessage,
    getFoldersMetaDataInFolder,
    getMetaDataById,
    pullChanges,
    pullChangesWithLimit
} = require("./drive")
const maxLength = 21;
let lastTimestamp = new Date();
let beginningOfRecent = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
let getCourseDataCallsStats= 0;
let getRecentDataCallsStats= 0;

function isActivitiesDataEmpty(files) {
    return !files || !files.data || !files.data.activities || files.data.activities.length < 0;
}

async function buildRecentFiles() {
    let selectedRecentFilesInfo = [];
    let filteredActivities = [];

    authorize().then(async (driveClient) => {
        let recentFiles = await pullChangesWithLimit(driveClient, DRIVE_ID, beginningOfRecent, 20);
        if (isActivitiesDataEmpty(recentFiles))
            return;

        recentFiles.data.activities.forEach((activity) => {
            console.log(activity.primaryActionDetail);
            console.log(activity.targets);
            activity.targets.forEach(async (target) => {
                let fileId = target.driveItem.name.split('/')[1];
                await buildNotificationMessage(driveClient, fileId).then((responseMessage) => {
                    selectedRecentFilesInfo.push(responseMessage);
                });
            });
        });

        filteredActivities = selectedRecentFilesInfo;

        selectedRecentFilesInfo.data.activities.forEach((activity) => {
            activity.targets.forEach(async (target) => {
                let fileId = target.driveItem.name.split('/')[1];
                await getMetaDataById(driveClient, fileId).then((fileMetaData) => {
                    if (fileMetaData.trashed) {
                        let fileIndex = filteredActivities.data.activities.indexOf(activity);
                        filteredActivities.data.activities.splice(fileIndex, 1);
                    }
                });
            });
        });
    });

    return selectedRecentFilesInfo;
}

async function loopOverChanges(changedFiles) {
    if (isActivitiesDataEmpty(changedFiles))
        return;

    let currentTimestamp = new Date();

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
            console.log("get course data called = " + (++getCourseDataCallsStats));
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
    console.log("get recent data called = " + (++getRecentDataCallsStats));

    if (number <= 0 || number > maxLength) {
        await interaction.reply({
            content: 'Invalid number. Please enter a value between 1 and ${maxLength}.',
            ephemeral: true
        });
        return;
    }

    let selectedRecentFilesInfo = buildRecentFiles();
    selectedRecentFilesInfo = selectedRecentFilesInfo.slice(0,Math.min(number, selectedRecentFilesInfo.length));

    if (selectedRecentFilesInfo.length > 0) {
        const listEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('Recent Files')
            .setDescription(`Here are the ${selectedRecentFilesInfo.length} most recent files:`);

        for (const selectedFileInfo of selectedRecentFilesInfo) {
            console.log("File Data info = \n", selectedFileInfo);
            listEmbed.addFields(
                {
                    name: selectedFileInfo.name,
                    value: `Link      :    ${selectedFileInfo.webViewLink}\nDirectory   :    ${selectedFileInfo.directory}\nFile Type    :    ${selectedFileInfo.mimeType}`,
                    inline: true
                }
            );
        }

        await interaction.reply({embeds: [listEmbed], ephemeral: true});
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
        let changes = await pullChanges(driveClient, DRIVE_ID, lastTimestamp.toISOString());
        await loopOverChanges(changes);
    });
}, 90000);

module.exports = {
    replyWithCourseData,
    replyWithRecentFiles
};