// This script runs before the main module script below.
if (!sessionStorage.getItem('sessionStarted')) {
    sessionStorage.setItem('sessionStarted', 'true');
    if (window.location.pathname.includes('chat.html')) {
         window.location.replace('./main.html');
    }
}
