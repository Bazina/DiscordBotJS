const {Client, GatewayIntentBits} = require('discord.js');

const Database = require("@replit/database")

global.token = process.env['token'];
global.CLIENT_ID = process.env['client_id'];
global.DRIVE_ID = process.env['drive_id'];
global.ZAPIER_CHANNEL_ID = process.env['zapierChannelID'];
global.DIVE_IN_DRIVE_CHANNEL_ID = process.env['diveInDriveChannelID'];
global.DIVE_WITH_DIVE_CHANNEL_ID = process.env['diveWithDiveChannelID'];


global.db = new Database()
global.dbIndices = {
    name: 0,
    mimeType: 1,
    webViewLink: 2,
    directory: 3,
};


global.client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


client.once('ready', () => {
    global.GUILD_ID = client.guilds.cache.first().id;
});

client.on('guildCreate', (guild) => {
    console.log(`The bot has joined the guild: ${guild.name} (ID: ${guild.id})`);

    require('./initialization.js');
});
