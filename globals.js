const {Client, GatewayIntentBits, Events} = require('discord.js');

global.token = process.env['token'];
global.CLIENT_ID = process.env['client_id'];
global.DRIVE_ID = process.env['drive_id'];
global.DIVE_IN_DRIVE_CHANNEL_ID = process.env['diveInDriveChannelID'];
global.DIVE_WITH_DIVE_CHANNEL_ID = process.env['diveWithDiveChannelID'];

global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, () => {
    global.GUILD_ID = client.guilds.cache.first().id;
    // uncomment the next line to register new slash commands
    require('./bot/initialization.js');
});

client.on(Events.GuildCreate, (guild) => {
    console.log(`The bot has joined the guild: ${guild.name} (ID: ${guild.id})`);
    require('./bot/initialization.js');
});