# Discord Bot with Google Drive Integration

This Discord bot is designed to provide users with information about recent files in a connected Google Drive. It utilizes the Discord.js library for Discord integration and the Google Drive API for accessing drive-related data.

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Discord Setup](#discord-setup)
6. [Google Drive Setup](#google-drive-setup)
7. [Render Setup](#render-setup)
8. [Local Usage](#local-usage)
9. [Commands](#commands)
10. [Recommended Video Tutorials](#recommended-video-tutorials)
11. [Contributing](#contributing)

## Introduction

This Discord bot enhances collaboration by providing real-time notifications about new files in a specified Google Drive. Users can interact with the bot to get information about recent files, course data, and more.

## Features

- Real-time notifications about new files in Google Drive (automated).
- Retrieve information about recent files `(/recent <number>)`.
- Get a list of files in a specific course folder `(/get <course>)`.

> **Note**
> 
> Take a look at [Code Documentation](https://github.com/Bazina/DiscordBotJS/blob/master/Code%20Documentation.md)

## Prerequisites

Before using this bot, ensure you have the following

- [Node.js](https://nodejs.org/) installed.
- Google Cloud Project with the Google Drive API enabled.
- Discord Bot Token obtained from the Discord Developer Portal.

## Installation

1. Clone this repository

   ```bash
   git clone https://github.com/Bazina/DiscordBotJS.git
   ```

2. Install dependencies

   ```bash
   cd DiscordBotJS
   npm install
   ```

## Discord Setup

A recommended video tutorial for setting up the Discord bot can be found [here](https://youtu.be/KZ3tIGHU314?list=PLpmb-7WxPhe0ZVpH9pxT5MtC4heqej8Es) or [here](https://youtu.be/7rU_KyudGBY).

1. Create a new application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Obtain the Bot Token and Client ID from the created application.
3. Invite the bot to your Discord server.
4. Create channel(s) (notifyDriveChannel, diveWithDriveChannel) for the bot

> **Notes**
> - The bot will not work until you have completed all the following steps.
> - Notify Drive Channel is the channel where the bot will send notifications about new files in Google Drive.
> - Dive With Drive Channel is the channel where users can interact with the bot to get information about recent files and course data.

## Google Drive Setup
Here is a [video](https://youtu.be/ifw3b4Uf06g) that walks through the setup process.

1. [Set up a Google Cloud Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects) and enable the Google Drive API.
2. Create a OAuth consent screen (web application) and add the following scopes

   - `https://www.googleapis.com/auth/drive.activity.readonly'`
   - `https://www.googleapis.com/auth/drive.readonly`
3. Put the server domain in the Authorized Domains section.
4. Create a OAuth 2.0 Client ID and download the credentials file (you can leave the Authorized JavaScript origins blank).
5. Download the credentials file and rename it to `credentials.json`.
6. Run the `drive.js` file using **locally** `node drive.js` and follow the instructions to authenticate with Google Drive,`token.json` will be created in the same directory as `drive.js`.

> **Note**
> - Step 6 is for authentication purposes only, you will not need to run the `drive.js` file again.

## Render Setup

Here is the link to the [Render](https://dashboard.render.com/) website where you can host your bot (as a node.js project).

1. Create Repository and link it to your GitHub repository.
2. Create new web service and select `Build and deploy from a Git repository`.
3. Connect to your GitHub repository and select the branch you want to deploy.
4. Select Frankfurt as the region.
5. Set the build command to `npm install` and the start command to `node index.js`.
6. Add Environment Variables `client_id, token, notifyDriveChannelID, diveWithDriveChannelID, drive_id`, All of these can be found in the `globals.js` file and all belong to discord except for `drive_id` which is the ID of the Google Drive you want to connect to.
7. Add Secret Files `credentials.json` and `token.json`. These files are used to authenticate with the Google Drive API.

> **Important Note**
>
> - The `drive_id` is the last part of the URL of the Google Drive folder. For example, if the URL is `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j`, the `drive_id` is `1a2b3c4d5e6f7g8h9i0j`.
> 
> - Render will only be up for 15 minutes if there are no requests to the server.
>
> - To keep the server alive, you can use [UptimeRobot](https://uptimerobot.com/) to send requests to the server every 5 minutes.
>
> - [UptimeRobot Tutorial](https://youtu.be/7rU_KyudGBY?t=3306&si=QrwxbYPFdHEVFgK7), you can skip to 55:06.
> 
> - From dashboard open your project then in the top left corner under the project name you can find the server URL.

## Local Usage

1. Run the bot

   ```bash
   node index.js
   ```

2. Interact with the bot using the specified slash commands.

## Commands

- `/recent <number>` Get information about the most recent files (limited to a specified number).
- `/get <course>` Retrieve a list of files in a specific course folder.

## Recommended Video Tutorials

Some playlists for discord bot development v14 can be found [here](https://youtube.com/playlist?list=PL_cUvD4qzbkwA7WITceoc2_FFjQsBkwX7&si=Kt1GhwC4Xfg2FYAQ), [here](https://youtube.com/playlist?list=PLRqwX-V7Uu6avBYxeBSwF48YhAnSn_sA4&si=-Q-AcAmqqTnoYHfI), and [here](https://youtube.com/playlist?list=PLpmb-7WxPhe0ZVpH9pxT5MtC4heqej8Es&si=Aezy6k-7nCEt1XGI).

## Contributing

Contributions are welcomed! Fork the repository, make changes, and submit a pull request.
