require('./helper_functions.js');
require('./message_create.js');
require('./interactions.js');

const {authorize} = require("./drive")

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const dive_channel = client.channels.cache.get(DIVE_IN_DRIVE_CHANNEL_ID);

    if (dive_channel) {
        console.log('Bot is back online!');
    } else {
        console.log('Channel not found!');
    }
});

authorize();
client.login(token);