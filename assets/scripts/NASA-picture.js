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
        var apiResponse = await fetch('https://api.nasa.gov/planetary/apod?api_key=idnQSUVorcc9PskcWyfc4WgZUKXbrDke2UCwMeoZ');
        if (!apiResponse.ok) {
            if (apiResponse.status === 429) throw new Error('RATE_LIMIT_EXCEEDED');
            throw new Error('NETWORK_ERROR');
        }
        var data = await apiResponse.json();
        if (!data || !data.title) throw new Error('INVALID_DATA');

        // 2. Clean up explanation text
        var explanation = data.explanation;

        // Strip leading "Explanation:" prefix
        if (explanation.startsWith('Explanation: ')) {
            explanation = explanation.slice('Explanation: '.length);
        } else if (explanation.startsWith('Explanation:')) {
            explanation = explanation.slice('Explanation:'.length);
        }
        explanation = explanation.trim();

        // Strip NASA announcement text appended to explanation
        // e.g. "APOD's email for image submissions has changed..."
        // "APOD's main NASA site is moving..."
        var apodAnnouncements = [
            "APOD's email",
            "APOD's main NASA site",
            "APOD's submission"
        ];
        for (var a = 0; a < apodAnnouncements.length; a++) {
            var annIdx = explanation.indexOf(apodAnnouncements[a]);
            if (annIdx > 50) { // only strip if not at very start (i.e. it's appended)
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

        if (data.copyright) {
            // Named photographer — API provides copyright directly
            var cleaned = data.copyright
                .split('\n')
                .map(function(s) { return s.trim(); })
                .filter(function(s) { return s.length > 0; })
                .join(' ');
            creditText = 'Image Credit & Copyright: ' + cleaned;

        } else {
            // NASA/ESA public domain — scrape credit from page via CORS proxy
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://science.nasa.gov/apod/');

            try {
                var pageResponse = await fetch(proxyUrl);
                if (pageResponse.ok) {
                    var json = await pageResponse.json();
                    var html = json.contents;

                    // --- DEBUG: log what we received around "Credit" ---
                    var debugIdx = html.indexOf('Credit');
                    if (debugIdx !== -1) {
                        console.log('[APOD] Found "Credit" at index ' + debugIdx);
                        console.log('[APOD] Context: ' + html.substring(debugIdx - 100, debugIdx + 300));
                    } else {
                        console.log('[APOD] "Credit" not found in proxy HTML');
                        console.log('[APOD] First 500 chars: ' + html.substring(0, 500));
                    }
                    // --- END DEBUG ---

                    // Try multiple search patterns to find the credit label
                    var searchPatterns = [
                        '>Credit:</th>',   // <th ...>Credit:</th>
                        '>Credit:</td>',   // <td ...>Credit:</td>
                        '>Credit:</b>',    // <b>Credit:</b>
                        'Credit:</th>',
                        'Credit:</b>',
                        '>Image Credit<',
                        '>Image Credit:'
                    ];

                    var creditLabelIdx = -1;
                    for (var p = 0; p < searchPatterns.length; p++) {
                        creditLabelIdx = html.indexOf(searchPatterns[p]);
                        if (creditLabelIdx !== -1) {
                            console.log('[APOD] Matched pattern: ' + searchPatterns[p]);
                            break;
                        }
                    }

                    if (creditLabelIdx !== -1) {
                        // Find the next <td after the label (the value cell)
                        var nextTd = html.indexOf('<td', creditLabelIdx);
                        if (nextTd !== -1) {
                            var tdOpen = html.indexOf('>', nextTd) + 1;
                            var tdClose = html.indexOf('</td>', tdOpen);
                            var rawCredit = html.slice(tdOpen, tdClose);

                            var extracted = rawCredit
                                .replace(/<[^>]+>/g, '')
                                .replace(/&amp;/g, '&')
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&#[0-9]+;/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();

                            console.log('[APOD] Extracted credit: ' + extracted);

                            if (extracted.length > 0) {
                                creditText = 'Image Credit: ' + extracted;
                            }
                        } else {
                            // Label found but no <td after it — try grabbing text after </b>
                            var afterLabel = html.indexOf('>', creditLabelIdx) + 1;
                            var endLabel = html.indexOf('<', afterLabel);
                            var rawCredit2 = html.slice(afterLabel, endLabel !== -1 ? endLabel : afterLabel + 300);
                            var extracted2 = rawCredit2
                                .replace(/&amp;/g, '&')
                                .replace(/\s+/g, ' ')
                                .trim();
                            if (extracted2.length > 0) {
                                creditText = 'Image Credit: ' + extracted2;
                            }
                        }
                    }
                } else {
                    console.warn('[APOD] Proxy returned status: ' + pageResponse.status);
                }
            } catch (pageErr) {
                console.warn('[APOD] Proxy fetch failed:', pageErr);
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
