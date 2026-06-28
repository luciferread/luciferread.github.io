import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// Constants
const MODEL_ID = "Llama-3.2-3B-Instruct-q4f32_1-MLC"; // Good balance of size (~2GB) and intelligence
const CHUNK_SIZE = 6000;
const CHUNK_OVERLAP = 300;
const CONDENSE_CHUNK_SIZE = 2500;
const CONDENSE_OVERLAP = 200;

// State
let novelText = "";
let fileName = "";
let glossaryText = "";
let engine = null;

// DOM Elements
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const browseBtn = document.getElementById("browse-btn");
const fileInfo = document.getElementById("file-info");
const fileNameSpan = document.getElementById("file-name");

const glossaryDropZone = document.getElementById("glossary-drop-zone");
const glossaryFileInput = document.getElementById("glossary-file-input");
const glossaryFileInfo = document.getElementById("glossary-file-info");
const glossaryFileNameSpan = document.getElementById("glossary-file-name");

const chapterSeparatorInput = document.getElementById("chapter-separator");
const additionalInstructionsInput = document.getElementById("additional-instructions");
const startBtn = document.getElementById("start-btn");

const setupPanel = document.getElementById("setup-panel");
const loadingPanel = document.getElementById("loading-panel");
const resultsPanel = document.getElementById("results-panel");

const initProgress = document.getElementById("init-progress");
const engineStatus = document.getElementById("engine-status");
const engineSubtext = document.getElementById("engine-subtext");

const analysisStatusBox = document.getElementById("analysis-status-box");
const analysisProgress = document.getElementById("analysis-progress");
const analysisStatus = document.getElementById("analysis-status");
const analysisSubtext = document.getElementById("analysis-subtext");

const analysisOutput = document.getElementById("analysis-output");
const axesInfo = document.getElementById("axes-info");
const plotOutput = document.getElementById("plot-output");

const startModeInputs = document.querySelectorAll('input[name="start-mode"]');
const novelUploadSection = document.getElementById("novel-upload-section");
const pasteInputSection = document.getElementById("paste-input-section");
const pasteDropZone = document.getElementById("paste-drop-zone");
const pasteFileInput = document.getElementById("paste-file-input");
const pasteFileInfo = document.getElementById("paste-file-info");
const pasteFileNameSpan = document.getElementById("paste-file-name");
const pasteTextArea = document.getElementById("paste-text");
const modeHint = document.getElementById("mode-hint");
const chapterSepGroup = document.getElementById("chapter-sep-group");

const MODE_HINTS = {
    novel: "Upload your full novel file below. The AI will read and summarize it in chunks.",
    presummary: "Paste or upload a pre-summarized version of your novel (e.g. a saved plot summary). The AI will condense it and run the final analysis.",
    condensed: "Paste or upload your final condensed plot. The AI will skip straight to the literary analysis.",
    chat: "Directly chat with the LLM without analyzing a novel. Select a persona below."
};

const chatSetupSection = document.getElementById("chat-setup-section");
const chatPersonaSelect = document.getElementById("chat-persona-select");
const chatPersonaCustom = document.getElementById("chat-persona-custom");

const modelVersionText = document.getElementById("model-version-text");
if (modelVersionText) {
    modelVersionText.innerHTML = `Powered by <a href="https://webllm.mlc.ai/" target="_blank" style="color:inherit;text-decoration:underline;">WebLLM</a> (${MODEL_ID})`;
}

// ---------------------------------------------------------------------------
// Offline setup button — injected into <header>
// ---------------------------------------------------------------------------
function injectOfflineSetupButton() {
    const header = document.querySelector('header');
    if (!header) return;
    header.insertAdjacentHTML('beforeend', `
    <div id="offline-setup-area" style="margin-top:18px;">
        <button id="offline-setup-btn" class="btn" style="font-size:0.9rem;padding:9px 22px;">
            \u2b07 Download Model for Offline Use
        </button>
        <p class="sub-text" style="margin-top:7px;font-size:0.78rem;max-width:520px;margin-inline:auto;line-height:1.6;">
            Caches the ~2\u202fGB AI model so this tool runs fully offline after setup. Works on GitHub Pages.
            <em>Browsers may clear this cache under storage pressure \u2014 offline is best-effort, not permanent.</em>
        </p>
        <div id="offline-progress-area" class="hidden" style="margin-top:10px;max-width:420px;margin-inline:auto;">
            <div class="progress-bar-container">
                <div class="progress-bar" id="offline-progress" style="width:0%"></div>
            </div>
            <p id="offline-status-text" class="sub-text" style="margin-top:5px;font-size:0.78rem;text-align:center;"></p>
        </div>
    </div>`);
    document.getElementById('offline-setup-btn').addEventListener('click', setupOffline);
}

async function setupOffline() {
    const btn    = document.getElementById('offline-setup-btn');
    const area   = document.getElementById('offline-progress-area');
    const bar    = document.getElementById('offline-progress');
    const status = document.getElementById('offline-status-text');
    btn.disabled = true;
    btn.textContent = 'Downloading\u2026';
    area.classList.remove('hidden');
    status.textContent = 'Starting \u2014 may take a few minutes on a slow connection.';
    try {
        if (!engine) {
            engine = await CreateMLCEngine(MODEL_ID, {
                initProgressCallback: (p) => {
                    bar.style.width = Math.round(p.progress * 100) + '%';
                    status.textContent = p.text || 'Downloading model weights\u2026';
                },
                chatOpts: { context_window_size: 6144 }
            });
        } else {
            bar.style.width = '100%';
        }
        btn.textContent = '\u2713 Ready for Offline Use';
        // btn.style.color = '#4ade80';
        btn.style.color = '#F4F1D6';
        status.textContent = 'Model cached. You can disconnect \u2014 it will load from your browser cache next time.';
    } catch (err) {
        btn.disabled = false;
        btn.textContent = '\u2b07 Download Model for Offline Use';
        status.textContent = 'Download failed: ' + err.message;
    }
}

// ---------------------------------------------------------------------------
// Per-section temperature panel — injected into .settings-section
// ---------------------------------------------------------------------------
const TEMP_CONFIGS = [
    { id: 'temp-brainstorm', label: 'Core Analysis',     def: 0.35, sub: 'Brainstorming, Genres &amp; Keywords \u2014 factual, keep low.' },
    { id: 'temp-comps',      label: 'Comparable Authors', def: 0.60, sub: 'Low = well-known comps, high = lateral finds. Above ~0.85 a 3B model may hallucinate author names.' },
    { id: 'temp-blurb',      label: 'Back-Cover Blurb',  def: 0.55, sub: 'Higher = more vivid prose, but keep under 0.80 to preserve plot accuracy.' },
    { id: 'temp-elevator',   label: 'Elevator Pitch',     def: 0.50, sub: 'Higher = more inventive cross-genre comparisons.' },
    { id: 'temp-map',        label: 'Author Map',         def: 0.60, sub: 'Low = tight cluster, high = broader and more diverse spread of authors.' },
];

function buildTempRow(c) {
    return `
    <div style="margin-bottom:15px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
            <span style="font-size:0.87rem;font-weight:600;color:var(--text-primary);">${c.label}</span>
            <span style="display:flex;align-items:center;gap:6px;">
                <span id="${c.id}-warn" style="color:#f59e0b;font-size:0.72rem;display:none;">\u26a0 hallucination risk</span>
                <input type="number" id="${c.id}-num" value="${c.def.toFixed(2)}" min="0.10" max="1.00" step="0.05"
                       style="width:62px;background:rgba(15,23,42,0.7);border:1px solid var(--glass-border);
                              border-radius:6px;color:var(--accent);font-size:0.88rem;font-weight:700;
                              text-align:center;padding:4px 2px;cursor:text;">
            </span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap;">Precise</span>
            <input type="range" id="${c.id}" min="0.10" max="1.00" step="0.05" value="${c.def.toFixed(2)}"
                   style="flex:1;accent-color:var(--accent);cursor:pointer;">
            <span style="font-size:0.75rem;color:var(--text-secondary);white-space:nowrap;">Creative</span>
        </div>
        <p style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;line-height:1.5;">${c.sub}</p>
    </div>`;
}

