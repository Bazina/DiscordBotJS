const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.activity.readonly'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @param newFileId
 */
async function buildNotificationMessage(authClient, newFileId) {
    const drive = google.drive({version: 'v3', auth: authClient});
    let fileParentsNames = [];
    let message = "";

    const fileMetaData = await drive.files.get({
        fileId: newFileId,
        fields: "id, name, mimeType, parents, webViewLink, iconLink, thumbnailLink"
    });

    if (fileMetaData.data.parents.length === 0)
        return fileMetaData.data;

    let fileParentId = fileMetaData.data.parents[0];

    while (true) {
        const parentMetaData = await drive.files.get({
            fileId: fileParentId,
            fields: "id, name, parents"
        });

        const regex = /([0-9][a-z]+\s\w+)/g;
        let parentName = parentMetaData.data.name;

        if (regex.test(parentName) || parentName === "My Drive" || fileParentsNames.length > 5)
            break;
        else {
            fileParentsNames.push(parentName);
            fileParentId = parentMetaData.data.parents[0];
        }
    }

    message = fileMetaData.data;
    message['directory'] = fileParentsNames.reverse().join(" -> ");

    return message;
}

async function getCourseMetaDataInSpecificFoldersInDrive(authClient, driveId) {
    const drive = google.drive({version: 'v3', auth: authClient});

    let courseMetaData = [];
    let foldersMetaDataStack = [];

    const parentMetaData = await drive.files.get({
        fileId: driveId,
        fields: "id, name, parents, webViewLink"
    });

    foldersMetaDataStack.push(parentMetaData.data);

    while (foldersMetaDataStack.length) {
        let folderMetaData = foldersMetaDataStack.pop();
        let regex = /([0-9][a-z]+\s\w+)/g;
        const folderChildren = await drive.files.list({
            q: `'${folderMetaData.id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false and name != 'Exams'`,
            fields: "files(id, name, mimeType, webViewLink)"
        });

        if (regex.test(folderMetaData.name)) {
            folderChildren.data.files.forEach((file) => {
                courseMetaData.push({'name': file.name, 'id': file.id});
            });
        } else {
            folderChildren.data.files.forEach((file) => {
                if (file.mimeType === "application/vnd.google-apps.folder")
                    foldersMetaDataStack.push(file);
            })
        }
    }

    courseMetaData = courseMetaData.map(({id: value, ...rest}) => ({value, ...rest}));

    return courseMetaData;
}

async function getFoldersMetaDataInFolder(authClient, folderId) {
    const drive = google.drive({version: 'v3', auth: authClient});

    const folderChildren = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "files(id, name, mimeType, webViewLink)"
    });

    folderChildren.data.files.sort((a, b) => {
        if (a.mimeType === b.mimeType)
            return a.name.localeCompare(b.name);
        else if (a.mimeType === "application/vnd.google-apps.folder")
            return -1;
        else
            return 1;
    });

    return folderChildren.data.files;
}

async function getFolderMetaDataById(authClient, folderId) {
    const drive = google.drive({version: 'v3', auth: authClient});

    const folderMetaData = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, webViewLink"
    });

    return folderMetaData.data;
}

async function pullChanges(authClient, driveId, timestamp) {
    pullChangesWithLimit(authClient,driveId,timestamp,10);
}
async function pullChangesWithLimit(authClient, driveId, timestamp, pageSize) {
    // const drive = google.drive({version: 'v3', auth: authClient});
    const driveActivity = await google.driveactivity({version: 'v2', auth: authClient});

    return await driveActivity.activity.query({
        requestBody: {
            ancestorName: `items/${driveId}`,
            pageSize: pageSize,
            filter: `time >= "${timestamp}" detail.action_detail_case:CREATE`
        }
    });
}

module.exports = {
    authorize,
    buildNotificationMessage,
    getCourseMetaDataInSpecificFoldersInDrive,
    getFoldersMetaDataInFolder,
    getFolderMetaDataById,
    pullChanges,
    pullChangesWithLimit
};