const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.activity.readonly'];

const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
let HOME_DIR;

/**
 * Reads previously authorized credentials from the save file.
 * @return {Promise<OAuth2Client|null>} - An OAuth2 client with credentials if found, null otherwise.
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
 * @param {OAuth2Client} client - The OAuth2 client to save credentials for.
 * @return {Promise<void>} - void.
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
 * @return {Promise<OAuth2Client>} - An authorized OAuth2 client.
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
 * Get recent files from drive.
 * @param authClient - authorized OAuth2 client.
 * @param number - number of recent files.
 * @returns {Promise<drive_v3.Schema$File[]>} - recent files metadata.
 */
async function getRecentFiles(authClient, number) {
    const drive = google.drive({version: 'v3', auth: authClient});

    try {
        // Await the result of drive.files.list
        const response = await drive.files.list({
            pageSize: number,
            fields: 'files(id, name, mimeType, parents, webViewLink, iconLink, thumbnailLink, shortcutDetails)',
            orderBy: 'recency',
            q: `trashed = false and mimeType != 'application/vnd.google-apps.folder'`
        });

        let files = response.data.files;

        // call buildNotificationMessage for each file in files and return the result
        // use Promise.all to wait for all promises to resolve
        files = await Promise.all(files.map(async (file) => {
            return await buildNotificationMessage(authClient, file.id);
        }));

        return files;
    } catch (error) {
        // Handle any errors here
        console.error('Error fetching recent files:', error);
        throw error; // You may want to handle or log the error appropriately
    }
}


/**
 * Build real link if shortcut.
 * @param fileMetaData - file metadata from Google Drive.
 * @returns {*} - file metadata.
 */