function injectTemperaturePanel() {
    const s = document.querySelector('#extra-setup-container .settings-section');
    if (!s) return;
    s.insertAdjacentHTML('beforeend', `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--glass-border);">
        <details id="temp-panel-details">
            <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:6px;
                            user-select:none;font-size:0.92rem;font-weight:600;color:var(--text-secondary);">
                \u2699\ufe0f Temperature Settings
                <span style="font-size:0.78rem;font-weight:400;margin-left:4px;">(tune creativity per section)</span>
            </summary>
            <div style="margin-top:14px;padding:18px;background:rgba(15,23,42,0.45);
                        border:1px solid var(--glass-border);border-radius:10px;">
                <p style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.65;">
                    <strong style="color:var(--text-primary);">Temperature</strong> controls how predictable vs.
                    adventurous each AI call is. Above <strong style="color:#f59e0b;">~0.85</strong>, a 3B model
                    may hallucinate. Slide or type a value directly.
                </p>
                ${TEMP_CONFIGS.map(buildTempRow).join('')}
            </div>
        </details>
    </div>`);

    TEMP_CONFIGS.forEach(c => {
        const slider = document.getElementById(c.id);
        const num    = document.getElementById(c.id + '-num');
        const warn   = document.getElementById(c.id + '-warn');
        const clamp  = v => Math.min(1.0, Math.max(0.1, v));
        const sync   = v => { warn.style.display = v > 0.85 ? 'inline' : 'none'; };
        slider.addEventListener('input', () => { const v = clamp(parseFloat(slider.value)); num.value = v.toFixed(2); sync(v); });
        num.addEventListener('input', () => { const v = parseFloat(num.value); if (!isNaN(v)) { slider.value = clamp(v); sync(clamp(v)); } });
        num.addEventListener('blur',  () => { const v = isNaN(parseFloat(num.value)) ? c.def : clamp(parseFloat(num.value)); num.value = v.toFixed(2); slider.value = v; sync(v); });
    });
}

function getTemp(id) {
    const el = document.getElementById(id);
    if (!el) return 0.5;
    const v = parseFloat(el.value);
    return isNaN(v) ? 0.5 : Math.min(1.0, Math.max(0.1, v));
}

injectOfflineSetupButton();
injectTemperaturePanel();

// Sync standalone chat temperature slider and input
const chatTempSlider = document.getElementById('chat-temp');
const chatTempNum = document.getElementById('chat-temp-num');
if (chatTempSlider && chatTempNum) {
    const clamp = v => Math.min(1.0, Math.max(0.1, v));
    chatTempSlider.addEventListener('input', () => {
        chatTempNum.value = clamp(parseFloat(chatTempSlider.value)).toFixed(2);
    });
    chatTempNum.addEventListener('input', () => {
        const v = parseFloat(chatTempNum.value);
        if (!isNaN(v)) chatTempSlider.value = clamp(v);
    });
    chatTempNum.addEventListener('blur', () => {
        const v = isNaN(parseFloat(chatTempNum.value)) ? 0.6 : clamp(parseFloat(chatTempNum.value));
        chatTempNum.value = v.toFixed(2);
        chatTempSlider.value = v;
    });
}

// --- UI Event Listeners ---

// Drag and drop handlers
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0], false);
    }
});

// Glossary drag and drop
glossaryDropZone.addEventListener("click", () => glossaryFileInput.click());
glossaryDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    glossaryDropZone.classList.add("dragover");
});
glossaryDropZone.addEventListener("dragleave", () => glossaryDropZone.classList.remove("dragover"));
glossaryDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    glossaryDropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0], true);
    }
});
glossaryFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0], true);
    }
});

startBtn.addEventListener("click", startAnalysis);

const backToSetupBtn = document.getElementById('back-to-setup-btn');
if (backToSetupBtn) {
    backToSetupBtn.addEventListener('click', () => {
        resultsPanel.classList.add('hidden');
        setupPanel.classList.remove('hidden');
    });
}

// Top-level Mode Selector
const tabBookAnalysis = document.getElementById('tab-book-analysis');
const tabChatOnly = document.getElementById('tab-chat-only');
const analysisSetupContainer = document.getElementById('analysis-setup-container');

tabBookAnalysis.addEventListener('click', () => {
    tabBookAnalysis.classList.add('active');
    tabChatOnly.classList.remove('active');
    analysisSetupContainer.classList.remove('hidden');
    document.getElementById('extra-setup-container').classList.remove('hidden');
    chatSetupSection.classList.add('hidden');
    
    // Switch to first mode-novel if mode-chat was checked
    const currMode = document.querySelector('input[name="start-mode"]:checked').value;
    if (currMode === 'chat') {
        document.getElementById('mode-novel').checked = true;
    }
    document.querySelector('input[name="start-mode"]:checked').dispatchEvent(new Event('change'));
});

tabChatOnly.addEventListener('click', () => {
    tabChatOnly.classList.add('active');
    tabBookAnalysis.classList.remove('active');
    analysisSetupContainer.classList.add('hidden');
    document.getElementById('extra-setup-container').classList.add('hidden');
    
    // implicitly select chat mode
    document.getElementById('mode-chat').checked = true;
    document.getElementById('mode-chat').dispatchEvent(new Event('change'));
});

// Starting Mode Selector
startModeInputs.forEach(radio => {
    radio.addEventListener("change", () => {
        const mode = document.querySelector('input[name="start-mode"]:checked').value;
        modeHint.textContent = MODE_HINTS[mode];
        if (mode === "novel") {
            novelUploadSection.classList.remove("hidden");
            pasteInputSection.classList.add("hidden");
            chapterSepGroup.classList.remove("hidden");
            chatSetupSection.classList.add("hidden");
            startBtn.textContent = "Start Analysis";
            startBtn.disabled = novelText === "";
        } else if (mode === "chat") {
            novelUploadSection.classList.add("hidden");
            pasteInputSection.classList.add("hidden");
            chapterSepGroup.classList.add("hidden");
            chatSetupSection.classList.remove("hidden");
            startBtn.textContent = "Start Chat";
            startBtn.disabled = false;
        } else {
            novelUploadSection.classList.add("hidden");
            pasteInputSection.classList.remove("hidden");
            chapterSepGroup.classList.add("hidden");
            chatSetupSection.classList.add("hidden");
            startBtn.textContent = "Start Analysis";
            document.getElementById("paste-label").textContent =
                mode === "presummary" ? "Paste or upload your pre-summarized text" : "Paste or upload your condensed plot";
            // Enable start if paste textarea has content or file loaded
            startBtn.disabled = pasteTextArea.value.trim() === "" && !pasteFileInfo.classList.contains("active");
        }
    });
});

// Paste textarea live-enable
pasteTextArea.addEventListener("input", () => {
    const mode = document.querySelector('input[name="start-mode"]:checked').value;
    if (mode === "presummary" || mode === "condensed") startBtn.disabled = pasteTextArea.value.trim() === "";
});

chatPersonaSelect.addEventListener("change", () => {
    if (chatPersonaSelect.value === "custom") {
        chatPersonaCustom.classList.remove("hidden");
    } else {
        chatPersonaCustom.classList.add("hidden");
    }
});

// Paste drop zone
pasteDropZone.addEventListener("click", () => pasteFileInput.click());
pasteDropZone.addEventListener("dragover", e => { e.preventDefault(); pasteDropZone.classList.add("dragover"); });
pasteDropZone.addEventListener("dragleave", () => pasteDropZone.classList.remove("dragover"));
pasteDropZone.addEventListener("drop", e => {
    e.preventDefault(); pasteDropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handlePasteFile(e.dataTransfer.files[0]);
});
pasteFileInput.addEventListener("change", e => {
    if (e.target.files.length > 0) handlePasteFile(e.target.files[0]);
});

// Tab Switching
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        // Remove active class from all
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

        // Add active class to clicked
        const targetId = e.target.getAttribute("data-target");
        e.target.classList.add("active");
        document.getElementById(targetId).classList.add("active");
    });
});

// --- File Handling ---

async function handlePasteFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    let text = "";
    if (ext === "txt") {
        text = await file.text();
    } else if (ext === "docx") {
        const ab = await file.arrayBuffer();
        try { text = (await mammoth.extractRawText({ arrayBuffer: ab })).value; }
        catch (e) { alert("Error reading DOCX: " + e.message); return; }
    } else {
        alert("Please use a .txt or .docx file."); return;
    }
    pasteTextArea.value = text;
    pasteFileNameSpan.textContent = file.name;
    pasteFileInfo.classList.remove("hidden");
    pasteFileInfo.classList.add("active");
    startBtn.disabled = false;
}

