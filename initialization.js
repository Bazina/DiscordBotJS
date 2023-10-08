const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const {PermissionsBitField} = require('discord.js');
const {authorize, getCourseMetaDataInSpecificFoldersInDrive} = require("./drive");

//list the valid permissions
const validPermissions = Object.keys(PermissionsBitField.Flags).slice(0, 25);
let choices = [];

const rest = new REST({version: '9'}).setToken(token);

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
                    description: 'integer how many recently uploaded files needed (max 20)',
                    type: 4,
                    required: true,
                }],
            },
            {
                name: 'edit_permissions',
                description: 'Modify bot access',
                options: [
                    {
                        name: 'add_remove',
                        description: 'Please type "add" or "remove" only',
                        type: 3,
                        required: true,
                        choices: [
                            {
                                name: 'Add',
                                value: 'add',
                            },
                            {
                                name: 'Remove',
                                value: 'remove',
                            },
                        ],
                    },
                    {
                        name: 'permission',
                        description: 'Please type the permission you want to add/remove',
                        type: 3,
                        required: true,
                        choices: validPermissions.map((permission) => ({
                            name: permission,
                            value: permission,
                        })),
                    },
                ],
            },
            {
                name: 'get',
                description: 'Reply with list of files in a Course folder',
                options: [{
                    name: 'course',
                    description: 'Course name',
                    type: 3,
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
