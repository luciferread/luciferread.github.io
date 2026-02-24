// <!-- PLANETARY ECLIPSE TRACKER LOGIC v4.0 -->

// Future Total Solar Eclipses on Earth (100 Years: 2026-2126)
// Source: NASA Five Millennium Catalog
const earthEvents = [
    { date: "2026-08-12T17:00:00Z", duration: "2m 18s", loc: "Spain / Arctic" },
    { date: "2027-08-02T10:00:00Z", duration: "6m 23s", loc: "Egypt / N. Africa" },
    { date: "2028-07-22T04:00:00Z", duration: "5m 10s", loc: "Australia / NZ" },
    { date: "2030-11-25T07:00:00Z", duration: "3m 44s", loc: "S. Africa / Australia" },
    { date: "2031-11-14T18:00:00Z", duration: "1m 08s", loc: "Pacific / Panama" },
    { date: "2033-03-30T18:00:00Z", duration: "2m 37s", loc: "Alaska / Russia" },
    { date: "2034-03-20T10:00:00Z", duration: "4m 09s", loc: "Nigeria / China" },
    { date: "2035-09-02T02:00:00Z", duration: "1m 16s", loc: "China / Japan" },
    { date: "2037-07-13T02:00:00Z", duration: "3m 58s", loc: "Australia" },
    { date: "2038-01-05T14:00:00Z", duration: "3m 18s", loc: "Caribbean / W. Africa" },
    { date: "2038-07-02T14:00:00Z", duration: "1m 00s", loc: "N. America / Africa" },
    { date: "2039-12-15T23:00:00Z", duration: "1m 51s", loc: "Antarctica" },
    { date: "2041-10-25T09:00:00Z", duration: "2m 10s", loc: "Africa / Asia" },
    { date: "2043-04-09T15:00:00Z", duration: "4m 57s", loc: "Russia / Asia" },
    { date: "2044-08-23T02:00:00Z", duration: "2m 04s", loc: "Canada / Greenland" },
    { date: "2045-08-12T19:00:00Z", duration: "6m 06s", loc: "USA / Caribbean" },
    { date: "2046-02-05T16:00:00Z", duration: "2m 26s", loc: "Pacific / Antarctica" },
    { date: "2048-06-11T03:00:00Z", duration: "3m 21s", loc: "Pacific / S. America" },
    { date: "2049-05-31T14:00:00Z", duration: "3m 58s", loc: "Indonesia / Pacific" },
    { date: "2050-05-20T19:00:00Z", duration: "4m 34s", loc: "S. Atlantic / Africa" }
    // Add more through 2100+ from NASA's catalog
];

// Indefinite Mathematical Anchors (i.e., orbital periods)
const phobosPeriod = 7 * 60 * 60 * 1000 + 39 * 60 * 1000; // 7h 39m
const ioPeriod = 1 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000 + 27 * 60 * 1000 + 33 * 1000; // 1.769138 days (NASA)

let currentEarthEventIndex = 0;  // 'let' can be reassigned, 'const' cannot

// TEST MODE VARIABLES
let testMode = {
    active: false,
    sector: null,
    startTime: null,
    duration: null,
    endTime: null
};