async function handleFile(file, isGlossary) {
    const ext = file.name.split('.').pop().toLowerCase();

    let textResult = "";
    if (ext === "txt") {
        textResult = await file.text();
    } else if (ext === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        try {
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            textResult = result.value;
        } catch (err) {
            alert("Error reading DOCX: " + err.message);
            return;
        }
    } else {
        alert("Unsupported file type. Please upload a .txt or .docx file.");
        return;
    }

    if (isGlossary) {
        glossaryText = textResult;
        glossaryFileNameSpan.textContent = file.name;
        glossaryFileInfo.classList.remove("hidden");
    } else {
        novelText = textResult;
        fileName = file.name;
        fileNameSpan.textContent = fileName;
        fileInfo.classList.remove("hidden");
        startBtn.disabled = false;
    }
}

function chunkText(text, size, overlap, separator) {
    if (separator) {
        // Split by chapter separator first
        const rawChunks = text.split(separator).map(c => c.trim()).filter(c => c.length > 0);
        const finalChunks = [];

        for (const chunk of rawChunks) {
            if (chunk.length <= size) {
                finalChunks.push(chunk);
            } else {
                // Fallback to character slicing if a chapter is too huge
                let i = 0;
                while (i < chunk.length) {
                    finalChunks.push(chunk.slice(i, i + size));
                    i += size - overlap;
                }
            }
        }
        return finalChunks;
    } else {
        // Blind slicing
        const chunks = [];
        let i = 0;
        while (i < text.length) {
            chunks.push(text.slice(i, i + size));
            i += size - overlap;
        }
        return chunks;
    }
}

// --- Main Pipeline ---

