// Instagram Deep Linking Fix

// Works for any username passed to the function
function openInstagram(username) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const webUrl = `https://www.instagram.com/${username}`;

    if (isMobile) {
        // Try deep link first
        const appUrl = `instagram://user?username=${username}`;

        // Record start time
        const start = new Date().getTime();

        // Attempt to open app
        window.location.href = appUrl;

        // Fallback to web if app doesn't open within 500ms
        setTimeout(() => {
            const end = new Date().getTime();
            // If time elapsed is reasonably close to timeout, user probably wasn't switched to app
            if (end - start < 1500) {
                window.location.href = webUrl;
            }
        }, 500);
    } else {
        // Desktop - just open web logic in new tab
        window.open(webUrl, '_blank');
    }
}

// Make function available globally
window.openInstagram = openInstagram;
