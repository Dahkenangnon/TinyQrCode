const qrcode = require('qrcode');
const { ipcRenderer } = require('electron');
const path = require('path');

function generateEffectiveContent(contentPattern, contentPlaceholder) {
    // Check if contentPlaceholder is empty
    if (!contentPlaceholder) {
        return [];
    }

    // Split contentPlaceholder into groups
    const placeholderGroups = contentPlaceholder.split('\n');

    // Extract placeholders from contentPattern
    const patternPlaceholders = contentPattern.match(/\{[^}]+\}/g) || [];

    // Generate effective content for each group
    return placeholderGroups.map(group => {
        const values = group.split(' ');

        // Check if the number of values matches the number of placeholders
        if (values.length !== patternPlaceholders.length) {
            //return null; // or throw an error, depending on the desired behavior
           // throw new Error(`Le nombre de valeurs ne correspond pas au nombre de placeholders`);
            ipcRenderer.send('show-error-box', "Le nombre de valeurs ne correspond pas au nombre de placeholders");
            return;
        }

        // Replace each placeholder with the corresponding value
        return patternPlaceholders.reduce((currentContent, placeholder, index) => {
            return currentContent.replace(placeholder, values[index]);
        }, contentPattern);
    }).filter(content => content !== null); // Filter out any null values (groups with mismatched placeholders)
}

document.addEventListener('DOMContentLoaded', () => {
    let links = document.getElementsByClassName('externalLink');

    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener('click', (event) => {
            event.preventDefault();
            ipcRenderer.send('open-link', links[i].href);
        });
    }

    document.getElementById('generateBtn').addEventListener('click', async () => {
        let textAreaContent = document.getElementById('cardUids').value;
        let indexStart = document.getElementById('startNumber').value || 0;
        let urlPattern = document.getElementById('urlPattern').value;

        let cardUids = textAreaContent.split('\n');
        let errorMessages = [];

        const contentPattern = urlPattern;
        const contentPlaceholder = textAreaContent;
        const effectiveContents = generateEffectiveContent(contentPattern, contentPlaceholder);

        if(effectiveContents.length === 0) {
            return;
        }

        let filePaths = await ipcRenderer.invoke('open-directory-dialog');
        if (filePaths && filePaths.length > 0) {
            let saveDirectory = filePaths[0];

            effectiveContents.forEach((data, index) => {

                let filename = `${index + Number(indexStart)}.png`;
                let filePath = path.join(saveDirectory, filename);

                qrcode.toFile(filePath, data, (err) => {
                    if (err) {
                        errorMessages.push(`Error in QR Code #${index + 1}: ${err.message}`);
                        console.error(err);
                    }
                });
            });

            if (errorMessages.length > 0) {
                ipcRenderer.send('show-error-box', "Une erreur est survenue lors de la génération des QR codes:\n" + errorMessages.join('\n'));
            } else {
                ipcRenderer.send('show-success-box', `QR Codes saved to ${saveDirectory}`);
            }
        }
    });
});