async function startAnalysis() {
    setupPanel.classList.add("hidden");
    loadingPanel.classList.remove("hidden");

    // Reset tab displays in case a previous run was "Chat Only"
    document.querySelectorAll(".tab-btn").forEach(b => b.style.display = "");

    try {
        // Determine total steps based on mode
        const mode = document.querySelector('input[name="start-mode"]:checked').value;
        const totalSteps = mode === "chat" ? 1 : mode === "condensed" ? 2 : mode === "presummary" ? 3 : 4;
        const step = (n, msg) => { engineStatus.textContent = `Step ${n} of ${totalSteps}: ${msg}`; };
        const astep = (n, msg, sub) => {
            analysisStatus.textContent = `Step ${n} of ${totalSteps}: ${msg}`;
            if (sub) analysisSubtext.textContent = sub;
        };

        // Step 1: Initialize WebLLM (skip if already loaded via offline setup button)
        if (!engine) {
            step(1, "Loading AI Engine...");
            engineSubtext.textContent = "First time only: downloading ~2GB model weights. This may take several minutes.";
            const initProgressCallback = (progress) => {
                initProgress.style.width = Math.round(progress.progress * 100) + "%";
                engineSubtext.textContent = progress.text;
            };
            engine = await CreateMLCEngine(MODEL_ID, {
                initProgressCallback,
                chatOpts: { context_window_size: 6144 }
            });
        } else {
            step(1, "AI Engine ready.");
            initProgress.style.width = "100%";
            engineSubtext.textContent = "Model already loaded \u2014 skipping download.";
        }

        // Hide init box, show analysis box (unless chat only mode)
        engineStatus.parentElement.classList.add("hidden");
        
        let masterPlot = "";

        if (mode === "chat") {
            // Bypass all text processing and jump straight to the chat
            analysisProgress.style.width = "100%";
            
            // Set up chat Persona
            let personaSysPrompt = "You are an expert literary agent and author's assistant. Help the user brainstorm, edit, and discuss writing.";
            const selectedPersona = chatPersonaSelect.value;
            
            if (selectedPersona === "grammar") {
                personaSysPrompt = "You are an expert grammar and style editor. The user will provide text snippets, and you will rigorously check for grammar, flow, passive voice, and stylistic improvements.";
            } else if (selectedPersona === "marketing") {
                personaSysPrompt = "You are an expert book marketer and copywriter. Help the user craft highly engaging ad copy, back-cover blurbs, Amazon keywords, and webpage text that converts readers.";
            } else if (selectedPersona === "custom") {
                const customTxt = chatPersonaCustom.value.trim();
                if (customTxt) personaSysPrompt = customTxt;
            }
            
            chatMessages = [{ role: 'system', content: personaSysPrompt }];
            const historyEl = document.getElementById('chat-history');
            historyEl.innerHTML = `<div style="color: var(--color-accent); font-style: italic;">Agent: I am ready! How can I help you today?</div>`;
            
            // Hide other tabs
            document.querySelectorAll(".tab-btn").forEach(b => {
                if (b.getAttribute("data-target") !== "chat-content") b.style.display = "none";
                else { b.classList.add("active"); b.style.display = "block"; }
            });
            document.querySelectorAll(".tab-content").forEach(c => {
                if (c.id !== "chat-content") c.classList.remove("active");
                else c.classList.add("active");
            });

            loadingPanel.classList.add("hidden");
            resultsPanel.classList.remove("hidden");
            return; // EXIT EARLY
        }

        analysisStatusBox.classList.remove("hidden");

        if (mode === "condensed") {
            // Skip directly to final analysis
            masterPlot = pasteTextArea.value.trim();
            astep(2, "Using provided condensed plot...", "Skipping to final analysis.");
            analysisProgress.style.width = "100%";
        } else if (mode === "presummary") {
            // Start from condense phase
            masterPlot = pasteTextArea.value.trim();
            astep(2, "Condensing provided summary...", "Reducing to master plot...");
        } else {
            // 2. Map Phase: Summarize Chunks (full novel)
            const separator = chapterSeparatorInput.value;
            const chunks = chunkText(novelText, CHUNK_SIZE, CHUNK_OVERLAP, separator);
            const summaries = [];

            astep(2, "Reading your novel...", `Summarizing Part 1 of ${chunks.length}`);
            for (let i = 0; i < chunks.length; i++) {
                analysisSubtext.textContent = `Summarizing Part ${i + 1} of ${chunks.length}`;
                analysisProgress.style.width = Math.round(((i) / chunks.length) * 100) + "%";

                let prompt = `You are an expert literary editor. Read the following excerpt from a novel.\n`;
                if (glossaryText !== "") {
                    prompt += `\n--- GLOSSARY OF TERMS ---\n${glossaryText}\n-------------------------\n`;
                }
                if (additionalInstructionsInput.value.trim() !== "") {
                    prompt += `\n--- AUTHOR CONSTRAINTS ---\n${additionalInstructionsInput.value}\n-------------------------\n`;
                }
                prompt += `\nTask 1: Summarize the key plot events, character developments, and setting details in this excerpt in about 200 words. Adhere strictly to the worldbuilding constraints provided.\n\nExcerpt:\n${chunks[i]}\n\nProvide ONLY the summary text, without conversational filler.`;

                const reply = await engine.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3
                });
                summaries.push(reply.choices[0].message.content.trim());
            }
            analysisProgress.style.width = "100%";
            masterPlot = summaries.join("\n\n");
        }

        // Save pre-condensed summary so user can download the full abridged version
        sessionStorage.setItem('llm_pre_summary', masterPlot);

        // 3. Intermediate Reduce Phase (if too long)
        // Each summary is ~200 words ≈ 270 tokens. Keep condense chunks small.
        while (masterPlot.length > 8000) {
            const condenseSt = mode === 'novel' ? 3 : 2;
            astep(condenseSt, "Condensing master plot...", "Reducing summaries...");
            analysisProgress.style.width = "0%";
            const plotChunks = chunkText(masterPlot, CONDENSE_CHUNK_SIZE, CONDENSE_OVERLAP, null);
            const condensedSummaries = [];

            for (let i = 0; i < plotChunks.length; i++) {
                analysisSubtext.textContent = `Condensing Part ${i + 1} of ${plotChunks.length}`;
                analysisProgress.style.width = Math.round(((i) / plotChunks.length) * 100) + "%";

                const p = `Condense this into 150 words. Output ONLY the condensed text, no preamble:\n\n${plotChunks[i]}`;
                const reply = await engine.chat.completions.create({
                    messages: [{ role: "user", content: p }],
                    temperature: 0.3
                });
                condensedSummaries.push(reply.choices[0].message.content.trim());
            }
            masterPlot = condensedSummaries.join("\n\n");
        }

        // -----------------------------------------------------------------------
        // FINAL ANALYSIS — one dedicated call per section so nothing gets cut off
        // -----------------------------------------------------------------------
        const finalSt = mode === 'novel' ? 4 : mode === 'presummary' ? 3 : 2;

        let contextBlock = "";
        if (glossaryText !== "") contextBlock += `\n--- USER GLOSSARY ---\n${glossaryText}\n`;
        if (additionalInstructionsInput.value.trim() !== "") contextBlock += `\n--- AUTHOR CONSTRAINTS ---\n${additionalInstructionsInput.value}\n`;
        if (contextBlock !== "") contextBlock += `\nCRITICAL INSTRUCTION: You must strictly adhere to the constraints above.\n---\n`;

        const checkboxes = document.querySelectorAll('.checkbox-grid input[type="checkbox"]:checked');
        const sections = [];
        checkboxes.forEach(cb => sections.push(cb.value));

        const totalSub = sections.length + 1; // +1 for the map
        let currentSub = 0;

        // Render LLM output to HTML.
        // Keywords get a special bullet-list treatment so the model can't accidentally
        // output them as headings (which happens when it copies the # heading pattern).
        const toHtml = (text, isKeywords = false) => {
            if (isKeywords) {
                const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                const kLines = lines.filter(l => !/^#+\s/.test(l)); // drop any accidental heading line
                const bullets = kLines.map(l => `<li>${l.replace(/^[-*•\d.]+\s*/, '')}</li>`).join('');
                return `<ul style="margin:10px 0 0 20px;line-height:2;">${bullets}</ul>`;
            }
            return text
                .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        };

        let rawAnalysis = '';
        let compsRawText = '';
        analysisOutput.innerHTML = '';

        function tickSub(label) {
            currentSub++;
            astep(finalSt, `Analysis \u2014 ${label}`, `Section ${currentSub} of ${totalSub}`);
            analysisProgress.style.width = Math.round(((currentSub - 1) / totalSub) * 100) + '%';
        }

        // heading is rendered as <h1> above the section body
        function appendSection(heading, bodyHtml, bodyRaw) {
            analysisOutput.innerHTML += `<h1>${heading}</h1>${bodyHtml}`;
            rawAnalysis += (rawAnalysis ? '\n\n' : '') + `# ${heading}\n${bodyRaw}`;
        }

        const basePlot = `You are an expert literary marketer and publishing agent. Below is the master plot summary of a novel.\n\n--- BEGIN MASTER PLOT SUMMARY ---\n${masterPlot}\n--- END MASTER PLOT SUMMARY ---\n\n${contextBlock}`;

        for (const key of sections) {
            tickSub(key);

            if (key === 'Elevator Pitch') {
                const replyE = await engine.chat.completions.create({
                    messages: [{ role: 'user', content:
                        `You are a literary marketing expert. Based on this plot summary, write a single Elevator Pitch using the "It's [Author/Book] meets [Author/Book]" format. Follow with one sentence explaining the comparison. Output ONLY the pitch and that sentence — no heading, no preamble, no labels.\n\nPLOT SUMMARY:\n${masterPlot.slice(0, 2000)}` }],
                    temperature: getTemp('temp-elevator'),
                    max_tokens: 150
                });
                const epText = replyE.choices[0].message.content.trim();
                appendSection('Elevator Pitch',
                    `<p style="margin-top:8px;">${epText.replace(/\n/g, '<br>')}</p>`,
                    epText);
                continue;
            }

            let prompt = '';
            let temp = 0.35;
            let isKeywords = false;

            if (key === 'Analysis & Brainstorming') {
                temp = getTemp('temp-brainstorm');
                prompt = `${basePlot}Write a brief analytical paragraph covering the novel's core themes, narrative voice, and story arc. Then list 3-5 potential comparable authors or works as a brainstorm. Output ONLY the analysis text — no section heading, no preamble.`;
            } else if (key === 'Comparable Authors') {
                temp = getTemp('temp-comps');
                prompt = `${basePlot}Suggest exactly 3 to 5 real, published comparable authors whose readership overlaps with this novel. For each author, name a specific book or series and explain in one sentence exactly why it is a strong match for this novel's themes, tone, and audience. Output ONLY the author list — no section heading, no preamble.`;
            } else if (key === 'Genres & Subgenres') {
                temp = getTemp('temp-brainstorm');
                prompt = `${basePlot}Identify the primary genre and between 4 and 6 specific subgenres or genre tags this novel belongs to. Output ONLY a plain list — one genre per line, no numbers, no bullet characters, no heading. After each genre name, add a colon and ONE sentence explaining why it fits.\nExample:\nScience Fiction: The novel focuses on futuristic technology and space travel.\nCyberpunk: The protagonist is a hacker fighting a megacorporation.\nDystopian: The society is heavily surveilled and oppressive.`;
            } else if (key === 'Amazon Keywords') {
                temp = getTemp('temp-brainstorm');
                isKeywords = true;
                prompt = `${basePlot}Provide exactly 7 SEO-friendly Amazon Kindle keywords or marketing tropes for this novel. Output ONLY the 7 keywords as a plain list — one per line, no numbers, no bullet characters, no heading, no explanation. Example format:\nenemies to lovers\nspace opera\nfound family\nslow burn romance\ndystopian YA\nDo NOT use character names or invented in-universe terms from the novel.`;
            } else if (key === 'Back-Cover Blurb') {
                temp = getTemp('temp-blurb');
                prompt = `${basePlot}Write an engaging back-cover blurb of approximately 120-150 words. Do NOT reveal the ending or major spoilers — stop at the inciting incident or main conflict. Write in present tense, marketing voice. Output ONLY the blurb text — no section heading, no preamble.`;
            }

            const reply = await engine.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                temperature: temp
            });
            const text = reply.choices[0].message.content;
            if (key === 'Comparable Authors') compsRawText = text;
            appendSection(key, toHtml(text, isKeywords), text);
        }

        plotOutput.textContent = masterPlot;
        sessionStorage.setItem('llm_analysis_html', analysisOutput.innerHTML);
        sessionStorage.setItem('llm_analysis_text', rawAnalysis);
        sessionStorage.setItem('llm_master_plot', masterPlot);

        // -----------------------------------------------------------------------
        // AUTHOR MAP — anchored to comp authors for consistency, then expanded
        // to a wider 20-author landscape. targetNovelPosition is the novel's
        // true coordinates in this broader space (used by the legend thumbnail).
        // The main chart always centres the novel at (0,0).
        // -----------------------------------------------------------------------
        tickSub('Author Map');
        analysisSubtext.textContent = 'Mapping authors across the literary landscape\u2026';

        const compAnchorBlock = compsRawText
            ? `IMPORTANT \u2014 ANCHOR AUTHORS: The following comparable authors were identified for this novel. You MUST include ALL of them, placed relatively close to center (0,0) since they are the closest matches. Then fill the remaining spots with contrasting authors spread across the full \u221210 to +10 range to show a wide literary landscape.\n\n${compsRawText}\n\nReach 20 authors total.`
            : 'Brainstorm 20 real authors spanning a wide range on your chosen axes.';

        const mapPrompt = `You are an expert literature analyst. Below is the plot summary of a target novel.

--- TARGET NOVEL PLOT ---
${masterPlot}
--- END PLOT ---

Your task: generate a JSON payload mapping 20 real authors onto a 2D literary landscape.
The novel sits at the center of the main chart (0, 0). Authors are placed by how their writing DIFFERS from the novel on the axes you define.

"targetNovelPosition" is the novel's TRUE coordinates in the broader literary landscape (NOT always 0,0). It is used only in the legend thumbnail to show where the novel sits relative to the wider world. You MUST evaluate the novel's actual tone and choose a meaningful value, e.g., {"x": 7.2, "y": -3.8}. Do not just copy the example.

STEP 1 \u2014 Define Axes
Choose two broad literary dimensions that perfectly capture the essence of THIS specific novel (e.g. Pacing, Tone, Worldbuilding Scope, Character vs. Plot Focus, Darkness, Romance vs Action, etc.). Do not just use Pacing and Focus unless they are the best fit.

STEP 2 \u2014 Place Authors
${compAnchorBlock}

Spread authors across the FULL \u221210 to +10 range. Do NOT cluster everything near 0. Authors very similar to the novel go near (0,0); extreme contrasts go near \u00b110.

CRITICAL: Output ONLY valid JSON. No markdown. No explanation.

Schema (follow exactly):
{
  "targetNovelPosition": { "x": [Insert your calculated X coordinate from -10 to 10], "y": [Insert your calculated Y coordinate from -10 to 10] },
  "xAxis": { "name": "[Your Axis 1 Name]", "negative": "[Negative Descriptor]", "positive": "[Positive Descriptor]" },
  "yAxis": { "name": "[Your Axis 2 Name]", "negative": "[Negative Descriptor]", "positive": "[Positive Descriptor]" },
  "authors": [
    { "name": "Author Name", "novel": "Specific Title", "x": 2.5, "y": -4.0, "genre": "Primary Genre", "connection": "One sentence on why they relate to the target novel." }
  ]
}`;

        const mapReply = await engine.chat.completions.create({
            messages: [{ role: 'user', content: mapPrompt }],
            temperature: getTemp('temp-map')
        });

        let jsonStr = mapReply.choices[0].message.content.trim();
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        let mapData = null;
        try {
            mapData = JSON.parse(jsonStr);
            renderChart(mapData);
            sessionStorage.setItem('llm_map_data', JSON.stringify(mapData));
        } catch (e) {
            console.error("JSON Parse Error:", e, jsonStr);
            axesInfo.innerHTML = "Failed to parse map data. Try re-running the analysis.";
        }

        analysisProgress.style.width = '100%';
        
        // Initialize chat for novel analysis
        const novelContext = "You are an expert Literary Agent. You just analyzed the user's novel. Be concise, insightful, and helpful. Do not use markdown headers.";
        chatMessages = [{ role: 'system', content: novelContext }];
        const historyEl = document.getElementById('chat-history');
        historyEl.innerHTML = `<div style="color: var(--color-accent); font-style: italic;">Agent: I've finished reading your novel. What would you like to discuss?</div>`;
        
        loadingPanel.classList.add("hidden");
        resultsPanel.classList.remove("hidden");

    } catch (error) {
        console.error(error);
        alert("An error occurred during analysis: " + error.message);
        loadingPanel.classList.add("hidden");
        setupPanel.classList.remove("hidden");
    }
}

