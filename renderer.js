const { ipcRenderer } = require('electron');
const { print, getPrinters } = require('pdf-to-printer');
const fs = require('fs');
const https = require('https');
const path = require('path');
const os = require('os');

const dropZone = document.getElementById('dropZone');
let selectedFilePath = '';

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        selectedFilePath = files[0].path;
        document.getElementById('selectedFile').textContent = `Selected file: ${selectedFilePath}`;
    }
});

dropZone.addEventListener('click', async () => {
    const { dialog } = require('electron').remote;
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        selectedFilePath = result.filePaths[0];
        document.getElementById('selectedFile').textContent = `Selected file: ${selectedFilePath}`;
    }
});

document.getElementById('printPdf').addEventListener('click', async () => {
    if (!selectedFilePath) {
        document.getElementById('status').textContent = 'Please select a PDF file first.';
        return;
    }

    try {
        await printPdf(selectedFilePath);
        document.getElementById('status').textContent = 'Printing successful';
    } catch (error) {
        document.getElementById('status').textContent = `Printing failed: ${error.message}`;
    }
});

document.getElementById('fetchAndPrintPdf').addEventListener('click', async () => {
    const url = document.getElementById('pdfUrl').value;
    if (!url) {
        document.getElementById('status').textContent = 'Please enter a PDF URL.';
        return;
    }

    try {
        const tempFilePath = await downloadPdf(url);
        await printPdf(tempFilePath);
        fs.unlinkSync(tempFilePath); // Delete the temporary file
        document.getElementById('status').textContent = 'PDF fetched and printed successfully.';
    } catch (error) {
        document.getElementById('status').textContent = `Failed to fetch and print PDF: ${error.message}`;
    }
});

function downloadPdf(url) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
        const file = fs.createWriteStream(tempFilePath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to fetch PDF: ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(tempFilePath);
            });
        }).on('error', (err) => {
            fs.unlinkSync(tempFilePath);
            reject(err);
        });
    });
}

async function printPdf(filePath) {
    const options = {
        printer: document.getElementById('printerSelect').value,
        pages: document.getElementById('pages').value || undefined,
        monochrome: document.getElementById('colorMode').value === 'monochrome',
        orientation: document.getElementById('orientation').value || undefined,
        scale: "noscale",
        copies: parseInt(document.getElementById('copies').value),
        side: document.getElementById('duplex').value
    };

    await print(filePath, options);
}

async function populatePrinters() {
    try {
        const availablePrinters = await getPrinters();
        const select = document.getElementById('printerSelect');
        availablePrinters.forEach(printer => {
            const option = document.createElement('option');
            option.value = printer.name;
            option.textContent = printer.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to get printers:', error);
    }
}

populatePrinters();