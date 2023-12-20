const qrcode = require('qrcode');
const { ipcRenderer } = require('electron');
const path = require('path');


document.addEventListener('DOMContentLoaded', () => {
    let authorLink = document.getElementById('authorLink');
    authorLink.addEventListener('click', (event) => {
        event.preventDefault();
        ipcRenderer.send('open-link', authorLink.href);
    });

    document.getElementById('generateBtn').addEventListener('click', async () => {
        let textAreaContent = document.getElementById('cardUids').value;
        let indexStart = document.getElementById('startNumber').value || 0;
        let urlPattern = document.getElementById('urlPattern').value;
        let cardUids = textAreaContent.split('\n');
        let filePaths = await ipcRenderer.invoke('open-directory-dialog');
        let errorMessages = [];


        if (filePaths && filePaths.length > 0) {
            let saveDirectory = filePaths[0];
            // Now use 'saveDirectory' for saving QR codes

            cardUids.forEach((uid, index) => {
                let filename = `${index + Number(indexStart)}_${uid}.png`;
                let url = urlPattern.replace('{uid}', uid);
                let filePath = path.join(saveDirectory, filename);

                qrcode.toFile(filePath, url, (err) => {
                    if (err) {
                        errorMessages.push(err.message);
                        console.error(err)
                    }
                });
            });

            if (errorMessages.length > 0) {
                ipcRenderer.send('show-error-box', "Une erreur est survenue lors de la génération des QR codes.");
            } else {
                ipcRenderer.send('show-success-box', saveDirectory);
            }
        }
    });
});