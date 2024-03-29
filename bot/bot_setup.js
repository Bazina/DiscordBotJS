require('./interactions.js');

const keepAlive = require("../server")
const {authorize} = require("../drive")
const {Events} = require("discord.js");

client.on(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    const dive_channel = readyClient.channels.cache.get(NOTIFY_DRIVE_CHANNEL_ID);
    const sync_channel = readyClient.channels.cache.get(SYNC_DRIVE_CHANNEL_ID);

    if (dive_channel) {
        if (!sync_channel) {
            console.warn('Sync channel not found!');
        }
        console.log('Bot is back online!');
        console.log('getting recent files');
    } else {
        console.log('Dive Channel not found!');
    }
});

client.on(Events.Warn, console.warn);

(async () => {
    keepAlive();
    await authorize();
    return await client.login(token);
})();