// Logic to update all sectors
function updateTrackingStation() {
    const now = new Date();

    // Check if test mode has expired
    if (testMode.active && now > testMode.endTime) {
        testMode.active = false;
        testMode.sector = null;
        console.log('Test mode ended');
    }

    // 1. EARTH (List-based 100 Year Automation)
    const earthDuration = 15 * 60 * 1000; // 15m assumed transit
    let nextEarth = null;

    for (let i = currentEarthEventIndex; i < earthEvents.length; i++) {
        const eventDate = new Date(earthEvents[i].date);
        if (eventDate > now) {
            nextEarth = earthEvents[i];
            currentEarthEventIndex = i;
            break;
        } else if (eventDate <= now && now <= new Date(eventDate.getTime() + earthDuration)) {
            nextEarth = earthEvents[i];
            currentEarthEventIndex = i;
            break;
        } else {
            currentEarthEventIndex = i + 1;
        }
    }

    if (nextEarth) {
        const nextEarthDate = new Date(nextEarth.date);
        if (testMode.active && testMode.sector === 'earth') {
            // Use test mode timing
            updateCard('earth', testMode.startTime, testMode.duration);
            positionMoon('earth', testMode.startTime, testMode.duration, 27.3 * 24 * 60 * 60 * 1000);
        } else {
            updateCard('earth', nextEarthDate, earthDuration);
            positionMoon('earth', nextEarthDate, earthDuration, 27.3 * 24 * 60 * 60 * 1000); // Earth orbit ref
        }
        document.getElementById('earth-status').innerText = `Location: ${nextEarth.loc} | Dur: ${nextEarth.duration}`;
    } else {
        // No more eclipses in our list
        const timerEl = document.getElementById('earth-timer');
        const statusEl = document.getElementById('earth-status');
        timerEl.innerText = "NO DATA";
        timerEl.style.color = "#888";
        statusEl.innerText = "Eclipse data coverage ended. Check NASA for future events.";
    }
    
    // 2. MARS
    const marsAnchor = new Date("2026-02-15T18:30:00Z"); // Set to current time for accurate moon position
    const marsElapsed = now - marsAnchor;
    const marsDuration = 30 * 1000; // 30s transit

    // Calculate current cycle and check if we're in an active event
    const marsCurrentCycle = Math.floor(marsElapsed / phobosPeriod);
    const marsCurrentEventStart = new Date(marsAnchor.getTime() + marsCurrentCycle * phobosPeriod);
    const marsTimeSinceEvent = now - marsCurrentEventStart;

    // If we're past the current event's duration, target the next event
    const targetMars = (marsTimeSinceEvent > marsDuration)
        ? new Date(marsAnchor.getTime() + (marsCurrentCycle + 1) * phobosPeriod)
        : marsCurrentEventStart;
    
    if (testMode.active && testMode.sector === 'mars') {
        updateCard('mars', testMode.startTime, testMode.duration);
        positionMoon('mars', testMode.startTime, testMode.duration, phobosPeriod);
    } else {
        updateCard('mars', targetMars, marsDuration);
        positionMoon('mars', targetMars, marsDuration, phobosPeriod);
    }

    // 3. JUPITER
    const jupiterAnchor = new Date("2026-02-15T12:00:00Z"); // Set to current time for accurate moon position
    const jupiterElapsed = now - jupiterAnchor;
    const jupiterDuration = 135 * 60 * 1000;

    // Calculate current cycle and check if we're in an active event
    const jupiterCurrentCycle = Math.floor(jupiterElapsed / ioPeriod);
    const jupiterCurrentEventStart = new Date(jupiterAnchor.getTime() + jupiterCurrentCycle * ioPeriod);
    const jupiterTimeSinceEvent = now - jupiterCurrentEventStart;

    // If we're past the current event's duration, target the next event
    const targetJupiter = (jupiterTimeSinceEvent > jupiterDuration)
        ? new Date(jupiterAnchor.getTime() + (jupiterCurrentCycle + 1) * ioPeriod)
        : jupiterCurrentEventStart;
    
    if (testMode.active && testMode.sector === 'jupiter') {
        updateCard('jupiter', testMode.startTime, testMode.duration);
        positionMoon('jupiter', testMode.startTime, testMode.duration, ioPeriod);
    } else {
        updateCard('jupiter', targetJupiter, jupiterDuration);
        positionMoon('jupiter', targetJupiter, jupiterDuration, ioPeriod);
    }
}