function buildRealLinkIfShortcut(fileMetaData) {
    if (fileMetaData.data.mimeType === "application/vnd.google-apps.shortcut") {
        if (fileMetaData.data.shortcutDetails.targetMimeType === "application/vnd.google-apps.folder") {
            fileMetaData.data.webViewLink = fileMetaData.data.webViewLink.replace("file/", "folder/");
            fileMetaData.data.webViewLink = fileMetaData.data.webViewLink.replace(fileMetaData.data.id, fileMetaData.data.shortcutDetails.targetId);
            fileMetaData.data.iconLink = 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.google-apps.folder'
        } else {
            fileMetaData.data.webViewLink = fileMetaData.data.webViewLink.replace(fileMetaData.data.id, fileMetaData.data.shortcutDetails.targetId);
        }

        fileMetaData.data.mimeType = fileMetaData.data.shortcutDetails.targetMimeType;
        fileMetaData.data.id = fileMetaData.data.shortcutDetails.targetId;
    }

    return fileMetaData.data;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient - An authorized OAuth2 client.
 * @param newFileId
 * @returns {Promise<drive_v3.Schema$File>} - file metadata.
 */
async function buildNotificationMessage(authClient, newFileId) {
    const drive = google.drive({version: 'v3', auth: authClient});
    let message = "";

    const fileMetaData = await drive.files.get({
        fileId: newFileId,
        fields: "id, name, mimeType, parents, webViewLink, iconLink, thumbnailLink, shortcutDetails"
    });

    if (fileMetaData.data.parents.length === 0)
        return fileMetaData.data;

    let fileParentsNames = [];
    let fileParentId = fileMetaData.data.parents[0];

    while (true) {
        const parentMetaData = await drive.files.get({
            fileId: fileParentId,
            fields: "id, name, parents"
        });

        const regex = /([0-9][a-z]+\s\w+)/g;
        let parentName = parentMetaData.data.name;

        if (!parentMetaData.data.parents || regex.test(parentName) || parentName === HOME_DIR)
            break;
        else if (parentMetaData.data.parents && (regex.test(parentName) || parentName === HOME_DIR)) {
            if (fileParentsNames.length === 0)
                fileParentsNames.push(parentName);
            break;
        } else {
            fileParentsNames.push(parentName);
            fileParentId = parentMetaData.data.parents[0];
        }
    }

    if (fileMetaData.data.shortcutDetails)
        fileMetaData.data = buildRealLinkIfShortcut(fileMetaData);

    message = fileMetaData.data;
    message['directory'] = fileParentsNames.reverse().join(" -> ");

    return message;
}

/**
 * Get all courses metadata in specific folders in drive.
 * @param authClient - authorized OAuth2 client.
 * @param driveId - drive id.
 * @returns {Promise<(*&{value: *})[]>} - courses metadata.
 */
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

/**
 * Get all folders metadata in specific folder.
 * @param authClient - authorized OAuth2 client.
 * @param folderId - folder id.
 * @returns {Promise<drive_v3.Schema$File[]>} - folders metadata.
 */
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

/**
 * Get metadata of file by id.
 * @param authClient - authorized OAuth2 client.
 * @param folderId - file id.
 * @returns {Promise<drive_v3.Schema$File>} - file metadata.
 */
async function getMetaDataById(authClient, folderId) {
    const drive = google.drive({version: 'v3', auth: authClient});

    try {
        const folderMetaData = await drive.files.get({
            fileId: folderId,
            fields: "id, name, mimeType, webViewLink, trashed"
        });

        return folderMetaData.data;
    } catch (err) {
        console.log(err);
        throw err;
    }
}

/**
 * Pull changes from drive.
 * @param authClient - authorized OAuth2 client.
 * @param driveId - drive id.
 * @param timestamp - timestamp.
 * @returns {GaxiosPromise<Schema$QueryDriveActivityResponse>} - changes.
 */
async function pullCreatedChanges(authClient, driveId, timestamp) {
    return pullCreatedChangesWithLimit(authClient, driveId, timestamp, 10);
}

/**
 * Pull changes from drive.
 * @param authClient - authorized OAuth2 client.
 * @param driveId - drive id.
 * @param timestamp - timestamp.
 * @returns {GaxiosPromise<Schema$QueryDriveActivityResponse>} - changes.
 */
async function pullAllChanges(authClient, driveId, timestamp) {
    return pullAllChangesWithLimit(authClient, driveId, timestamp, 10);
}

/**
 * Pull changes from drive with limit on number of changes.
 * @param authClient - authorized OAuth2 client.
 * @param driveId - drive id.
 * @param timestamp - timestamp.
 * @param pageSize - number of changes.
 * @returns {GaxiosPromise<Schema$QueryDriveActivityResponse>} - changes.
 */
async function pullCreatedChangesWithLimit(authClient, driveId, timestamp, pageSize) {
    const driveActivity = await google.driveactivity({version: 'v2', auth: authClient});

    return driveActivity.activity.query({
        requestBody: {
            ancestorName: `items/${driveId}`,
            pageSize: pageSize,
            filter: `time >= "${timestamp}" detail.action_detail_case:CREATE`
        }
    });
}

/**
 * Pull changes from drive with limit on number of changes.
 * @param authClient - authorized OAuth2 client.
 * @param driveId - drive id.
 * @param timestamp - timestamp.
 * @param pageSize - number of changes.
 * @returns {GaxiosPromise<Schema$QueryDriveActivityResponse>} - changes.
 */
async function pullAllChangesWithLimit(authClient, driveId, timestamp, pageSize) {
    const driveActivity = await google.driveactivity({version: 'v2', auth: authClient});

    return driveActivity.activity.query({
        requestBody: {
            ancestorName: `items/${driveId}`,
            pageSize: pageSize,
            filter: `time >= "${timestamp}" detail.action_detail_case:(CREATE DELETE RENAME MOVE EDIT RESTORE)`
        }
    });
}


/**
 * Create token.json locally.
 * @returns {Promise<void>} - void.
 */
async function createTokenLocally() {
    authorize().then(async (driveClient) => {
        const drive = google.drive({version: 'v3', auth: driveClient});

        const homeMetaData = await drive.files.get({
            fileId: DRIVE_ID,
            fields: "name"
        });

        HOME_DIR = homeMetaData.data.name;
    });
}

(async () => {
    await createTokenLocally();
})();

module.exports = {
    authorize,
    buildNotificationMessage,
    getCourseMetaDataInSpecificFoldersInDrive,
    getFoldersMetaDataInFolder,
    getMetaDataById,
    pullCreatedChanges,
    pullAllChanges,
    getRecentFiles,
};