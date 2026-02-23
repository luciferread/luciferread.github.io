// <!-- NASA Astronomy Picture of the Day (APOD) Integration -->

async function fetchTransmission() {
    const loading = document.getElementById('nasa-loading');
    const card = document.getElementById('nasa-transmission');
    const img = document.getElementById('nasa-image');
    const videoContainer = document.getElementById('nasa-video-container');
    const videoFrame = document.getElementById('nasa-video');
    const copyrightEl = document.getElementById('nasa-copyright');

    try {
        // Using the user's personal NASA API key
        const response = await fetch('https://api.nasa.gov/planetary/apod?api_key=idnQSUVorcc9PskcWyfc4WgZUKXbrDke2UCwMeoZ');

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('RATE_LIMIT_EXCEEDED');
            }
            throw new Error('NETWORK_ERROR');
        }

        const data = await response.json();

        // Validate data presence
        if (!data || !data.title) {
            throw new Error('INVALID_DATA');
        }

        let explanation = data.explanation;
        // Sanitize: NASA often appends promotional links like "Jigsaw Galaxy" or "Astronomy Puzzle" to the end.
        // We trim these to keep the focus on the actual astronomical fact.
        const promoPhrases = ['Jigsaw Galaxy', 'Jigsaw Nebula', 'Astronomy Puzzle', 'Sky Movie', 'Sky Surprise'];
        for (const phrase of promoPhrases) {
            const index = explanation.indexOf(phrase);
            if (index !== -1) {
                explanation = explanation.substring(0, index).trim();
            }
        }

        document.getElementById('nasa-title').innerText = data.title;
        document.getElementById('nasa-explanation').innerText = explanation;
        document.getElementById('nasa-date').innerText = 'STARDATE: ' + data.date;

        // Handle Copyright if provided
        if (data.copyright) {
            copyrightEl.innerText = '© ' + data.copyright;
            copyrightEl.style.display = 'block';
        } else {
            copyrightEl.style.display = 'none';
        }

        if (data.media_type === 'image') {
            img.src = data.url;
            img.style.display = 'block';
            videoContainer.style.display = 'none';
        } else if (data.media_type === 'video') {
            videoFrame.src = data.url;
            videoContainer.style.display = 'block';
            img.style.display = 'none';
        }

        loading.style.display = 'none';
        card.style.display = 'block';

    } catch (error) {
        console.error('Transmission failed:', error);
        if (error.message === 'RATE_LIMIT_EXCEEDED') {
            loading.innerHTML = 'SENSOR OVERLOAD: NASA API rate limit exceeded. <br><small>Please try again later or configure a personal API key.</small>';
        } else {
            loading.innerText = 'SIGNAL LOST: Sector currently unreachable.';
        }
    }
}

// Run when page loads
window.addEventListener('load', fetchTransmission);
