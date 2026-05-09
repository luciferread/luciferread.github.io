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
        var explanation = data.explanation || '';
        if (explanation.startsWith('Explanation: ')) {
            explanation = explanation.slice('Explanation: '.length);
        } else if (explanation.startsWith('Explanation:')) {
            explanation = explanation.slice('Explanation:'.length);
        }
        explanation = explanation.trim();

        // Keep only the first paragraph for display
        var mainText = explanation.split(/\n\s*\n/)[0].trim();

        // 3. Set title, explanation, date
        document.getElementById('nasa-title').innerText = data.title;
        document.getElementById('nasa-explanation').innerText = mainText;
        document.getElementById('nasa-date').innerText = 'STARDATE: ' + data.date;

        // 4. Credits
        var creditText = 'Image Credit: NASA'; // fallback

        if (data.copyright) {
            creditText = 'Image Credit & Copyright: ' + data.copyright;
        } else if (location.hostname !== 'localhost') { // Skip proxy fetch on localhost
            var parts = data.date.split('-');
            var apodUrl = 'https://apod.nasa.gov/apod/ap' + parts[0].slice(2) + parts[1] + parts[2] + '.html';
            var proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(apodUrl);

            try {
                var pageResponse = await fetch(proxyUrl);
                if (pageResponse.ok) {
                    var json = await pageResponse.json();
                    var html = json.contents;

                    // Search all <center>, <b>, and <p> blocks for credit info
                    var creditBlocks = [];
                    ['center','b','p'].forEach(tag => {
                        var matches = html.match(new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'gi')) || [];
                        creditBlocks = creditBlocks.concat(matches);
                    });

                    for (var block of creditBlocks) {
                        block = block.replace(/<\/?(center|b|p)>/gi, '')   // remove outer tags
                                    .replace(/<br\s*\/?>/gi, '\n')        // convert <br> to newline
                                    .replace(/<[^>]+>/g,'');              // remove remaining HTML

                        var lines = block.split('\n').map(s => s.trim()).filter(s => s.length > 0);
                        for (var line of lines) {
                            if (/Credit|Copyright/i.test(line)) {
                                creditText = line;  // Keep the full line, no APOD URL appended
                                break;
                            }
                        }
                        if (creditText !== 'Image Credit: NASA') break;
                    }
                }
            } catch(e) {
                console.warn('Failed to fetch APOD credits:', e);
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
