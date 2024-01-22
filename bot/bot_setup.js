const {initializeRecentFiles} = require('./helper_functions.js');
require('./interactions.js');

const keepAlive = require("../server")
const {authorize} = require("../drive")
const {Events} = require("discord.js");

client.on(Events.ClientReady, async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}!`);

    const dive_channel = readyClient.channels.cache.get(NOTIFY_DRIVE_CHANNEL_ID);

    if (dive_channel) {
        console.log('Bot is back online!');
        console.log('getting recent files');
        await initializeRecentFiles()
    } else {
        console.log('Channel not found!');
    }
});

client.on(Events.Warn, console.warn);

(async () => {
    keepAlive();
    await authorize();
    return await client.login(token);
})();