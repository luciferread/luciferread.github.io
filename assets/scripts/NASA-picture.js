// <!-- NASA Astronomy Picture of the Day (APOD) Integration -->

async function fetchTransmission() {
    const loading = document.getElementById('nasa-loading');
    const card = document.getElementById('nasa-transmission');
    const img = document.getElementById('nasa-image');
    const videoContainer = document.getElementById('nasa-video-container');
    const videoFrame = document.getElementById('nasa-video');
    const copyrightEl = document.getElementById('nasa-copyright');

    try {
        // 1. Fetch today's APOD data from NASA API
        const apiResponse = await fetch('https://api.nasa.gov/planetary/apod?api_key=idnQSUVorcc9PskcWyfc4WgZUKXbrDke2UCwMeoZ');
        if (!apiResponse.ok) {
            if (apiResponse.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
            throw new Error('NETWORK_ERROR');
        }
        const data = await apiResponse.json();
        if (!data || !data.title) throw new Error('INVALID_DATA');

        // 2. Clean up explanation text
        let explanation = data.explanation.replace(/^Explanation: ?/, '').trim();

        // Keep only the first paragraph for display
        const mainText = explanation.split(/\n\s*\n/)[0].trim();

        // 3. Set title, explanation, date
        document.getElementById('nasa-title').innerText = data.title;
        document.getElementById('nasa-explanation').innerText = explanation;
        document.getElementById('nasa-date').innerText = 'STARDATE: ' + data.date;

        // 4. Credits
        let creditText = 'Image Credit: NASA'; // fallback

        if (data.copyright) {
            creditText = 'Image Credit & Copyright: ' + data.copyright
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean)
            .join(' ');
        } else {
            // Build APOD page URL
            const parts = data.date.split('-');
            const apodUrl = `https://apod.nasa.gov/apod/ap${parts[0].slice(2)}${parts[1]}${parts[2]}.html`;
            const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(apodUrl);

            try {
                const pageResponse = await fetch(proxyUrl);
                if (pageResponse.ok) {
                    const json = await pageResponse.json();
                    const html = json.contents;

                    // Search for "Credit:" and grab text until Explanation
                    const creditIdx = html.indexOf('Credit:');
                    if (creditIdx !== -1) {
                        // Grab text from Credit: up to "<b>Explanation" or end of nearby 500 chars
                        const afterB = html.indexOf('</b>', creditIdx) + 4 || creditIdx;
                        const explanationIdx = html.indexOf('<b>Explanation', afterB);
                        const endIdx = explanationIdx !== -1 ? explanationIdx : afterB + 500;

                        let raw = html.slice(creditIdx, endIdx);

                        // Remove any HTML tags, collapse whitespace, and strip trailing "Explanation:" if present
                        let extracted = raw.replace(/<[^>]+>/g, '')
                                   .replace(/&amp;/g, '&')
                                   .replace(/&lt;/g, '<')
                                   .replace(/&gt;/g, '>')
                                   .replace(/&#[0-9]+;/g, '')
                                   .replace(/\s+/g, ' ')
                                   .trim()
                                   .replace(/\s*Explanation:.*$/i, ''); // <-- remove appended Explanation

                        if (extracted.length > 0) {
                            creditText = extracted;
                        }
                    } else {
                        // fallback shows APOD link if credit not found
                        creditText += ' — see APOD page: ' + apodUrl;
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch APOD credits:', e);
                // fallback creditText stays as 'Image Credit: NASA'
            }
        }

        // Update DOM
        copyrightEl.innerText = creditText;
        copyrightEl.style.display = 'block';

        // 5. Show image or video
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
            loading.innerHTML = 'SENSOR OVERLOAD: NASA API rate limit exceeded.<br><small>Please try again later.</small>';
        } else {
            loading.innerText = 'SIGNAL LOST: Sector currently unreachable.';
        }
    }
}

window.addEventListener('load', fetchTransmission);
