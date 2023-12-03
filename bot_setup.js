const {initializeRecentFiles} = require('./helper_functions.js');
require('./interactions.js');

const keepAlive = require("./server")
const {authorize} = require("./drive")

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const dive_channel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);

    if (dive_channel) {
        console.log('Bot is back online!');
        console.log('getting recent files');
        initializeRecentFiles()
    } else {
        console.log('Channel not found!');
    }
});

keepAlive()
authorize();
client.login(token);