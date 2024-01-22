const {REST} = require('@discordjs/rest');
const {authorize, getCourseMetaDataInSpecificFoldersInDrive} = require("../drive");
const {ApplicationCommandOptionType, Routes} = require("discord-api-types/v10");

let choices = [];

const rest = new REST({version: '10'}).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await authorize().then(async (driveClient) => {
            choices = await getCourseMetaDataInSpecificFoldersInDrive(driveClient, DRIVE_ID);
        });

        const commands = [
            {
                name: 'recent',
                description: 'Reply with recent file uploaded',
                options: [{
                    name: 'number',
                    description: 'integer how many recently uploaded files needed (max 21)',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                }],
            },
            {
                name: 'get',
                description: 'Reply with list of files in a Course folder',
                options: [{
                    name: 'course',
                    description: 'Course name',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: choices.slice(Math.max(-25, -choices.length)).reverse()
                }]
            }
        ];

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            {body: commands},
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
