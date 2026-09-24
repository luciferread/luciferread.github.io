// <!-- NASA Astronomy Picture of the Day (APOD) Integration -->

// Tries multiple CORS proxies in sequence until one works.
// Returns raw HTML string or null if all fail.
async function fetchViaProxy(targetUrl) {
    var proxies = [
        {
            build: function(u) { return 'https://corsproxy.io/?' + encodeURIComponent(u); },
            parse: async function(r) { return await r.text(); }
        },
        {
            build: function(u) { return 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u); },
            parse: async function(r) { return await r.text(); }
        },
        {
            build: function(u) { return 'https://api.allorigins.win/get?url=' + encodeURIComponent(u); },
            parse: async function(r) { var j = await r.json(); return j.contents; }
        }
    ];

    for (var i = 0; i < proxies.length; i++) {
        try {
            var proxyUrl = proxies[i].build(targetUrl);
            console.log('[APOD] Trying proxy: ' + proxyUrl);
            var response = await fetch(proxyUrl);
            if (response.ok) {
                var html = await proxies[i].parse(response);
                if (html && html.length > 100) {
                    console.log('[APOD] Proxy succeeded: ' + proxyUrl);
                    return html;
                }
            } else {
                console.warn('[APOD] Proxy returned status ' + response.status + ': ' + proxyUrl);
            }
        } catch (e) {
            console.warn('[APOD] Proxy failed: ' + proxies[i].build(targetUrl), e.message);
        }
    }

    console.warn('[APOD] All proxies failed.');
    return null;
}

// Extracts credit text from APOD page HTML.
// The credit lives in a table row: <th ...>Credit:</th><td ...>NASA/GSFC/...</td>
function extractCreditFromHtml(html) {
    var lowerHtml = html.toLowerCase();

    // Old apod.nasa.gov format: <b>Image Credit:</b> or <b>Image Credit &amp; Copyright:</b>
    var creditIdx = lowerHtml.indexOf('<b>image credit');
    if (creditIdx === -1) creditIdx = lowerHtml.indexOf('<b>credit');

    if (creditIdx === -1) {
        console.log('[APOD] Credit label not found in HTML');
        console.log('[APOD] First 500 chars: ' + html.substring(0, 500));
        return null;
    }

    // Skip past the closing </b> tag
    var afterB = html.indexOf('</b>', creditIdx);
    if (afterB === -1) return null;
    afterB += 4;

    // Credit ends at the first <br> or start of Explanation section
    var brIdx = html.indexOf('<br>', afterB);
    var expIdx = lowerHtml.indexOf('<b>explanation', afterB);
    var endIdx = afterB + 500; // safety cap
    if (brIdx !== -1 && (expIdx === -1 || brIdx < expIdx)) endIdx = brIdx;
    else if (expIdx !== -1) endIdx = expIdx;

    var rawCredit = html.slice(afterB, endIdx);
    var extracted = rawCredit
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#[0-9]+;/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    console.log('[APOD] Extracted credit: "' + extracted + '"');
    return extracted.length > 0 ? extracted : null;
}

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

        if (data.copyright) {
            // Named photographer — API provides this directly
            var cleaned = data.copyright
                .split('\n')
                .map(function(s) { return s.trim(); })
                .filter(function(s) { return s.length > 0; })
                .join(' ');
            creditText = 'Image Credit & Copyright: ' + cleaned;

        } else {
            // Simplify the image crediting
            creditText = 'Image Credit: NASA';
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