// --- Session Recovery ---

function checkForSavedSession() {
    const savedHtml = sessionStorage.getItem('llm_analysis_html');
    const savedMap = sessionStorage.getItem('llm_map_data');
    if (savedHtml && savedMap) {
        document.getElementById('restore-banner').classList.remove('hidden');
    }
}

function restoreSession() {
    const savedHtml = sessionStorage.getItem('llm_analysis_html');
    const savedMap = sessionStorage.getItem('llm_map_data');
    const savedPlot = sessionStorage.getItem('llm_master_plot');
    const savedChat = sessionStorage.getItem('lit-LLM_chat');
    
    if (savedHtml) analysisOutput.innerHTML = savedHtml;
    if (savedPlot) plotOutput.textContent = savedPlot;
    if (savedMap) {
        try { renderChart(JSON.parse(savedMap)); }
        catch (e) { console.warn('Could not restore map:', e); }
    }
    
    if (savedChat) {
        try { 
            chatMessages = JSON.parse(savedChat);
            const historyEl = document.getElementById('chat-history');
            historyEl.innerHTML = '<div style="color: var(--color-accent); font-style: italic;">Agent: I\'ve finished reading your novel. What would you like to discuss?</div>';
            for (const msg of chatMessages) {
                if (msg.role === 'system') continue;
                appendChatMsg(msg.role === 'user' ? 'You' : 'Agent', msg.content, msg.role === 'user' ? '#C9B037' : '#F4F1D6');
            }
        }
        catch (e) { console.warn('Could not restore chat:', e); }
    }
    
    setupPanel.classList.add('hidden');
    resultsPanel.classList.remove('hidden');
    document.getElementById('restore-banner').classList.add('hidden');
}

function clearSession() {
    sessionStorage.clear();
    document.getElementById('restore-banner').classList.add('hidden');
}

// --- Download Functions ---

function downloadAnalysis() {
    const text = sessionStorage.getItem('llm_analysis_text') || analysisOutput.innerText;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'literary_analysis.txt'; a.click();
    URL.revokeObjectURL(url);
}

