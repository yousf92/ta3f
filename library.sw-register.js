// --- START: Added Spinner Functions ---
function showSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.add('show');
    }
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner-overlay');
    if (spinner) {
        spinner.classList.remove('show');
    }
}
// --- END: Added Spinner Functions ---

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully.');
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
