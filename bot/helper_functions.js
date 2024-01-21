const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const {
    authorize,
    buildNotificationMessage,
    getFoldersMetaDataInFolder,
    getMetaDataById,
    pullChanges,
    pullChangesWithLimit
} = require("../drive/drive")
const maxLength = 21;
let recentFilesInfo = [];
let lastTimestamp = new Date();
let beginningOfRecent = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
let getCourseDataCallsStats = 0;
let getRecentDataCallsStats = 0;

/**
 * Pushes the response message into recent files info.
 * @param responseMessage - response message from Google Drive.
 */
function pushIntoRecentFileInfoUsingResponseMessage(responseMessage) {
    const responseDict = {};
    responseDict.name = responseMessage.name;
    responseDict.id = responseMessage.id;
    responseDict.mimeType = responseMessage.mimeType;
    responseDict.directory = responseMessage.directory;
    responseDict.webViewLink = responseMessage.webViewLink;
    if (recentFilesInfo.length > maxLength) {
        recentFilesInfo.pop();
    }
    recentFilesInfo.unshift(responseDict);
}

/**
 * Checks if the activities data is empty.
 * @param files - files object.
 * @returns {boolean} - true if empty, false otherwise.
 */
function isActivitiesDataEmpty(files) {
    return !files || !files.data || !files.data.activities || files.data.activities.length < 0;
}

/**
 * Finds missing data in the files object.
 * @param files - files object.
 * @returns {*[]} - array of missing data.
 */
function findMissingData(files) {
    const missingData = [];

    if (!files) {
        missingData.push("files");
    } else {
        if (!files.data) {
            missingData.push("files.data");
        } else {
            if (!files.data.activities) {
                missingData.push("files.data.activities");
            } else if (files.data.activities.length === 0) {
                missingData.push("files.data.activities (empty)");
            }
        }
    }

    return missingData;
}

/**
 * Initializes recent files info.
 * This function is called when the bot is started.
 * @returns {Promise<void>}
 */
async function initializeRecentFiles() {
    authorize().then(async (driveClient) => {
        let recentFiles = await pullChangesWithLimit(driveClient, DRIVE_ID, beginningOfRecent, 20);
        if (isActivitiesDataEmpty(recentFiles)) {
            console.log("missing data in recent files: ", findMissingData(recentFiles));
            return;
        }
        recentFiles.data.activities.forEach((activity) => {
            activity.targets = activity.targets.filter(async (target) => {
                let fileId = target.driveItem.name.split('/')[1];
                try {
                    let responseMessage = await getMetaDataById(driveClient, fileId);
                    return !responseMessage.trashed;
                } catch (error) {
                    console.error("Error filtering recent files:", error);
                    return false;
                }
            });
        });

        recentFiles.data.activities.forEach((activity) => {
            console.log("initializing recent files");
            console.log(activity.primaryActionDetail);
            console.log(activity.targets);
            activity.targets.forEach(async (target) => {
                let fileId = target.driveItem.name.split('/')[1];
                await buildNotificationMessage(driveClient, fileId).then((responseMessage) => {
                    pushIntoRecentFileInfoUsingResponseMessage(responseMessage);
                });
            });
        });
    });
}

/**
 * Loops over the changes.
 * If the file is not trashed, it notifies the changes.
 * @param changedFiles - changed files object.
 * @param callTimeStamps - Time stamp of the call to filter out old changes.
 * @returns {Promise<void>}
 */
async function loopOverChanges(changedFiles, callTimeStamps) {
    let currentTimestamp = callTimeStamps;

    if (isActivitiesDataEmpty(changedFiles)) {
        console.warn("Invalid or missing data structure in changedFiles: ", findMissingData(changedFiles), "\nNote could be due to no updates found anyway");

        lastTimestamp = currentTimestamp;
        console.log(lastTimestamp, "\ttime stamp updated at with no changed files");
        return;
    }

    const diveChannel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);
    diveChannel.send({content: "@here New Changes in Drive"});
    changedFiles.data.activities.forEach((activity) => {
        console.log("looping over changes");
        console.log(activity.primaryActionDetail);
        console.log(activity.targets);

        activity.targets.forEach((target) => {
            let fileId = target.driveItem.name.split('/')[1];
            let timeStamp = activity.timestamp;
            console.log(fileId, timeStamp);
            if (new Date(timeStamp).getDate() < new Date(lastTimestamp).getDate()) {
                console.warn("this file id :", fileId, " should have been notified before ");
                return;
            }
            notifyDriveChanges(fileId, diveChannel);
        });

    });

    lastTimestamp = currentTimestamp;
    console.log(lastTimestamp, "\tupdated at the end of the call");
}

/**
 * Notifies the drive changes with a file uploaded.
 * @param fileID - file id.
 * @param diveChannel - channel to notify.
 * @returns {Promise<void>}
 */
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
                diveChannel.send({embeds: [embed]});
                pushIntoRecentFileInfoUsingResponseMessage(responseMessage);
            });
        })
        .catch(console.error);
}

/**
 * Replies with course data like folders and files int the course folder.
 * @param interaction - interaction object.
 * @returns {Promise<void>}
 */
async function replyWithCourseData(interaction) {
    let courseId = interaction.options.get('course').value;
    let embed = new EmbedBuilder();
    let buttonsRow = [];

    await authorize()
        .then(async (driveClient) => {
            console.log("get course data called = " + (++getCourseDataCallsStats));
            console.log("Authorized to get course data");
            await getMetaDataById(driveClient, courseId).then((responseMessage) => {
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

/**
 * Replies with the passed number of recent files.
 * @param interaction - interaction object.
 * @returns {Promise<void>}
 */
async function replyWithRecentFiles(interaction) {
    const number = interaction.options.getInteger('number');
    console.log("get recent data called = " + (++getRecentDataCallsStats));

    if (number <= 0 || number > maxLength) {
        await interaction.reply({
            content: `Invalid number. Please enter a value between 1 and ${maxLength}.`,
            ephemeral: true
        });
        return;
    }

    console.log("Recent Files Info = \n", recentFilesInfo);

    try {
        await authorize()
            .then(async (driveClient) => {
                const filterResults = await Promise.all(recentFilesInfo.map(async (recentFileInfo) => {
                    const responseMessage = await getMetaDataById(driveClient, recentFileInfo.id);
                    if (!responseMessage.trashed) {
                        console.log("File Data Trashed = \n", responseMessage.trashed);
                        return true;
                    }
                    return false;
                }));

                recentFilesInfo = recentFilesInfo.filter((_, index) => filterResults[index]);
            })
            .catch((error) => {
                console.error("Error during authorization:", error);
            });

        let selectedRecentFilesInfo = recentFilesInfo.slice(0, Math.min(number, recentFilesInfo.length));
        console.log("Selected Recent Files Info = \n", selectedRecentFilesInfo);

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
    } catch (error) {
        console.error("Error filtering recent files:", error);
        await interaction.reply({content: 'An error occurred while fetching recent files.', ephemeral: true});
    }
}

/**
 * Checks for changes every 3 minutes.
 */
setInterval(() => {
    const currentDate = new Date();
    authorize().then(async (driveClient) => {
        console.log("Authorized to pull changes from ", lastTimestamp);
        let changes = await pullChanges(driveClient, DRIVE_ID, lastTimestamp.toISOString());
        await loopOverChanges(changes, currentDate);
    });
}, 180000);

module.exports = {
    replyWithCourseData,
    replyWithRecentFiles,
    initializeRecentFiles
};