function downloadPlotSummary() {
    const text = sessionStorage.getItem('llm_master_plot') || plotOutput.textContent;
    if (!text.trim()) { alert('No plot summary available yet.'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'master_plot_summary.txt'; a.click();
    URL.revokeObjectURL(url);
}

function downloadPreSummary() {
    const text = sessionStorage.getItem('llm_pre_summary');
    if (!text || !text.trim()) { alert('No pre-summary available. This is only generated during a full novel or pre-summarized run.'); return; }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pre_summary_abridged.txt'; a.click();
    URL.revokeObjectURL(url);
}

function drawQuadrantMap(ctx, qx, qy, md) {
    const trunc = (s, n = 10) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    const yP = trunc(shortLabel(md.yAxis.positive));
    const yN = trunc(shortLabel(md.yAxis.negative));
    const xP = trunc(shortLabel(md.xAxis.positive));
    const xN = trunc(shortLabel(md.xAxis.negative));

    ctx.fillStyle = "rgba(201,176,55,0.06)"; ctx.fillRect(qx - 52, qy - 52, 52, 52);
    ctx.fillStyle = "rgba(201,176,55,0.11)"; ctx.fillRect(qx, qy - 52, 52, 52);
    ctx.fillStyle = "rgba(201,176,55,0.04)"; ctx.fillRect(qx - 52, qy, 52, 52);
    ctx.fillStyle = "rgba(201,176,55,0.09)"; ctx.fillRect(qx, qy, 52, 52);

    ctx.strokeStyle = "rgba(201,176,55,0.3)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(qx - 52, qy); ctx.lineTo(qx + 52, qy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(qx, qy - 52); ctx.lineTo(qx, qy + 52); ctx.stroke();

    const tX = md.targetNovelPosition ? (md.targetNovelPosition.x / 10) * 46 : 0;
    const tY = md.targetNovelPosition ? -(md.targetNovelPosition.y / 10) * 46 : 0;

    // Just the star — no circle underneath
    ctx.fillStyle = "#F4F1D6";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("★", qx + tX, qy + tY);

    ctx.fillStyle = "#C9B037"; ctx.font = "8px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(yP, qx, qy - 59);
    ctx.fillText(yN, qx, qy + 59);
    ctx.fillText(xN, qx - 57, qy);
    ctx.fillText(xP, qx + 57, qy);
}

function downloadChart() {
    const canvas = document.getElementById('authorChart');
    const LEGEND_H = 140; // Space for quadrant map
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height + LEGEND_H;
    const offCtx = offscreen.getContext('2d');

    // Dark background matching site theme
    offCtx.fillStyle = '#0F100A';
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    // Chart
    offCtx.drawImage(canvas, 0, 0);

    // Legend text
    const rawMap = sessionStorage.getItem('llm_map_data');
    if (rawMap) {
        const md = JSON.parse(rawMap);
        const qx = 80;
        const qy = canvas.height + 70;

        drawQuadrantMap(offCtx, qx, qy, md);

        offCtx.fillStyle = '#F4F1D6';
        offCtx.font = 'bold 12px Inter, sans-serif';
        offCtx.textAlign = 'left';
        offCtx.fillText("Quadrant Map Legend", qx + 80, qy - 10);

        offCtx.fillStyle = '#A39634';
        offCtx.font = '11px Inter, sans-serif';
        offCtx.fillText("The ★ shows where your novel sits relative to the literary landscape. Authors nearby share", qx + 80, qy + 5);
        offCtx.fillText("similar characteristics; those further away represent stronger contrasts on the defined axes.", qx + 80, qy + 20);
    }

    const link = document.createElement('a');
    link.download = 'author_map.png';
    link.href = offscreen.toDataURL('image/png');
    link.click();
}

function downloadChartHtml() {
    const rawMap = sessionStorage.getItem('llm_map_data');
    if (!rawMap) { alert('No map data to save yet.'); return; }
    const mapData = JSON.parse(rawMap);
    const xAxis = mapData.xAxis || { name: 'X-Axis', negative: 'Left', positive: 'Right' };
    const yAxis = mapData.yAxis || { name: 'Y-Axis', negative: 'Bottom', positive: 'Top' };

    const trunc = (s, n = 12) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    const xN = trunc(shortLabel(xAxis.negative)), xP = trunc(shortLabel(xAxis.positive));
    const yN = trunc(shortLabel(yAxis.negative)), yP = trunc(shortLabel(yAxis.positive));

    const tX = mapData.targetNovelPosition ? (mapData.targetNovelPosition.x / 10) * 46 : 0;
    const tY = mapData.targetNovelPosition ? -(mapData.targetNovelPosition.y / 10) * 46 : 0;

    const escapeXml = (unsafe) => unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });

    const safeXN = escapeXml(xN), safeXP = escapeXml(xP);
    const safeYN = escapeXml(yN), safeYP = escapeXml(yP);

    const svg = `<svg viewBox="-75 -75 150 150" width="150" height="150" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
      <rect x="-52" y="-52" width="52" height="52" fill="rgba(201,176,55,0.06)" rx="2"/>
      <rect x="0"   y="-52" width="52" height="52" fill="rgba(201,176,55,0.11)" rx="2"/>
      <rect x="-52" y="0"   width="52" height="52" fill="rgba(201,176,55,0.04)" rx="2"/>
      <rect x="0"   y="0"   width="52" height="52" fill="rgba(201,176,55,0.09)" rx="2"/>
      <line x1="-52" y1="0" x2="52" y2="0" stroke="rgba(201,176,55,0.3)" stroke-width="1.2"/>
      <line x1="0" y1="-52" x2="0" y2="52" stroke="rgba(201,176,55,0.3)" stroke-width="1.2"/>
      <polygon points="52,0 47,-3 47,3" fill="rgba(201,176,55,0.5)"/>
      <polygon points="-52,0 -47,-3 -47,3" fill="rgba(201,176,55,0.5)"/>
      <polygon points="0,-52 -3,-47 3,-47" fill="rgba(201,176,55,0.5)"/>
      <polygon points="0,52 -3,47 3,47" fill="rgba(201,176,55,0.5)"/>
      <text x="0" y="-59" text-anchor="middle" fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif">${safeYP}</text>
      <text x="0" y="68"  text-anchor="middle" fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif">${safeYN}</text>
      <text x="-54" y="0" text-anchor="end"    fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif" dominant-baseline="middle">${safeXN}</text>
      <text x="54"  y="0" text-anchor="start"  fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif" dominant-baseline="middle">${safeXP}</text>
      <text x="${tX}" y="${tY}" text-anchor="middle" fill="#F4F1D6" font-size="12" font-family="Inter,sans-serif" dominant-baseline="middle">★</text>
    </svg>`;

    const labelPluginStr = `{
        id: 'labelLeader',
        afterDatasetsDraw(chart) {
            const meta = chart.getDatasetMeta(1);
            if (!meta || !meta.data.length) return;
            const authors = chart.data.datasets[1].data;
            const ctx = chart.ctx;
            const area = chart.chartArea;
            const labels = [];
            const occupied = [];
            meta.data.forEach(pt => occupied.push({ x: pt.x - 5, y: pt.y - 5, w: 10, h: 10 }));
            const targetPt = chart.getDatasetMeta(0).data[0];
            if (targetPt) occupied.push({ x: targetPt.x - 10, y: targetPt.y - 10, w: 20, h: 20 });
            const directions = [
                { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
                { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
            ];
            meta.data.forEach((point, i) => {
                const text = authors[i].name.split(' ').pop();
                ctx.font = '10px Inter, sans-serif';
                const w = ctx.measureText(text).width + 6;
                const h = 14;
                let bestPos = null; let minOverlap = Infinity;
                for (let r = 12; r <= 60; r += 12) {
                    for (const pos of directions) {
                        const len = Math.hypot(pos.dx, pos.dy);
                        const nx = pos.dx / len, ny = pos.dy / len;
                        const cx = point.x + nx * (r + w / 2), cy = point.y + ny * (r + h / 2);
                        const box = { x: cx - w / 2, y: cy - h / 2, w, h };
                        let overlap = 0;
                        for (const occ of occupied) {
                            const ox = Math.max(0, Math.min(box.x + box.w, occ.x + occ.w) - Math.max(box.x, occ.x));
                            const oy = Math.max(0, Math.min(box.y + box.h, occ.y + occ.h) - Math.max(box.y, occ.y));
                            overlap += ox * oy;
                        }
                        if (box.x < area.left || box.x + box.w > area.right || box.y < area.top || box.y + box.h > area.bottom) overlap += 10000;
                        if (overlap < minOverlap) { minOverlap = overlap; bestPos = { cx, cy, box, nx, ny }; }
                        if (overlap === 0) break;
                    }
                    if (minOverlap === 0) break;
                }
                labels.push({ text, dotX: point.x, dotY: point.y, x: bestPos.cx, y: bestPos.cy, nx: bestPos.nx, ny: bestPos.ny });
                occupied.push(bestPos.box);
            });
            ctx.save();
            labels.forEach(l => {
                ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1; ctx.beginPath();
                ctx.moveTo(l.dotX + l.nx * 4, l.dotY + l.ny * 4);
                ctx.lineTo(l.x - l.nx * (ctx.measureText(l.text).width / 2 + 2), l.y - l.ny * 6);
                ctx.stroke();
                ctx.fillStyle = '#cbd5e1'; ctx.font = '10px Inter, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(l.text, l.x, l.y);
            });
            ctx.restore();
        }
    }`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Author Comparison Map</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
<style>
  body { background: #0F100A; color: #F4F1D6; font-family: Inter, sans-serif; display:flex; flex-direction:column; align-items:center; padding: 30px; margin: 0; }
  h1 { font-size: 1.5rem; margin-bottom: 20px; color: #C9B037; }
  .chart-wrap { width: 900px; height: 650px; background: rgba(255,255,255,0.03); border: 1px solid rgba(201,176,55,0.3); border-radius: 12px; padding: 15px; }
  .legend-wrap { display:flex; gap:16px; align-items:center; margin-top: 15px; width: 900px; background: rgba(255,255,255,0.03); padding: 10px 16px; border-radius: 8px; border: 1px solid rgba(201,176,55,0.3); }
</style>
</head>
<body>
<h1>Author Comparison Map</h1>
<div class="chart-wrap"><canvas id="c"></canvas></div>
<div class="legend-wrap">
    ${svg}
    <div style="flex:1;min-width:0;font-size:0.8rem;color:#A39634;">
        <strong style="color:#C9B037;">Quadrant Map Legend</strong><br>
        The ★ shows where your novel sits relative to the literary landscape.
        Authors nearby share similar characteristics on both axes; those further away represent stronger contrasts.
    </div>
</div>
<script>
const mapData = ${JSON.stringify(mapData)};
function shortLabel(s) {
    s = String(s).replace(/^[+\\-]?\\d+\\s*:?\\s*/i, '').replace(/^label[:\\s]*/i, '').trim();
    return s;
}
const novelX = mapData.targetNovelPosition ? mapData.targetNovelPosition.x : 0;
const novelY = mapData.targetNovelPosition ? mapData.targetNovelPosition.y : 0;
const authors = mapData.authors.map(a => ({ x: a.x, y: a.y, name: a.name, novel: a.novel, genre: a.genre, connection: a.connection }));
Chart.register(${labelPluginStr});
new Chart(document.getElementById('c').getContext('2d'), {
  type: 'scatter',
  data: {
    datasets: [
      { label: 'Your Novel', data: [{ x: 0, y: 0, info: true }], backgroundColor:'#ef4444', pointRadius:10, pointHoverRadius:13 },
      { label: 'Comparable Authors', data: authors, backgroundColor:'#A39634', pointRadius:7, pointHoverRadius:10, datalabels: {display: false} }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { left: 16, right: 8, top: 8, bottom: 8 } },
    scales: {
      x: { title:{display:true,text:'\\u2190 ' + shortLabel(mapData.xAxis.negative) + '  |  ' + mapData.xAxis.name.toUpperCase() + '  |  ' + shortLabel(mapData.xAxis.positive) + ' \\u2192',color:'#F4F1D6',font:{size:13, weight:'bold'}}, min:-10,max:10, grid:{color:'rgba(201,176,55,0.1)'}, ticks:{color:'#A39634'} },
      y: { title:{display:true,text:'\\u2190 ' + shortLabel(mapData.yAxis.negative) + '  |  ' + mapData.yAxis.name.toUpperCase() + '  |  ' + shortLabel(mapData.yAxis.positive) + ' \\u2192',color:'#F4F1D6',font:{size:13, weight:'bold'}}, min:-10,max:10, grid:{color:'rgba(201,176,55,0.1)'}, ticks:{color:'#A39634'} }
    },
    plugins: {
      legend: { labels:{color:'#F4F1D6'} },
      tooltip: {
        backgroundColor:'rgba(15,16,10,0.95)', titleColor:'#C9B037', bodyColor:'#F4F1D6', borderColor:'rgba(201,176,55,0.3)', borderWidth:1, padding:12,
        callbacks: {
          label: ctx => {
            const r = ctx.raw;
            if (r.info) return ['\\u2b50 Your Novel', 'Everything is plotted relative to this'];
            return ['\\ud83d\\udcd6 ' + r.name + ' \\u2014 "' + r.novel + '"', 'Genre: ' + r.genre, 'Why: ' + r.connection];
          }
        }
      }
    }
  }
});
<\/script>
</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'author_map.html';
    a.click();
    URL.revokeObjectURL(url);
}

// Expose to global scope for HTML onclick
window.restoreSession = restoreSession;
window.clearSession = clearSession;
window.downloadAnalysis = downloadAnalysis;
window.downloadPlotSummary = downloadPlotSummary;
window.downloadPreSummary = downloadPreSummary;
window.downloadChart = downloadChart;
window.downloadChartHtml = downloadChartHtml;

// Check for saved session on load
checkForSavedSession();

// --- Label Leader-Line Plugin ---
// Uses an 8-directional search to place each label as close to its dot as possible without overlapping others
const labelLeaderPlugin = {
    id: 'labelLeader',
    afterDatasetsDraw(chart) {
        const meta = chart.getDatasetMeta(1);
        if (!meta || !meta.data.length) return;
        const authors = chart.data.datasets[1].data;
        const ctx = chart.ctx;
        const area = chart.chartArea;

        const labels = [];
        const occupied = []; // bounding boxes

        // Reserve space for dots
        meta.data.forEach(pt => {
            occupied.push({ x: pt.x - 5, y: pt.y - 5, w: 10, h: 10 });
        });
        const targetPt = chart.getDatasetMeta(0).data[0];
        if (targetPt) occupied.push({ x: targetPt.x - 10, y: targetPt.y - 10, w: 20, h: 20 });

        const directions = [
            { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 },
            { dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }
        ];

        meta.data.forEach((point, i) => {
            const text = authors[i].name.split(' ').pop();
            ctx.font = '10px Inter, sans-serif';
            const w = ctx.measureText(text).width + 6;
            const h = 14;
            let bestPos = null;
            let minOverlap = Infinity;

            for (let r = 12; r <= 60; r += 12) {
                for (const pos of directions) {
                    const len = Math.hypot(pos.dx, pos.dy);
                    const nx = pos.dx / len, ny = pos.dy / len;
                    const cx = point.x + nx * (r + w / 2);
                    const cy = point.y + ny * (r + h / 2);
                    const box = { x: cx - w / 2, y: cy - h / 2, w, h };

                    let overlap = 0;
                    for (const occ of occupied) {
                        const ox = Math.max(0, Math.min(box.x + box.w, occ.x + occ.w) - Math.max(box.x, occ.x));
                        const oy = Math.max(0, Math.min(box.y + box.h, occ.y + occ.h) - Math.max(box.y, occ.y));
                        overlap += ox * oy;
                    }

                    // Heavy penalty for going outside chart area
                    if (box.x < area.left || box.x + box.w > area.right || box.y < area.top || box.y + box.h > area.bottom) {
                        overlap += 10000;
                    }

                    if (overlap < minOverlap) {
                        minOverlap = overlap;
                        bestPos = { cx, cy, box, nx, ny };
                    }
                    if (overlap === 0) break; // perfect spot found at this radius
                }
                if (minOverlap === 0) break; // perfect spot found, stop expanding radius
            }

            labels.push({ text, dotX: point.x, dotY: point.y, x: bestPos.cx, y: bestPos.cy, nx: bestPos.nx, ny: bestPos.ny });
            occupied.push(bestPos.box);
        });

        ctx.save();
        labels.forEach(l => {
            // Draw leader line
            ctx.strokeStyle = 'rgba(148,163,184,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(l.dotX + l.nx * 4, l.dotY + l.ny * 4);
            ctx.lineTo(l.x - l.nx * (ctx.measureText(l.text).width / 2 + 2), l.y - l.ny * 6);
            ctx.stroke();

            // Draw text
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(l.text, l.x, l.y);
        });
        ctx.restore();
    }
};

let authorChartInstance = null;

// --- Chart Rendering ---

// Strips any literal schema placeholders the LLM may copy (e.g. "-10 ", "+10 label:")
// and returns the first 2 words so axis/legend labels stay short.
function shortLabel(s) {
    s = String(s)
        .replace(/^[+\-]?\d+\s*:?\s*/i, '')  // leading ±10 or -10:
        .replace(/^label[:\s]*/i, '')           // leading "label:"
        .trim();
    return s;
}

function renderChart(mapData) {
    if (authorChartInstance) {
        authorChartInstance.destroy();
    }
    const xAxis = mapData.xAxis || { name: 'X-Axis', negative: 'Left', positive: 'Right' };
    const yAxis = mapData.yAxis || { name: 'Y-Axis', negative: 'Bottom', positive: 'Top' };

    axesInfo.innerHTML =
        `<b>${xAxis.name}:</b> ${shortLabel(xAxis.negative)} ← · → ${shortLabel(xAxis.positive)} &nbsp;|&nbsp;
         <b>${yAxis.name}:</b> ${shortLabel(yAxis.negative)} ↓ · ↑ ${shortLabel(yAxis.positive)}`;

    // Novel stays at (0,0) on the main chart — everything is relative to it
    const targetNovel = {
        label: 'Your Novel',
        data: [{ x: 0, y: 0, info: "Your novel — everything is plotted relative to this" }],
        backgroundColor: '#ef4444',
        pointRadius: 10,
        pointHoverRadius: 12
    };

    const authorPoints = mapData.authors.map(author => ({
        x: author.x,
        y: author.y,
        name: author.name,
        novel: author.novel,
        genre: author.genre,
        connection: author.connection
    }));

    const authorDataset = {
        label: 'Comparable Authors',
        data: authorPoints,
        backgroundColor: '#A39634',
        pointRadius: 6,
        pointHoverRadius: 8,
        datalabels: { display: false }  // handled by labelLeaderPlugin
    };

    Chart.register(ChartDataLabels);
    Chart.register(labelLeaderPlugin);
    const ctx = document.getElementById('authorChart').getContext('2d');

    authorChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: [targetNovel, authorDataset] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                // Extra left padding so the rotated y-axis title isn't clipped
                padding: { left: 16, right: 8, top: 8, bottom: 8 }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: `\u2190 ${shortLabel(xAxis.negative)}  |  ${xAxis.name.toUpperCase()}  |  ${shortLabel(xAxis.positive)} \u2192`,
                        color: '#F4F1D6',
                        font: { size: 13, weight: 'bold' }
                    },
                    min: -10, max: 10,
                    grid: { color: 'rgba(201,176,55,0.1)' },
                    ticks: { color: '#A39634' }
                },
                y: {
                    title: {
                        display: true,
                        text: `\u2190 ${shortLabel(yAxis.negative)}  |  ${yAxis.name.toUpperCase()}  |  ${shortLabel(yAxis.positive)} \u2192`,
                        color: '#F4F1D6',
                        font: { size: 13, weight: 'bold' }
                    },
                    min: -10, max: 10,
                    grid: { color: 'rgba(201,176,55,0.1)' },
                    ticks: { color: '#A39634' }
                }
            },
            plugins: {
                legend: { labels: { color: '#F4F1D6' } },
                tooltip: {
                    backgroundColor: 'rgba(15, 16, 10, 0.95)',
                    titleColor: '#C9B037',
                    bodyColor: '#F4F1D6',
                    borderColor: 'rgba(201, 176, 55, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (context) {
                            const raw = context.raw;
                            if (raw.info) {
                                return ["📍 Your Novel", raw.info];
                            }
                            return [
                                `📖 ${raw.name} — "${raw.novel}"`,
                                `Genre: ${raw.genre}`,
                                `Why: ${raw.connection}`
                            ];
                        }
                    }
                },
                datalabels: {
                    color: '#cbd5e1',
                    font: { size: 10, family: 'Inter' },
                    textAlign: 'center',
                    clamp: true,
                    anchor: function (ctx) {
                        const v = ctx.dataset.data[ctx.dataIndex];
                        if (!v || v.info) return 'end';
                        return v.y >= 0 ? 'end' : 'start';
                    },
                    align: function (ctx) {
                        const v = ctx.dataset.data[ctx.dataIndex];
                        if (!v || v.info) return 'top';
                        if (Math.abs(v.x) >= Math.abs(v.y)) {
                            return v.x >= 0 ? 'right' : 'left';
                        }
                        return v.y >= 0 ? 'top' : 'bottom';
                    },
                    offset: 5,
                    formatter: function (value) {
                        if (value.info) return '⭐ Your Novel';
                        // Show only last name to reduce overlap; full detail is in the tooltip
                        return value.name.split(' ').pop();
                    }
                }
            }
        }
    });

    // Populate the HTML axis legend below the chart
    renderAxisLegend(xAxis, yAxis, mapData.targetNovelPosition);
}