function updateCard(sector, targetDate, durationMs) {
    const timerEl = document.getElementById(`${sector}-timer`);
    const cardEl = document.getElementById(`${sector}-card`);
    const eventDetailsEl = cardEl.querySelector('.event-details');
    const now = new Date();

    if (!targetDate) {
        timerEl.innerText = "OFFLINE";
        return;
    }

    const diff = targetDate - now;

    // Check if Event is Happening NOW
    // (Assuming event starts at targetDate and lasts durationMs)
    const eventOngoing = (diff <= 0 && diff > -durationMs);

    if (eventOngoing) {
        // ECLIPSE IS ACTIVE - calculate remaining time in the event
        const remaining = durationMs + diff; // diff is negative, so we add it
        timerEl.innerText = formatTime(Math.max(0, remaining));
        timerEl.style.color = "#ff4444";
        timerEl.style.textShadow = "0 0 15px rgba(255, 68, 68, 0.8)";
        cardEl.style.borderColor = "#ff4444";
        cardEl.classList.add('active-alert');

        // Activate sun pulsing
        const sun = cardEl.querySelector('.sun-reference');
        if (sun) sun.classList.add('sun-active');

        // Show eclipse shadow
        const shadow = document.getElementById(`${sector}-shadow`);
        if (shadow) shadow.classList.add('active');

        // Show dark spot on planet
        const darkSpot = document.getElementById(`${sector}-dark-spot`);
        if (darkSpot) darkSpot.classList.add('active');

        // Update event description to active state
        if (sector === 'mars') {
            eventDetailsEl.innerText = 'PHOBOS TRANSIT ACTIVE';
        } else if (sector === 'earth') {
            eventDetailsEl.innerText = 'TOTAL ECLIPSE IN PROGRESS';
        } else if (sector === 'jupiter') {
            const jupiterEventEl = document.getElementById('jupiter-event-name');
            if (jupiterEventEl) jupiterEventEl.innerText = 'IO SHADOW CROSSING';
        }
    } else {
        // NORMAL STATE - COUNTING DOWN
        timerEl.innerText = formatTime(Math.max(0, diff));
        timerEl.style.color = "#00ff00";
        timerEl.style.textShadow = "0 0 10px rgba(0, 255, 0, 0.5)";
        cardEl.style.borderColor = "rgba(201, 176, 55, 0.3)";
        cardEl.classList.remove('active-alert');

        // Deactivate sun pulsing
        const sun = cardEl.querySelector('.sun-reference');
        if (sun) sun.classList.remove('sun-active');

        // Hide eclipse shadow
        const shadow = document.getElementById(`${sector}-shadow`);
        if (shadow) shadow.classList.remove('active');

        const darkSpot = document.getElementById(`${sector}-dark-spot`);
        if (darkSpot) darkSpot.classList.remove('active');
        
        // Reset event description to default
        if (sector === 'mars') {
            eventDetailsEl.innerText = 'Next Phobos Shadow Transit';
        } else if (sector === 'earth') {
            eventDetailsEl.innerText = 'Next Total Solar Eclipse';
        } else if (sector === 'jupiter') {
            const jupiterEventEl = document.getElementById('jupiter-event-name');
            if (jupiterEventEl) jupiterEventEl.innerText = 'Next Io Shadow Transit';
        }
    }
}

function positionMoon(sector, targetDate, durationMs, periodMs) {
    const group = document.getElementById(`${sector}-orbit-group`);
    if (!group) return;

    const now = new Date();
    const diff = targetDate - now;
    const eventOngoing = (diff <= 0 && diff > -durationMs);

    if (sector === 'earth') {
        // EARTH: Directly set moon cx/cy rather than rotating the group,
        // so the clipPath phase mask always aligns with the moon's actual position.
        const knownNewMoon = new Date("2026-02-17T12:01:00Z");
        const lunarCycle = 29.53059 * 24 * 60 * 60 * 1000;
        
        const timeSinceNewMoon = now - knownNewMoon;
        const cycleProgress = ((timeSinceNewMoon % lunarCycle) + lunarCycle) % lunarCycle / lunarCycle;
        
        // -90° = 12 o'clock (new moon / top), increases clockwise
        let orbitAngleDeg = cycleProgress * 360 - 90;
        if (eventOngoing) orbitAngleDeg = -90; // freeze at transit position

        const orbitAngleRad = orbitAngleDeg * Math.PI / 180;
        const orbitRadius = 40; // must match SVG orbit-path r="40"

        // Calculate moon screen position
        const moonX = 50 + orbitRadius * Math.cos(orbitAngleRad);
        const moonY = 50 + orbitRadius * Math.sin(orbitAngleRad);

        // Move moon circles to calculated position
        const moonBase = group.querySelector('.moon-phase');
        const moonDark = document.getElementById('earth-moon-dark-half');
        if (moonBase) { moonBase.setAttribute('cx', moonX); moonBase.setAttribute('cy', moonY); }
        if (moonDark)  { moonDark.setAttribute('cx', moonX);  moonDark.setAttribute('cy', moonY); }

        // Reposition clipPath rects to match the moon's new location
        const r = 4;
        const clipLeftRect  = document.querySelector('#moon-clip-left rect');
        const clipRightRect = document.querySelector('#moon-clip-right rect');
        if (clipLeftRect) {
            clipLeftRect.setAttribute('x', moonX - r);
            clipLeftRect.setAttribute('y', moonY - r);
            clipLeftRect.setAttribute('width', r);
            clipLeftRect.setAttribute('height', r * 2);
        }
        if (clipRightRect) {
            clipRightRect.setAttribute('x', moonX);
            clipRightRect.setAttribute('y', moonY - r);
            clipRightRect.setAttribute('width', r);
            clipRightRect.setAttribute('height', r * 2);
        }

        // No group rotation needed — we set cx/cy directly
        group.style.transform = 'none';

        updateMoonPhase(cycleProgress);
        return;
    }

    // MARS & JUPITER: Rotate the orbit group
    let angle;
    if (eventOngoing) {
        angle = -90;
    } else {
        let progress = (diff % periodMs) / periodMs;
        if (progress < 0) progress += 1;
        angle = (1 - progress) * 360 - 90;
    }
    group.removeAttribute('style'); // clear any leftover CSS transform
    group.setAttribute('transform', `rotate(${angle}, 50, 50)`);
    
}

