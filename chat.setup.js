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

// This script runs before the main module script below.
if (!sessionStorage.getItem('sessionStarted')) {
    sessionStorage.setItem('sessionStarted', 'true');
    if (window.location.pathname.includes('chat.html')) {
         window.location.replace('./main.html');
    }
}
