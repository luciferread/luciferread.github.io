// <!-- NASA Astronomy Picture of the Day (APOD) Integration -->

async function fetchTransmission() {
    var loading = document.getElementById('nasa-loading');
    var card = document.getElementById('nasa-transmission');
    var img = document.getElementById('nasa-image');
    var videoContainer = document.getElementById('nasa-video-container');
    var videoFrame = document.getElementById('nasa-video');
    var copyrightEl = document.getElementById('nasa-copyright');

    try {
        // 1. Fetch today's APOD data from NASA API
        var apiResponse = await fetch('https://api.nasa.gov/planetary/apod?api_key=idnQSUVorcc9PskcWyfc4WgZUKXbrDke2UCwMeoZ');
        if (!apiResponse.ok) {
            if (apiResponse.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
            throw new Error('NETWORK_ERROR');
        }
        var data = await apiResponse.json();
        if (!data || !data.title) throw new Error('INVALID_DATA');

        // 2. Clean up explanation text
        var explanation = data.explanation;
        if (explanation.startsWith('Explanation: ')) {
            explanation = explanation.slice('Explanation: '.length);
        } else if (explanation.startsWith('Explanation:')) {
            explanation = explanation.slice('Explanation:'.length);
        }
        explanation = explanation.trim();

        // Remove promotional phrases NASA sometimes appends
        var promoPhrases = ['Jigsaw Galaxy', 'Jigsaw Nebula', 'Astronomy Puzzle', 'Sky Movie', 'Sky Surprise', 'Almost Hyperspace', 'Celebrate'];
        for (var i = 0; i < promoPhrases.length; i++) {
            var idx = explanation.indexOf(promoPhrases[i]);
            if (idx !== -1) {
                explanation = explanation.substring(0, idx).trim();
            }
        }

        // 3. Set title, explanation, date
        document.getElementById('nasa-title').innerText = data.title;
        document.getElementById('nasa-explanation').innerText = explanation;
        document.getElementById('nasa-date').innerText = 'STARDATE: ' + data.date;

        // 4. Credits
        // Named photographer images: API provides data.copyright
        // NASA/ESA public domain images: data.copyright is absent.
        //   The credit lives only on the HTML page, so we fetch it via
        //   a CORS proxy (browsers block direct cross-origin requests to apod.nasa.gov)
        var creditText = 'Image Credit: NASA'; // fallback

        if (data.copyright) {
            var cleaned = data.copyright
                .split('\n')
                .map(function(s) { return s.trim(); })
                .filter(function(s) { return s.length > 0; })
                .join(' ');
            creditText = 'Image Credit & Copyright: ' + cleaned;
        } else {
            // Build the APOD page URL for today's date e.g. "2026-03-14" -> ap260314.html
            var parts = data.date.split('-');
            var apodUrl = 'https://apod.nasa.gov/apod/ap' + parts[0].slice(2) + parts[1] + parts[2] + '.html';
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(apodUrl);

            try {
                var pageResponse = await fetch(proxyUrl);
                if (pageResponse.ok) {
                    var json = await pageResponse.json();
                    var html = json.contents;

                    // Find any "...Credit:" label in the page
                    var creditIdx = html.indexOf('Credit:');
                    if (creditIdx !== -1) {
                        // Walk back to start of that line to include the label (e.g. "Image Credit:" or "Artist Illustration Credit:")
                        var lineStart = html.lastIndexOf('\n', creditIdx);
                        if (lineStart === -1) lineStart = 0;

                        // Find the closing </b> of the label, then grab text until Explanation
                        var afterB = html.indexOf('</b>', creditIdx);
                        if (afterB !== -1) {
                            afterB += 4;
                            var endIdx = html.indexOf('<b>Explanation', afterB);
                            if (endIdx === -1) endIdx = afterB + 400;

                            var raw = html.slice(lineStart, endIdx);

                            // Strip tags and collapse whitespace
                            var extracted = raw
                                .replace(/<[^>]+>/g, '')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&#[0-9]+;/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();

                            if (extracted.length > 0) {
                                creditText = extracted;
                            }
                        }
                    }
                }
            } catch (pageErr) {
                console.warn('Could not fetch APOD page credit:', pageErr);
                // creditText stays as fallback "Image Credit: NASA"
            }
        }

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
