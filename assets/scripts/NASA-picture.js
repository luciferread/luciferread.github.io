// <!-- NASA Astronomy Picture of the Day (APOD) Integration -->

async function fetchTransmission() {
    var loading = document.getElementById('nasa-loading');
    var card = document.getElementById('nasa-transmission');
    var img = document.getElementById('nasa-image');
    var videoContainer = document.getElementById('nasa-video-container');
    var videoFrame = document.getElementById('nasa-video');
    var copyrightEl = document.getElementById('nasa-copyright');

    try {
        // 1. Fetch today's APOD from NASA API
        var apiResponse = await fetch('https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=idnQSUVorcc9PskcWyfc4WgZUKXbrDke2UCwMeoZ');
        if (!apiResponse.ok) {
            if (apiResponse.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
            throw new Error('NETWORK_ERROR');
        }
        var json = await apiResponse.json();
        var data = Array.isArray(json) ? json[0] : json;
        if (!data || !data.title) throw new Error('INVALID_DATA');

        // 2. Clean up explanation text
        var explanation = data.explanation;
        // Strip HTML tags
        explanation = explanation.replace(/<[^>]+>/g, '');
        // Decode HTML entities
        explanation = explanation.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');
        // Strip leading "Explanation:" prefix
        if (explanation.startsWith('Explanation: ')) {
            explanation = explanation.slice('Explanation: '.length);
        } else if (explanation.startsWith('Explanation:')) {
            explanation = explanation.slice('Explanation:'.length);
        }
        explanation = explanation.trim();

        // Strip APOD announcement text sometimes appended to explanation
        var apodAnnouncements = ["APOD's email", "APOD's main NASA site", "APOD's submission"];
        for (var a = 0; a < apodAnnouncements.length; a++) {
            var annIdx = explanation.indexOf(apodAnnouncements[a]);
            if (annIdx > 50) {
                explanation = explanation.substring(0, annIdx).trim();
                break;
            }
        }

        // Strip other promotional phrases
        var promoPhrases = ['Jigsaw Galaxy', 'Jigsaw Nebula', 'Astronomy Puzzle', 'Sky Movie', 'Sky Surprise'];
        for (var i = 0; i < promoPhrases.length; i++) {
            var idx = explanation.indexOf(promoPhrases[i]);
            if (idx !== -1) {
                explanation = explanation.substring(0, idx).trim();
            }
        }

        // 3. Populate title, explanation, date
        document.getElementById('nasa-title').innerText = data.title;
        document.getElementById('nasa-explanation').innerText = explanation;
        document.getElementById('nasa-date').innerText = 'STARDATE: ' + data.date;

        // 4. Credits
        var creditText = 'Image Credit: NASA'; // fallback
        if (data.credit) {
            var cleanCredit = data.credit
                .replace(/<[^>]+>/g, '')
                .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#[0-9]+;/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
                .trim();
            creditText = data.copyright
                ? 'Image Credit & Copyright: ' + cleanCredit
                : 'Image Credit: ' + cleanCredit;
        } else {
            creditText = 'Image Credit: NASA';
        }

        copyrightEl.innerText = creditText;
        copyrightEl.style.display = 'block';

        // 5. Show image or video
        if (data.media_type === 'image') {
            img.src = data.hdurl || data.url;
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
            loading.innerHTML = 'SENSOR OVERLOAD: NASA API rate limit exceeded.<br><small>Please try again later.</small>';
        } else {
            loading.innerText = 'SIGNAL LOST: Sector currently unreachable.';
        }
    }
}

window.addEventListener('load', fetchTransmission);
