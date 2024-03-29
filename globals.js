const {Client, GatewayIntentBits, Events} = require('discord.js');

global.token = process.env['token'];
global.CLIENT_ID = process.env['client_id'];
global.DRIVE_ID = process.env['drive_id'];
global.NOTIFY_DRIVE_CHANNEL_ID = process.env['notifyDriveChannelID'];
global.SYNC_DRIVE_CHANNEL_ID = process.env['syncDriveChannelID'];
global.DIVE_WITH_DRIVE_CHANNEL_ID = process.env['diveWithDriveChannelID'];

global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, () => {
    global.GUILD_ID = client.guilds.cache.first().id;
    // next line "require('./bot/initialization.js');" only need to run once.
    require('./bot/initialization.js');
});

client.on(Events.GuildCreate, (guild) => {
    console.log(`The bot has joined the guild: ${guild.name} (ID: ${guild.id})`);
    require('./bot/initialization.js');
});
