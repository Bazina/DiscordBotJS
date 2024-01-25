# Discord Bot with Google Drive Integration - Code Documentation

This document provides an overview and documentation for the codebase of the Discord bot with Google Drive integration. The bot is designed to interact with Discord and Google Drive, providing users with information about recent files and course data.

## Table of Contents

1. [File Structure](#file-structure)
2. [Bot Setup](#bot-setup)
3. [Helper Functions](#helper-functions)
4. [Initialization](#initialization)
5. [Interactions](#interactions)
6. [Google Drive Handling](#google-drive-handling)
7. [Globals](#globals)
8. [Server Setup](#server-setup)

## File Structure

- **bot_setup.js:** Main file responsible for setting up the Discord bot, handling Discord events, and integrating with Google Drive.

- **helper_functions.js:** Contains various helper functions used in `bot_setup.js` for managing recent files, handling interactions, and interacting with the Google Drive API.

- **initialization.js:** Sets up Discord bot commands (/recent and /get) and registers them with the Discord API. Utilizes the Discord APIs REST functionality and Google Drive API for obtaining course metadata.

- **interactions.js:** Listens for interactions with the Discord bot, specifically command interactions (/get and /recent). Calls corresponding functions from `helper_functions.js` to handle these interactions.

- **drive.js:** Handles interactions with the Google Drive API. Implements functions for authentication, building notification messages, getting course metadata, getting folders metadata, getting metadata by file ID, and pulling changes from Google Drive.

- **globals.js:** Sets global variables, including Discord bot token, client ID, Google Drive ID, and channel IDs. Creates a Discord bot client with specified intents.

- **server.js:** Implements a basic Express server for keeping the bot alive. Listens on the root endpoint ("/") and responds with a message to indicate that the bot is running.

- **index.js:** Requires the `globals.js` file and sets up the Discord bot and global variables.

## Bot Setup

- `client.on(Events.ClientReady, ...)` Listens for the bot's readiness event and initializes recent files when the bot starts.

- `client.on(Events.InteractionCreate, ...)` Listens for interactions with the Discord bot and calls corresponding functions based on the command used.

## Helper Functions

- **loopOverChanges(changedFiles, callTimeStamps):** Loops over the changes in Google Drive and notifies the Discord channel about new changes.

- **replyWithCourseData(interaction):** Replies with course data, including folders and files in a specified course.

- **replyWithRecentFiles(interaction):** Replies with information about the most recent files.'

- **Pull changes** every 3 minutes.

## Initialization

- **initialization.js:** Sets up Discord bot commands (/recent and /get) and registers them with the Discord API using REST functionality. Retrieves course metadata from Google Drive.

## Interactions

- `client.on(Events.InteractionCreate, ...)` Listens for interactions with the Discord bot, specifically command interactions (/get and /recent). Calls corresponding functions from `helper_functions.js` to handle these interactions.

## Google Drive Handling

- **drive.js:** Handles interactions with the Google Drive API, including authentication, pulling changes, building notification messages, and getting metadata.

## Globals

- **globals.js:** Sets global variables, including Discord bot token, client ID, Google Drive ID, and channel IDs. Creates a Discord bot client with specified intents.

## Server Setup

- **server.js:** Implements a basic Express server for keeping the bot alive. Listens on the root endpoint ("/") and responds with a message to indicate that the bot is running.

This documentation provides a high-level overview of the codebase structure and the functionality of each module in the Discord bot with Google Drive integration. For detailed information, refer to the individual code files and their corresponding comments.