function renderAxisLegend(xAxis, yAxis, targetPos) {
    const el = document.getElementById('axis-legend');
    if (!el) return;

    // Truncate long labels to keep SVG tidy
    const trunc = (s, n = 12) => s.length > n ? s.slice(0, n - 1) + '…' : s;
    const xN = trunc(shortLabel(xAxis.negative)), xP = trunc(shortLabel(xAxis.positive));
    const yN = trunc(shortLabel(yAxis.negative)), yP = trunc(shortLabel(yAxis.positive));

    // Map the novel's actual position onto the 46-unit SVG half-axis
    const tX = targetPos ? (targetPos.x / 10) * 46 : 0;
    const tY = targetPos ? -(targetPos.y / 10) * 46 : 0;

    const posLabel = targetPos
        ? `Your novel (★) sits at (${targetPos.x?.toFixed(1)}, ${targetPos.y?.toFixed(1)}) — `
        : '';

    const svg = `<svg viewBox="-75 -75 150 150" width="150" height="150" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0">
      <rect x="-52" y="-52" width="52" height="52" fill="rgba(201,176,55,0.06)" rx="2"/>
      <rect x="0"   y="-52" width="52" height="52" fill="rgba(201,176,55,0.11)" rx="2"/>
      <rect x="-52" y="0"   width="52" height="52" fill="rgba(201,176,55,0.04)" rx="2"/>
      <rect x="0"   y="0"   width="52" height="52" fill="rgba(201,176,55,0.09)" rx="2"/>
      <line x1="-52" y1="0" x2="52" y2="0" stroke="rgba(201,176,55,0.3)" stroke-width="1.2"/>
      <line x1="0" y1="-52" x2="0" y2="52" stroke="rgba(201,176,55,0.3)" stroke-width="1.2"/>
      <polygon points="52,0 47,-3 47,3" fill="rgba(201,176,55,0.5)"/>
      <polygon points="-52,0 -47,-3 -47,3" fill="rgba(201,176,55,0.5)"/>
      <polygon points="0,-52 -3,-47 3,-47" fill="rgba(201,176,55,0.5)"/>
      <polygon points="0,52 -3,47 3,47" fill="rgba(201,176,55,0.5)"/>
      <text x="0" y="-59" text-anchor="middle" fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif">${yP}</text>
      <text x="0" y="68"  text-anchor="middle" fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif">${yN}</text>
      <text x="-54" y="0" text-anchor="end"    fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif" dominant-baseline="middle">${xN}</text>
      <text x="54"  y="0" text-anchor="start"  fill="#C9B037" font-size="7.5" font-family="Inter,sans-serif" dominant-baseline="middle">${xP}</text>
      <text x="${tX}" y="${tY}" text-anchor="middle" fill="#F4F1D6" font-size="12" font-family="Inter,sans-serif" dominant-baseline="middle">★</text>
    </svg>`;

    el.innerHTML = `
        <div style="display:flex;gap:16px;align-items:center;">
            ${svg}
            <div style="flex:1;min-width:0;font-size:0.8rem;">
                <strong>Quadrant Map Legend</strong><br>
                ${posLabel}the ★ shows where your novel sits relative to the literary landscape.
                Authors nearby share similar characteristics on both axes; those further away represent stronger contrasts.
            </div>
        </div>`;
    el.classList.remove('hidden');
}

