const {notifyDriveChanges} = require("./helper_functions");

client.on('messageCreate', async (message) => {
    if (message.channelId !== ZAPIER_CHANNEL_ID) return;

    const diveChannel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);
    if (diveChannel) {
        await notifyDriveChanges(message, diveChannel);
    } else {
        console.log('Channel not found!');
    }
});