// <!-- WRITING PROGRESS BAR -->

// Automatically sync progress percentages with CSS custom properties
function updateBookProgress() {
    // Large book covers
    document.querySelectorAll('.book-cover-progress').forEach(element => {
        const progress = element.getAttribute('data-progress');
        const container = element.closest('.book-cover-container');
        container.style.setProperty('--progress-height', `${progress}%`);
        
        // Update marker position and text
        const marker = container.querySelector('.progress-marker');
        if (marker) {
            marker.style.bottom = `${progress}%`;
            const percentText = marker.querySelector('.progress-percentage-overlay');
            if (percentText) percentText.textContent = `${progress}%`;
        }
    });
    
    // Small book covers
    document.querySelectorAll('.book-cover-progress-small').forEach(element => {
        const progress = element.getAttribute('data-progress');
        const container = element.closest('.book-cover-container-small');
        container.style.setProperty('--progress-height', `${progress}%`);
        
        // Update marker position and text
        const marker = container.querySelector('.progress-marker-small');
        if (marker) {
            marker.style.bottom = `${progress}%`;
            const percentText = marker.querySelector('.progress-percentage-small');
            if (percentText) percentText.textContent = `${progress}%`;
        }
    });
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateBookProgress);