// Expose functions to global scope for inline HTML event handlers
window.restoreSession = restoreSession;
window.clearSession = clearSession;
window.downloadAnalysis = downloadAnalysis;
window.downloadPlotSummary = downloadPlotSummary;
window.downloadPreSummary = downloadPreSummary;
window.downloadChart = downloadChart;
window.downloadChartHtml = downloadChartHtml;

// --- Interactive Chat Logic ---
let chatMessages = []; // Will store {role: "user"|"assistant", content: "..."}

window.sendChatMessage = async function() {
    const inputEl = document.getElementById('chat-input');
    const msg = inputEl.value.trim();
    if (!msg) return;
    
    // Clear input
    inputEl.value = '';
    
    // Add user message to UI
    appendChatMsg('You', msg, '#C9B037');
    chatMessages.push({role: "user", content: msg});
    
    // Save to storage
    sessionStorage.setItem('lit-LLM_chat', JSON.stringify(chatMessages));

    if (!engine) {
        appendChatMsg('Agent', '[Error: Engine not loaded. Did you run the analysis first? (If you restored a session, you must reload the AI Engine on the main page to chat.)]', '#ff6b6b');
        return;
    }

    const statusEl = document.getElementById('chat-status');
    const sendBtn = document.getElementById('chat-send-btn');
    statusEl.classList.remove('hidden');
    sendBtn.disabled = true;

    // Read standalone chat temperature value
    const chatTempEl = document.getElementById('chat-temp');
    let chatTemp = 0.6;
    if (chatTempEl) {
        const val = parseFloat(chatTempEl.value);
        if (!isNaN(val)) chatTemp = Math.min(1.0, Math.max(0.1, val));
    }

    try {
        // Implement rolling history window to prevent context overflow:
        // Always keep the system persona/context prompt (first message) and add the last 12 messages.
        const messagesToSend = [chatMessages[0]];
        if (chatMessages.length > 1) {
            messagesToSend.push(...chatMessages.slice(1).slice(-12));
        }

        const response = await engine.chat.completions.create({
            messages: messagesToSend,
            temperature: chatTemp,
        });

        const reply = response.choices[0].message.content;
        appendChatMsg('Agent', reply, '#F4F1D6');
        chatMessages.push({role: "assistant", content: reply});
        sessionStorage.setItem('lit-LLM_chat', JSON.stringify(chatMessages));

    } catch (e) {
        appendChatMsg('Agent', '[Error generating response: ' + e.message + ']', '#ff6b6b');
    } finally {
        statusEl.classList.add('hidden');
        sendBtn.disabled = false;
    }
}

function appendChatMsg(sender, text, color) {
    const historyEl = document.getElementById('chat-history');
    const div = document.createElement('div');
    div.style.marginBottom = "0.5rem";
    
    const b = document.createElement('b');
    b.textContent = sender + ": ";
    b.style.color = color;
    
    const span = document.createElement('span');
    span.style.color = 'var(--color-text-main)';
    span.style.whiteSpace = 'pre-wrap';
    span.textContent = text;
    
    div.appendChild(b);
    div.appendChild(span);
    
    historyEl.appendChild(div);
    historyEl.scrollTop = historyEl.scrollHeight;
}

window.downloadChat = function() {
    if (chatMessages.length === 0) {
        alert("No chat history to download.");
        return;
    }
    let text = "--- Adham's Literary Agent Chat ---\\n\\n";
    for(const m of chatMessages) {
        const role = m.role === 'user' ? 'You' : 'Agent';
        text += `[${role}]:\\n${m.content}\\n\\n`;
    }
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Literary_Agent_Chat_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}