// Update moon phase visualization for Earth
function updateMoonPhase(cycleProgress) {
    const darkHalf = document.getElementById('earth-moon-dark-half');
    if (!darkHalf) return;

    // Waxing (0–0.5): right half lit → clip the LEFT half dark (D-shape)
    // Waning (0.5–1): left half lit → clip the RIGHT half dark (C-shape)
    if (cycleProgress < 0.5) {
        darkHalf.setAttribute('clip-path', 'url(#moon-clip-left)');
    } else {
        darkHalf.setAttribute('clip-path', 'url(#moon-clip-right)');
    }

    // Glow intensity by phase
    const moonPhaseCircle = document.querySelector('.moon-phase');
    if (moonPhaseCircle) {
        let glowIntensity;
        if (cycleProgress < 0.15 || cycleProgress > 0.85) {
            // Near new moon: thin crescent
            glowIntensity = 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 3px rgba(236, 240, 241, 0.4))';
        } else if (cycleProgress > 0.4 && cycleProgress < 0.6) {
            // Near full moon: brighter glow
            glowIntensity = 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 5px rgba(236, 240, 241, 0.5))';
        } else {
            glowIntensity = 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 4px rgba(236, 240, 241, 0.3))';
        }
        moonPhaseCircle.style.filter = glowIntensity;
    }
}

function formatTime(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (1000 * 60));
    const secs = Math.floor((ms % (60 * 1000)) / 1000);

    if (days > 0) {
        return `${days}d ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}


// DEBUG FUNCTION - Trigger eclipse manually for testing
function triggerTestEclipse(sector, durationSeconds = 30) {
    const now = new Date();
    testMode.active = true;
    testMode.sector = sector;
    testMode.startTime = new Date(now.getTime() - 5000); // Started 5 seconds ago
    testMode.duration = durationSeconds * 1000;
    testMode.endTime = new Date(now.getTime() + (durationSeconds - 5) * 1000);
    
    console.log(`✓ Test eclipse activated for ${sector} (${durationSeconds}s)`);
    console.log(`  Will end at: ${testMode.endTime.toLocaleTimeString()}`);
    console.log(`  To cancel early: stopTestEclipse()`);
}

function stopTestEclipse() {
    testMode.active = false;
    testMode.sector = null;
    console.log('✓ Test mode cancelled');
}

// Make functions available globally for console access
window.triggerTestEclipse = triggerTestEclipse;
window.stopTestEclipse = stopTestEclipse;

// To test: Open browser console (Cmd+Option+J) and type: triggerTestEclipse('jupiter')
// Can be 'mars', 'earth', 'jupiter'
// This will simulate an eclipse for 25 more seconds

// triggerTestEclipse('mars', 60)  // 60 second eclipse
// stopTestEclipse()  // Cancel early if needed

setInterval(updateTrackingStation, 1000);
updateTrackingStation();
