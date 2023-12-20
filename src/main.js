const { app, BrowserWindow, ipcMain, dialog, shell,
    Tray,
    nativeImage,
    Menu,
} = require('electron');
const path = require('path');
const { screen } = require('electron');
const { autoUpdater } = require("electron-updater");
const is = require('electron-is')
const log = require('electron-log');
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting... ');

/** @type BrowserWindow */
let mainWindow;

if (is.dev()) {
    require('../electron-reload')([path.join(__dirname, '../src'), path.join(__dirname, '../src'), path.join(__dirname, '../'),]);
}

function createTray() {

    // eslint-disable-next-line no-undef
    const icon = nativeImage.createFromPath(path.join(__dirname, 'public/imgs/icons.png'));
    appIcon = new Tray(icon);
    var contextMenu = Menu.buildFromTemplate([{
        label: 'Afficher',
        click: function () {
            mainWindow.show();
        }
    },
    {
        label: 'Site web',
        click: function () {
            mainWindow.show();
            shell.openExternal("https://dah-kenangnon.com");
        }
    },
    ]);
    appIcon.setToolTip('QrCodOffice');
    appIcon.setContextMenu(contextMenu);
}




function createWindow() {

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    mainWindow = new BrowserWindow({
        width: width - width * 0.3,
        height: height ,
        maxWidth: width - width * 0.3,
        maxHeight: height - height * 0.3,
        minHeight: height - height * 0.4,
        minWidth: width - width * 0.4,
        autoHideMenuBar: true,
        backgroundColor: "#F1ECEC",
        center: true,
        show: false,
        ELECTRON_ENABLE_SECURITY_WARNINGS: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(
                __dirname,
                "preload.js"
            )
        }
    })

    mainWindow.setIcon(path.join(__dirname, 'public/imgs/icons.png'));
    mainWindow.loadFile(path.join(__dirname, 'public/index.html'));

    mainWindow.once('ready-to-show', () => {
        createTray();
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.show();
    mainWindow.focus();

    // Handle IPC event for opening dialog
    ipcMain.handle('open-directory-dialog', async () => {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        return filePaths;
    });

    // Handle IPC event for showing error dialog
    ipcMain.on('show-error-box', (event, err) => {
        dialog.showErrorBox('Error', err.message);
    });

    // Handle IPC event for showing success dialog
    ipcMain.on('show-success-box', (event, filePath) => {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Vos QR Codes sont generés avec succès',
            message: `Veuillez consulter le dossier: ${filePath}`
        });
    });

    // Handle IPC event for opening a link in the default browser
    ipcMain.on('open-link', (event, link) => {
        shell.openExternal(link);
    });
}


app.whenReady().then(async () => {
    createWindow();
    app.on('activate', async function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    // TODO: Do some cleanup and anything else here before quitting
});


// Don't forget to unregister the shortcut when the app is about to quit
app.on('will-quit', () => {
});


function logAutoUpdateInfo(text) {
    log.info(text);
}


app.on('ready', function () {
    logAutoUpdateInfo('App ready, checking for updates...');

    // Check for updates immediately
    autoUpdater.checkForUpdatesAndNotify();

    // Set up a timer to check for updates every 20 minutes
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 1000 * 60 * 5);
});


autoUpdater.on('checking-for-update', () => {
    logAutoUpdateInfo('Checking for update...');

})
autoUpdater.on('update-available', (info) => {
    logAutoUpdateInfo('Update available.');
    log.info(info);

})
autoUpdater.on('update-not-available', (info) => {
    logAutoUpdateInfo('Update not available.');
    log.info(info);
})

autoUpdater.on('error', (err) => {
    console.log(err);
    logAutoUpdateInfo(err);
    if (is.dev) {
        logAutoUpdateInfo(err);
    } else if (is.production) {
        logAutoUpdateInfo('Error in auto-updater. ');
    }
})


autoUpdater.on('download-progress', (progressObj) => {
    logAutoUpdateInfo('Update is downloading');
    if (is.dev) {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        logAutoUpdateInfo(log_message);
    } else if (is.production) {
        mainWindow.webContents.send('download-progress', progressObj);
    }
})

autoUpdater.on('update-downloaded', (info) => {
    logAutoUpdateInfo('Update downloaded');
    log.info(info);
    const dialogOpts = {
        type: 'info',
        buttons: ['Mettre à jour maintenant', 'Plus tard'],
        title: 'Mise à jour QrCodOffice',
        message: "Mise à jour QrCodOffice ( V" + info.version + ") disponible.",
        detail: "La version " + info.version + " est disponible et déjà téléchargé, redémarrer l'application pour appliquer les mise à jour."
    }

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall(true, true);
    })
});