// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// This file is part of the Playwright Dashboard.

// Socket.IO verbinding
const socket = io();

// Registreer sessie bij server
socket.on('connect', () => {
    socket.emit('register-session');
});

// DOM elementen
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Tab switching
function switchTab(targetTab) {
    console.log('Switching to tab:', targetTab);
    
    // Verwijder active class van alle tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    // Voeg active class toe aan geklikte tab
    const targetBtn = document.querySelector(`[data-tab="${targetTab}"]`);
    const targetContent = document.getElementById(`${targetTab}-tab`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
    
    // Laad data voor de tab
    if (targetTab === 'tests') loadTests();
    if (targetTab === 'videos') loadVideos();
    if (targetTab === 'screenshots') loadScreenshots();
    if (targetTab === 'scheduled') loadScheduledTestsUI();
    if (targetTab === 'ai-agent') {
        loadAiConfig();
        loadSiteAgents();
        loadMcpTools(); // Laad MCP tools bij openen AI Agent tab
    }
}

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = tab.dataset.tab;
        switchTab(targetTab);
    });
});

// Tests laden
async function loadTests() {
    const testsList = document.getElementById('tests-list');
    testsList.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch('/api/tests');
        const tests = await response.json();
        
        if (tests.length === 0) {
            testsList.innerHTML = '<div class="card"><p>Geen tests gevonden. Maak een nieuwe test aan!</p></div>';
            return;
        }
        
        testsList.innerHTML = tests.map(test => `
            <div class="card" data-test="${test.file}">
                <div class="card-header">
                    <h3><i class="fa-solid fa-flask"></i> ${test.name}</h3>
                    <span class="status-badge status-info">.spec.js</span>
                </div>
                <div class="card-meta">
                    <span><i class="fa-regular fa-file-code"></i> ${test.file}</span>
                </div>
                <div class="actions">
                    <button class="btn btn-success btn-sm" onclick="runTest('${test.file}', false)"><i class="fa-solid fa-play"></i> Uitvoeren</button>
                    <button class="btn btn-primary btn-sm" onclick="runTest('${test.file}', true)"><i class="fa-solid fa-eye"></i> Met Browser</button>
                    <button class="btn btn-warning btn-sm" onclick="editTest('${test.name}')"><i class="fa-solid fa-pen"></i> Bewerken</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTest('${test.name}')"><i class="fa-solid fa-trash"></i> Verwijderen</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        testsList.innerHTML = `<div class="card"><p>Fout bij laden van tests: ${error.message}</p></div>`;
    }
}

// Video's laden
async function loadVideos() {
    const videosList = document.getElementById('videos-list');
    videosList.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch('/api/videos');
        const videos = await response.json();
        
        if (videos.length === 0) {
            videosList.innerHTML = '<div class="card"><p>Geen video\'s gevonden. Voer eerst tests uit!</p></div>';
            return;
        }
        
        videosList.innerHTML = videos.map(video => `
            <div class="card video-card">
                <h3>${video.name}</h3>
                <video controls>
                    <source src="${video.path}" type="video/webm">
                    Je browser ondersteunt geen WebM video.
                </video>
                <a href="${video.path}" download class="btn btn-secondary">Downloaden</a>
            </div>
        `).join('');
    } catch (error) {
        videosList.innerHTML = `<div class="card"><p>Fout bij laden van video's: ${error.message}</p></div>`;
    }
}

// Screenshots laden
async function loadScreenshots() {
    const screenshotsList = document.getElementById('screenshots-list');
    screenshotsList.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch('/api/screenshots');
        const screenshots = await response.json();
        
        if (screenshots.length === 0) {
            screenshotsList.innerHTML = '<div class="card"><p>Geen screenshots gevonden. Voer tests uit die falen!</p></div>';
            return;
        }
        
        screenshotsList.innerHTML = screenshots.map(screenshot => `
            <div class="card screenshot-card">
                <h3>${screenshot.name}</h3>
                <img src="${screenshot.path}" alt="${screenshot.name}" onclick="openImage('${screenshot.path}')">
                <a href="${screenshot.path}" download class="btn btn-secondary">Downloaden</a>
            </div>
        `).join('');
    } catch (error) {
        screenshotsList.innerHTML = `<div class="card"><p>Fout bij laden van screenshots: ${error.message}</p></div>`;
    }
}

// Test uitvoeren
async function runTest(testFile, headed) {
    const outputPanel = document.getElementById('test-output');
    const outputText = document.getElementById('output-text');
    
    outputPanel.classList.remove('hidden');
    outputText.textContent = `Test wordt uitgevoerd: ${testFile}...\n`;
    
    try {
        const response = await fetch('/api/run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testFile, headed })
        });
        
        const result = await response.json();
        outputText.textContent = result.output || 'Geen output';
        
        if (result.success) {
            outputText.textContent += '\nTest succesvol uitgevoerd!';
        } else {
            outputText.textContent += '\nTest bevat fouten (zie output hierboven)';
        }
        
        setTimeout(() => {
            loadVideos();
            loadScreenshots();
        }, 1000);
        
    } catch (error) {
        outputText.textContent = `Fout: ${error.message}`;
    }
}

// Alle tests uitvoeren
async function runAllTests() {
    const outputPanel = document.getElementById('test-output');
    const outputText = document.getElementById('output-text');
    
    outputPanel.classList.remove('hidden');
    outputText.textContent = 'Alle tests worden uitgevoerd...\n';
    
    try {
        const response = await fetch('/api/run-all-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        outputText.textContent = result.output || 'Geen output';
        
        if (result.success) {
            outputText.textContent += '\nAlle tests uitgevoerd!';
        } else {
            outputText.textContent += '\nSommige tests bevatten fouten';
        }
        
        setTimeout(() => {
            loadVideos();
            loadScreenshots();
        }, 1000);
        
    } catch (error) {
        outputText.textContent = `Fout: ${error.message}`;
    }
}

// Test verwijderen
async function deleteTest(testName) {
    if (!confirm(`Weet je zeker dat je "${testName}" wilt verwijderen?`)) return;
    
    try {
        const response = await fetch(`/api/delete-test/${testName}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Test verwijderd!');
            loadTests();
        } else {
            alert('Fout bij verwijderen: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Test bewerken laden
async function editTest(testName) {
    try {
        const response = await fetch(`/api/test/${testName}`);
        const result = await response.json();
        
        if (!response.ok) {
            alert('Fout: ' + result.error);
            return;
        }
        
        document.getElementById('test-name').value = testName;
        document.getElementById('test-name').readOnly = false; // Naam is nu bewerkbaar
        document.getElementById('test-name').dataset.originalName = testName; // Bewaar originele naam
        document.getElementById('test-code').value = result.content;
        
        // Verander knoptekst
        const createBtn = document.getElementById('create-test-btn');
        createBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Opslaan';
        createBtn.onclick = () => updateTest(testName);
        
        switchTab('create');
        
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Test bewerken opslaan
async function updateTest(originalTestName) {
    const newName = document.getElementById('test-name').value.trim();
    const code = document.getElementById('test-code').value.trim();
    
    if (!newName || !code) {
        alert('Vul naam en code in!');
        return;
    }
    
    try {
        const response = await fetch(`/api/test/${originalTestName}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, newName })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Test "${newName}" bijgewerkt!`);
            
            // Reset formulier
            document.getElementById('test-name').value = '';
            document.getElementById('test-name').dataset.originalName = '';
            document.getElementById('test-code').value = '';
            
            const createBtn = document.getElementById('create-test-btn');
            createBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Test Aanmaken';
            createBtn.onclick = createTest;
            
            switchTab('tests');
            loadTests();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// === SNIPPET HELPER FUNCTIONS ===

const snippets = {
    template: `const { test, expect } = require('@playwright/test');

test('NAAM', async ({ page }) => {
  // Je code hier
});`,
    goto: `  await page.goto('URL');`,
    click: `  await page.locator('SELECTOR').click();`,
    fill: `  await page.locator('SELECTOR').fill('TEKST');`,
    expectText: `  await expect(page.locator('SELECTOR')).toHaveText('TEKST');`,
    expectVisible: `  await expect(page.locator('SELECTOR')).toBeVisible();`,
    expectPrice: `  // Controleer prijs/bedrag
  const priceText = await page.locator('SELECTOR').textContent();
  expect(priceText).toContain('BEDRAG');`,
    screenshot: `  await page.screenshot({ path: 'screenshots/NAAM.png', fullPage: true });`,
    wait: `  await page.waitForTimeout(1000);`,
    video: `  // Video wordt automatisch opgenomen als je test.video instelt in config
  // Zie handleiding voor video setup`
};

function insertSnippet(type) {
    const textarea = document.getElementById('test-code');
    const snippet = snippets[type] || '';
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    textarea.value = before + snippet + after;
    
    // Zet cursor na de snippet
    const newCursor = start + snippet.length;
    textarea.setSelectionRange(newCursor, newCursor);
    textarea.focus();
}

// === CODE ZOEK FUNCTIONALITEIT ===

let codeSearchMatches = [];
let currentMatchIndex = -1;

function searchInCode() {
    const searchInput = document.getElementById('code-search-input');
    const textarea = document.getElementById('test-code');
    const countSpan = document.getElementById('code-search-count');
    
    const query = searchInput.value.trim();
    if (!query) {
        clearCodeSearch();
        return;
    }
    
    const text = textarea.value;
    codeSearchMatches = [];
    
    // Vind alle matches (case-insensitive)
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    let pos = 0;
    
    while ((pos = lowerText.indexOf(lowerQuery, pos)) !== -1) {
        codeSearchMatches.push({
            start: pos,
            end: pos + query.length
        });
        pos += 1;
    }
    
    if (codeSearchMatches.length > 0) {
        currentMatchIndex = 0;
        highlightMatch();
    } else {
        currentMatchIndex = -1;
    }
    
    updateSearchCount();
}

function highlightMatch() {
    const textarea = document.getElementById('test-code');
    
    if (currentMatchIndex >= 0 && currentMatchIndex < codeSearchMatches.length) {
        const match = codeSearchMatches[currentMatchIndex];
        textarea.focus();
        textarea.setSelectionRange(match.start, match.end);
        
        // Scroll naar selectie (werkt in moderne browsers)
        const textBefore = textarea.value.substring(0, match.start);
        const linesBefore = textBefore.split('\n').length;
        const lineHeight = 20; // geschatte regelhoogte
        textarea.scrollTop = (linesBefore - 3) * lineHeight;
    }
}

function findNextMatch() {
    if (codeSearchMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex + 1) % codeSearchMatches.length;
    highlightMatch();
    updateSearchCount();
}

function findPrevMatch() {
    if (codeSearchMatches.length === 0) return;
    
    currentMatchIndex = (currentMatchIndex - 1 + codeSearchMatches.length) % codeSearchMatches.length;
    highlightMatch();
    updateSearchCount();
}

function clearCodeSearch() {
    const searchInput = document.getElementById('code-search-input');
    const countSpan = document.getElementById('code-search-count');
    const textarea = document.getElementById('test-code');
    
    searchInput.value = '';
    codeSearchMatches = [];
    currentMatchIndex = -1;
    countSpan.textContent = '0/0';
    
    // Verwijder selectie
    const cursorPos = textarea.selectionStart;
    textarea.setSelectionRange(cursorPos, cursorPos);
}

function updateSearchCount() {
    const countSpan = document.getElementById('code-search-count');
    if (codeSearchMatches.length > 0) {
        countSpan.textContent = `${currentMatchIndex + 1}/${codeSearchMatches.length}`;
    } else {
        countSpan.textContent = '0/0';
    }
}

// Keyboard shortcuts voor zoeken
document.addEventListener('keydown', (e) => {
    // Ctrl+F of Cmd+F in test-code textarea
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const textarea = document.getElementById('test-code');
        if (document.activeElement === textarea) {
            e.preventDefault();
            document.getElementById('code-search-input').focus();
        }
    }
    
    // Escape om zoeken te sluiten
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('code-search-input');
        if (document.activeElement === searchInput) {
            clearCodeSearch();
            document.getElementById('test-code').focus();
        }
    }
    
    // Enter in zoekveld = volgende match
    if (e.key === 'Enter' && document.activeElement === document.getElementById('code-search-input')) {
        e.preventDefault();
        if (e.shiftKey) {
            findPrevMatch();
        } else {
            findNextMatch();
        }
    }
});

// Nieuwe test maken
async function createTest() {
    const name = document.getElementById('test-name').value.trim();
    const code = document.getElementById('test-code').value.trim();
    
    if (!name || !code) {
        alert('Vul een naam en code in!');
        return;
    }
    
    try {
        const response = await fetch('/api/create-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Test "${name}" aangemaakt!`);
            document.getElementById('test-name').value = '';
            document.getElementById('test-code').value = '';
            
            switchTab('tests');
            loadTests();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Codegen starten
async function startCodegen() {
    const url = document.getElementById('codegen-url').value.trim();
    const statusDiv = document.getElementById('codegen-status');
    
    if (!url) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = 'Vul een URL in!';
        statusDiv.style.display = 'block';
        return;
    }
    
    try {
        statusDiv.className = 'status-message';
        statusDiv.textContent = 'Codegen wordt gestart... Even geduld.';
        statusDiv.style.display = 'block';
        
        const response = await fetch('/api/codegen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.className = 'status-message success';
            statusDiv.innerHTML = `
                Codegen gestart voor ${url}!<br>
                Er opent een browser venster (kan even duren).<br>
                Voer je handelingen uit en kopieer de code.<br>
                Plak de code daarna in "Nieuwe Test" tab.<br>
                <br>
                <strong>Tip:</strong> Als er geen venster opent, controleer of je browsers geinstalleerd zijn met npx playwright install.
            `;
        } else {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = 'Fout: ' + result.error;
        }
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = 'Fout: ' + error.message;
    }
}

// Afbeelding openen in nieuw venster
function openImage(src) {
    window.open(src, '_blank');
}

// === SCHEDULED TESTS FUNCTIONS ===

// Laad beschikbare tests in de dropdown
async function loadTestsForSchedule() {
    const select = document.getElementById('scheduled-test-select');
    try {
        const response = await fetch('/api/tests');
        const tests = await response.json();
        
        select.innerHTML = '<option value="">-- Kies een test --</option>';
        tests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.file;
            option.textContent = test.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Fout bij laden tests voor schedule:', error);
    }
}

// Laad geplande tests
async function loadScheduledTestsUI() {
    const list = document.getElementById('scheduled-list');
    list.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch('/api/scheduled-tests');
        const scheduled = await response.json();
        
        if (scheduled.length === 0) {
            list.innerHTML = '<div class="card"><p>Geen geplande tests. Voeg er een toe!</p></div>';
            return;
        }
        
        list.innerHTML = scheduled.map(test => {
            const lastRun = test.lastRun ? new Date(test.lastRun).toLocaleString('nl-NL') : 'Nooit';
            const status = test.enabled ? 'Actief' : 'Gepauzeerd';
            const statusClass = test.enabled ? 'success' : 'warning';
            const resultIcon = test.lastResult === 'success' ? '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>' : test.lastResult === 'failed' ? '<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i>' : '<i class="fa-regular fa-clock" style="color:var(--text-muted)"></i>';
            
            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${resultIcon} ${test.testFile}</h3>
                        <span class="status-badge status-${statusClass}">${status}</span>
                    </div>
                    <div class="card-meta">
                        <span><i class="fa-regular fa-clock"></i> Elke ${test.intervalMinutes} min</span>
                        <span><i class="fa-regular fa-calendar"></i> ${lastRun}</span>
                    </div>
                    <div class="actions">
                        <button class="btn btn-success btn-sm" onclick="runScheduledTestNow('${test.id}')"><i class="fa-solid fa-play"></i> Nu Draaien</button>
                        <button class="btn btn-secondary btn-sm" onclick="toggleScheduledTest('${test.id}', ${!test.enabled})">${test.enabled ? '<i class="fa-solid fa-pause"></i> Pauzeren' : '<i class="fa-solid fa-play"></i> Hervatten'}</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteScheduledTest('${test.id}')"><i class="fa-solid fa-trash"></i> Verwijderen</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        list.innerHTML = `<div class="card"><p>Fout bij laden geplande tests: ${error.message}</p></div>`;
    }
}

// Voeg geplande test toe
async function addScheduledTest() {
    const testFile = document.getElementById('scheduled-test-select').value;
    const interval = document.getElementById('scheduled-interval').value;
    
    if (!testFile) {
        alert('Kies een test!');
        return;
    }
    
    try {
        const response = await fetch('/api/scheduled-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testFile, intervalMinutes: parseInt(interval), enabled: true })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Test gepland!`);
            loadScheduledTestsUI();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Toggle geplande test (aan/uit)
async function toggleScheduledTest(id, enabled) {
    try {
        const response = await fetch(`/api/scheduled-tests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadScheduledTestsUI();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Verwijder geplande test
async function deleteScheduledTest(id) {
    if (!confirm('Weet je zeker dat je deze geplande test wilt verwijderen?')) return;
    
    try {
        const response = await fetch(`/api/scheduled-tests/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            loadScheduledTestsUI();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Draai geplande test nu
async function runScheduledTestNow(id) {
    try {
        const response = await fetch(`/api/scheduled-tests/${id}/run-now`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Test wordt nu uitgevoerd!');
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// ============================================
// AI AGENT FUNCTIONALITEIT
// ============================================

let currentSiteAgent = null;
let chatHistory = [];

// ============================================
// MENU TOGGLE — Inklapbaar navigatiemenu
// ============================================

function toggleMenu() {
    const nav = document.getElementById('main-nav');
    const body = document.body;
    const btn = document.getElementById('menu-toggle-btn');
    
    if (!nav) return;
    
    const isCollapsed = nav.classList.toggle('collapsed');
    body.classList.toggle('menu-collapsed', isCollapsed);
    
    // Update knop icoon
    if (btn) {
        btn.querySelector('.menu-toggle-icon').innerHTML = isCollapsed ? '<i class="fa-solid fa-bars"></i>' : '<i class="fa-solid fa-xmark"></i>';
        btn.title = isCollapsed ? 'Menu uitklappen' : 'Menu inklappen';
    }
    
    // Sla staat op in localStorage
    localStorage.setItem('menuCollapsed', isCollapsed ? 'true' : 'false');
}

// Herstel menu staat bij laden
function restoreMenuState() {
    const isCollapsed = localStorage.getItem('menuCollapsed') === 'true';
    if (isCollapsed) {
        const nav = document.getElementById('main-nav');
        const body = document.body;
        const btn = document.getElementById('menu-toggle-btn');
        
        if (nav) nav.classList.add('collapsed');
        body.classList.add('menu-collapsed');
        
        if (btn) {
            btn.querySelector('.menu-toggle-icon').innerHTML = '<i class="fa-solid fa-bars"></i>';
            btn.title = 'Menu uitklappen';
        }
    }
}

// Herstel menu staat bij DOM ready
document.addEventListener('DOMContentLoaded', restoreMenuState);

// Laad AI configuratie
async function loadAiConfig() {
    try {
        const response = await fetch('/api/ai-config');
        const config = await response.json();
        
        document.getElementById('ai-provider').value = config.provider || 'openai';
        document.getElementById('ai-model').value = config.model || '';
        document.getElementById('ai-endpoint').value = config.endpoint || '';
        
        // Toon/verberg velden afhankelijk van provider
        const provider = config.provider || 'openai';
        const endpointGroup = document.getElementById('ai-endpoint-group');
        const apiKeyGroup = document.getElementById('ai-apikey-group');
        
        endpointGroup.style.display = (provider === 'azure' || provider === 'ollama') ? 'block' : 'none';
        apiKeyGroup.style.display = (provider === 'ollama') ? 'none' : 'block';
        
        // Probeer modellen op te halen
        // Voor Ollama: altijd proberen (geen key nodig)
        // Voor andere: alleen als er een key is
        const hasKey = config.apiKey && !config.apiKey.startsWith('••••');
        if (provider === 'ollama' || hasKey) {
            await fetchAiModels();
            // Selecteer opgeslagen model
            const modelSelect = document.getElementById('ai-model-select');
            if (modelSelect && config.model) {
                // Check of model in dropdown bestaat
                let found = false;
                for (let opt of modelSelect.options) {
                    if (opt.value === config.model) {
                        opt.selected = true;
                        found = true;
                        break;
                    }
                }
                // Als niet gevonden, voeg toe als custom
                if (!found && config.model) {
                    const customOpt = document.createElement('option');
                    customOpt.value = config.model;
                    customOpt.textContent = config.model + ' (custom)';
                    customOpt.selected = true;
                    modelSelect.appendChild(customOpt);
                }
            }
        }
        
    } catch (error) {
        console.error('Fout bij laden AI config:', error);
    }
}

// Haal beschikbare modellen op
async function fetchAiModels() {
    const btn = document.getElementById('ai-fetch-models-btn');
    const select = document.getElementById('ai-model-select');
    const provider = document.getElementById('ai-provider').value;
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    try {
        const response = await fetch('/api/ai-models');
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Fout bij ophalen modellen');
        }
        
        const models = await response.json();
        
        // Bewaar huidige selectie
        const currentValue = select.value;
        
        // Vul dropdown
        select.innerHTML = '<option value="">-- Kies een model --</option>';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            if (model.id === currentValue) option.selected = true;
            select.appendChild(option);
        });
        
        // Voeg custom optie toe
        const customOpt = document.createElement('option');
        customOpt.value = '__custom__';
        customOpt.textContent = 'Handmatig invoeren...';
        select.appendChild(customOpt);
        
    } catch (error) {
        console.error('Fout bij ophalen modellen:', error);
        // Fallback: laat handmatig invoer toe
        select.innerHTML = `
            <option value="">-- Kies een model --</option>
            <option value="__custom__">Handmatig invoeren...</option>
        `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
    }
}

// Model selectie veranderd
document.getElementById('ai-model-select').addEventListener('change', (e) => {
    const select = e.target;
    const manualInput = document.getElementById('ai-model');
    
    if (select.value === '__custom__') {
        manualInput.style.display = 'block';
        manualInput.focus();
    } else if (select.value) {
        manualInput.value = select.value;
        manualInput.style.display = 'none';
    } else {
        manualInput.style.display = 'none';
    }
});

// Sla AI configuratie op
async function saveAiConfig() {
    const modelSelect = document.getElementById('ai-model-select');
    const modelInput = document.getElementById('ai-model');
    
    // Bepaal model waarde
    let model = '';
    if (modelSelect.value && modelSelect.value !== '__custom__') {
        model = modelSelect.value;
    } else {
        model = modelInput.value.trim();
    }
    
    const config = {
        provider: document.getElementById('ai-provider').value,
        apiKey: document.getElementById('ai-api-key').value,
        model: model,
        endpoint: document.getElementById('ai-endpoint').value
    };
    
    try {
        const response = await fetch('/api/ai-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        const statusDiv = document.getElementById('ai-config-status');
        
        if (result.success) {
            statusDiv.className = 'status-message success';
            statusDiv.textContent = '✅ Configuratie opgeslagen!';
            statusDiv.style.display = 'block';
        } else {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = '❌ Fout: ' + result.error;
            statusDiv.style.display = 'block';
        }
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        const statusDiv = document.getElementById('ai-config-status');
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Fout: ' + error.message;
        statusDiv.style.display = 'block';
    }
}

// Laad site agents
async function loadSiteAgents() {
    const list = document.getElementById('site-agents-list');
    list.innerHTML = '<div class="loading"></div>';
    
    try {
        const response = await fetch('/api/site-agents');
        const agents = await response.json();
        
        if (agents.length === 0) {
            list.innerHTML = '<div class="card"><p>Geen sites geregistreerd.</p></div>';
            return;
        }
        
        list.innerHTML = agents.map(agent => `
            <div class="agent-item ${currentSiteAgent?.id === agent.id ? 'active' : ''}" 
                 onclick="selectSiteAgent('${agent.id}')"
                 data-id="${agent.id}">
                <div class="agent-icon"><i class="fa-solid fa-building"></i></div>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-url">${agent.baseUrl}</div>
                </div>
                <div class="agent-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editSiteAgent('${agent.id}')" title="Bewerken"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deleteSiteAgent('${agent.id}')" title="Verwijderen"><i class="fa-solid fa-trash"></i></button>
                </div>
                <div class="agent-status ${agent.isLearned ? 'learned' : ''}">
                    ${agent.isLearned ? '<i class="fa-solid fa-brain"></i>' : '<i class="fa-regular fa-clock"></i>'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        list.innerHTML = `<div class="card"><p>Fout bij laden: ${error.message}</p></div>`;
    }
}

// Selecteer site agent
async function selectSiteAgent(id) {
    try {
        const response = await fetch(`/api/site-agents/${id}`);
        const agent = await response.json();
        
        if (!response.ok) {
            alert('Fout: ' + agent.error);
            return;
        }
        
        currentSiteAgent = agent;
        chatHistory = [];
        
        // Wis oude chat berichten
        document.getElementById('ai-chat-messages').innerHTML = '';
        
        // Update UI
        document.querySelectorAll('.agent-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === id);
        });
        
        document.getElementById('ai-chat-container').classList.remove('hidden');
        
        // Verberg test editor
        const testEditor = document.getElementById('test-editor-panel');
        if (testEditor) testEditor.classList.add('hidden');
        
        document.getElementById('ai-chat-site-name').textContent = agent.name;
        
        // Welkom bericht
        addChatMessage('bot', `Hallo! Ik ben je test agent voor **${agent.name}**.\n\n${agent.isLearned 
            ? 'Ik heb deze site al geanalyseerd. Stel me een vraag of vraag me om een test te genereren!'
            : 'Ik heb deze site nog niet geanalyseerd. Klik op "🧠 Analyseren" om me te leren kennen!'
        }`);
        
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Verwijder site agent
async function deleteSiteAgent(id) {
    if (!confirm('Weet je zeker dat je deze site wilt verwijderen?')) return;
    
    try {
        const response = await fetch(`/api/site-agents/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reset huidige agent als deze was geselecteerd
            if (currentSiteAgent?.id === id) {
                currentSiteAgent = null;
                document.getElementById('ai-chat-container').classList.add('hidden');
                document.getElementById('ai-chat-messages').innerHTML = '';
            }
            
            loadSiteAgents();
            addChatMessage('bot', `✅ Site agent verwijderd!`);
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Bewerk site agent
async function editSiteAgent(id) {
    try {
        const response = await fetch(`/api/site-agents/${id}`);
        const agent = await response.json();
        
        if (!response.ok) {
            alert('Fout: ' + agent.error);
            return;
        }
        
        // Vul modal met bestaande waarden
        document.getElementById('new-site-name').value = agent.name || '';
        document.getElementById('new-site-url').value = agent.baseUrl || '';
        document.getElementById('new-site-desc').value = agent.description || '';
        document.getElementById('new-site-username').value = agent.credentials?.username || '';
        document.getElementById('new-site-password').value = agent.credentials?.password || '';
        
        // Selecteer skills
        document.querySelectorAll('#new-site-skills .skill-tag').forEach(tag => {
            tag.classList.toggle('selected', (agent.skills || []).includes(tag.dataset.skill));
        });
        
        // Open modal
        document.getElementById('site-agent-modal').classList.remove('hidden');
        
        // Sla originele ID op voor update
        document.getElementById('site-agent-modal').dataset.editId = id;
        
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Toon site kennis
function showSiteKnowledge(agent) {
    const container = document.getElementById('ai-knowledge-content');
    
    if (!agent.isLearned) {
        container.innerHTML = '<p><i class="fa-solid fa-file-pen"></i> Site nog niet geanalyseerd. Klik op "<i class="fa-solid fa-brain"></i> Analyseren".</p>';
        return;
    }
    
    let html = '<div class="knowledge-grid">';
    
    // Meta info
    html += `
        <div class="knowledge-card">
            <h4><i class="fa-solid fa-circle-info"></i> Algemeen</h4>
            <ul>
                <li><strong>Titel:</strong> ${agent.meta?.title || 'Onbekend'}</li>
                <li><strong>URL:</strong> ${agent.meta?.url || agent.baseUrl}</li>
                <li><strong>Geanalyseerd:</strong> ${new Date(agent.learnedAt).toLocaleString('nl-NL')}</li>
            </ul>
        </div>
    `;
    
    // Selectors
    if (Object.keys(agent.selectors || {}).length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-bullseye"></i> Selectors</h4>
                <ul>
                    ${Object.entries(agent.selectors).map(([key, val]) => `
                        <li><strong>${key}:</strong> ${val}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Forms
    if (agent.forms?.length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-pen-to-square"></i> Formulieren (${agent.forms.length})</h4>
                <ul>
                    ${agent.forms.map((form, i) => `
                        <li>Form ${i+1}: ${form.inputs?.length || 0} velden</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Navigation
    if (agent.navigation?.length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-compass"></i> Navigatie (${agent.navigation.length})</h4>
                <ul>
                    ${agent.navigation.slice(0, 10).map(nav => `
                        <li>${nav.label || nav.path}</li>
                    `).join('')}
                    ${agent.navigation.length > 10 ? `<li>... en ${agent.navigation.length - 10} meer</li>` : ''}
                </ul>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Skills
    if (agent.skills?.length > 0) {
        html += `
            <div class="knowledge-card" style="margin-top:16px;">
                <h4><i class="fa-solid fa-bolt"></i> Skills</h4>
                <div class="agent-skills">
                    ${agent.skills.map(skill => {
                        const skillLabels = {
                            login: '<i class="fa-solid fa-lock"></i> Login',
                            forms: '<i class="fa-solid fa-pen-to-square"></i> Formulieren',
                            navigation: '<i class="fa-solid fa-compass"></i> Navigatie',
                            ecommerce: '<i class="fa-solid fa-cart-shopping"></i> E-commerce',
                            search: '<i class="fa-solid fa-magnifying-glass"></i> Zoeken',
                            api: '<i class="fa-solid fa-plug"></i> API Testing',
                            accessibility: '<i class="fa-solid fa-universal-access"></i> Accessibility',
                            performance: '<i class="fa-solid fa-bolt"></i> Performance'
                        };
                        return `<span class="agent-skill-badge">${skillLabels[skill] || skill}</span>`;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // Linked tests
    if (agent.linkedTests?.length > 0) {
        html += `
            <div class="knowledge-card" style="margin-top:16px;">
                <h4><i class="fa-solid fa-link"></i> Gekoppelde Tests (${agent.linkedTests.length})</h4>
                <div class="linked-tests-list">
                    ${agent.linkedTests.map(testFile => `
                        <div class="linked-test-item">
                            <span class="test-icon"><i class="fa-solid fa-flask"></i></span>
                            <span class="test-name">${testFile.replace('.spec.js', '')}</span>
                            <button class="btn btn-success btn-sm test-run-btn" onclick="runTest('${testFile}', false)"><i class="fa-solid fa-play"></i></button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// Voeg chat bericht toe
function addChatMessage(role, content, extraData = null) {
    const messagesDiv = document.getElementById('ai-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    
    const avatar = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
    
    // Convert markdown to HTML
    let formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    // Convert markdown images to HTML img tags
    formattedContent = formattedContent.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g, 
        '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin-top:8px; border:1px solid #ddd;">'
    );
    
    // Voeg extra UI toe voor AI fixes
    let extraHtml = '';
    if (extraData && extraData.type === 'test-fix') {
        extraHtml = `
            <div class="ai-fix-panel">
                <div class="ai-fix-header"><i class="fa-solid fa-wrench"></i> AI Fix Voorgesteld</div>
                <div class="ai-fix-explanation">${extraData.explanation || ''}</div>
                <div class="ai-fix-actions">
                    <button class="btn btn-success btn-sm" onclick="applyAiFix('${extraData.testFile}', \`${extraData.fixedCode.replace(/`/g, '\\`')}\`)"><i class="fa-solid fa-check"></i> Pas Fix Toe</button>
                    <button class="btn btn-secondary btn-sm" onclick="runFixedTest('${extraData.testFile}')"><i class="fa-solid fa-play"></i> Test Uitvoeren</button>
                </div>
                ${extraData.screenshotPath ? `<div class="ai-fix-screenshot">
                    <img src="${extraData.screenshotPath}" alt="Fout screenshot" style="max-width:100%; border-radius:8px; margin-top:8px;">
                </div>` : ''}
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">${formattedContent}${extraHtml}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Sla op in geschiedenis
    chatHistory.push({ role, content });
}

// Analyseer gefaalde test met AI
async function analyzeTestFailure(testFile) {
    if (!currentSiteAgent) {
        alert('Selecteer eerst een site agent!');
        return;
    }
    
    addChatMessage('bot', `🔍 Ik ga de test "${testFile}" analyseren om te zien wat er fout ging...`);
    
    try {
        const response = await fetch('/api/analyze-test-failure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                testFile,
                siteAgentId: currentSiteAgent.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `🔧 **Analyse compleet!**\n\n${result.explanation}`, {
                type: 'test-fix',
                testFile: result.originalFile,
                fixedCode: result.fixedCode,
                explanation: result.explanation,
                screenshotPath: result.screenshotPath
            });
        } else {
            addChatMessage('bot', `❌ Kon de test niet analyseren: ${result.error}`);
        }
        
    } catch (error) {
        addChatMessage('bot', `❌ Fout bij analyse: ${error.message}`);
    }
}

// Pas AI fix toe
async function applyAiFix(testFile, fixedCode) {
    try {
        const response = await fetch('/api/apply-fix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testFile, fixedCode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `✅ Fix toegepast op "${testFile}"! Je kunt de test nu uitvoeren om te verifiëren.`);
        } else {
            addChatMessage('bot', `❌ Kon fix niet toepassen: ${result.error}`);
        }
        
    } catch (error) {
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

// Voer gefixte test uit
async function runFixedTest(testFile) {
    addChatMessage('bot', `▶️ Ik start de test "${testFile}"...`);
    
    try {
        const response = await fetch('/api/run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testFile, headed: false })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `✅ Test succesvol uitgevoerd!\n\n\`\`\`\n${result.output.substring(0, 800)}\n\`\`\``);
        } else {
            addChatMessage('bot', `❌ Test faalde opnieuw:\n\n\`\`\`\n${result.output.substring(0, 800)}\n\`\`\`\n\nWil je dat ik opnieuw analyseer?`, {
                type: 'test-fix',
                testFile: testFile,
                fixedCode: '',
                explanation: 'Test faalde opnieuw'
            });
        }
        
    } catch (error) {
        addChatMessage('bot', `❌ Fout bij uitvoeren: ${error.message}`);
    }
}

// Verstuur chat bericht
async function sendChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const message = input.value.trim();
    
    if (!message || !currentSiteAgent) return;
    
    input.value = '';
    addChatMessage('user', message);
    
    // Detecteer test-generatie intentie
    const testIntentRegex = /(?:doe|maak|genereer|start|run|voer uit).*?(?:smoke test|test|playwright)/i;
    const wantsTest = testIntentRegex.test(message);
    
    if (wantsTest) {
        // Vraag toestemming om test te genereren en uit te voeren
        showTestPermissionDialog(message);
        return;
    }
    
    // Toon loading
    const messagesDiv = document.getElementById('ai-chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-loading';
    loadingDiv.id = 'chat-loading';
    loadingDiv.textContent = 'AI denkt na...';
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteAgentId: currentSiteAgent.id,
                message,
                history: chatHistory.slice(-10) // Laatste 10 berichten als context
            })
        });
        
        const result = await response.json();
        
        // Verwijder loading
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        
        if (result.success) {
            addChatMessage('bot', result.response);
        } else {
            addChatMessage('bot', `❌ Fout: ${result.error}`);
        }
        
    } catch (error) {
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

// Toon toestemmingsdialoog voor test generatie
function showTestPermissionDialog(originalMessage) {
    const messagesDiv = document.getElementById('ai-chat-messages');
    
    const permissionDiv = document.createElement('div');
    permissionDiv.className = 'chat-message bot permission-message';
    permissionDiv.id = 'test-permission-dialog';
    permissionDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="bubble">
            <strong><i class="fa-solid fa-masks-theater"></i> Test Genereren & Uitvoeren</strong><br><br>
            Ik ga een Playwright test genereren op basis van je vraag en deze direct uitvoeren in een zichtbare browser.<br><br>
            <strong>Wat er gaat gebeuren:</strong>
            <ul style="margin: 8px 0; padding-left: 20px;">
                <li><i class="fa-solid fa-file-pen"></i> Test code genereren met AI</li>
                <li><i class="fa-solid fa-floppy-disk"></i> Test opslaan als .spec.js bestand</li>
                <li><i class="fa-solid fa-window-maximize"></i> Browser openen en test uitvoeren</li>
                <li><i class="fa-solid fa-terminal"></i> Live console output tonen</li>
            </ul>
            <div class="permission-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                <button class="btn btn-success btn-sm" onclick="approveTestGeneration('${originalMessage.replace(/'/g, "\\'")}')"><i class="fa-solid fa-check"></i> Goedkeuren & Starten</button>
                <button class="btn btn-secondary btn-sm" onclick="rejectTestGeneration()"><i class="fa-solid fa-xmark"></i> Annuleren</button>
            </div>
        </div>
    `;
    
    messagesDiv.appendChild(permissionDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Gebruiker keurt test generatie goed
async function approveTestGeneration(message) {
    // Verwijder toestemmingsdialoog
    const dialog = document.getElementById('test-permission-dialog');
    if (dialog) dialog.remove();
    
    // Genereer testnaam uit bericht
    const testName = message.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .slice(0, 4)
        .join('-') || 'generated-test';
    
    // Toon loading
    const messagesDiv = document.getElementById('ai-chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-loading';
    loadingDiv.id = 'chat-loading';
    loadingDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Test genereren...';
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    try {
        const response = await fetch('/api/generate-and-run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteAgentId: currentSiteAgent.id,
                prompt: message,
                testName: testName
            })
        });
        
        const result = await response.json();
        
        // Verwijder loading
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        
        if (result.success) {
            addChatMessage('bot', `✅ Test "${result.file}" gegenereerd en gestart!\n\nDe browser opent nu en de test wordt uitgevoerd. Je ziet hieronder live console output:`);
            
            // Maak live console output panel
            createLiveConsolePanel(result.file);
        } else {
            addChatMessage('bot', `❌ Fout bij genereren: ${result.error}`);
        }
        
    } catch (error) {
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

// Gebruiker weigert test generatie
function rejectTestGeneration() {
    const dialog = document.getElementById('test-permission-dialog');
    if (dialog) dialog.remove();
    
    addChatMessage('bot', '❌ Test generatie geannuleerd. Stel gerust een andere vraag!');
}

// Maak live console output panel in chat
function createLiveConsolePanel(testFile) {
    const messagesDiv = document.getElementById('ai-chat-messages');
    
    const consoleDiv = document.createElement('div');
    consoleDiv.className = 'chat-message bot console-message';
    consoleDiv.id = `console-${testFile}`;
    consoleDiv.innerHTML = `
        <div class="avatar"><i class="fa-solid fa-display"></i></div>
        <div class="bubble">
            <div class="console-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong><i class="fa-solid fa-display"></i> Live Console: ${testFile}</strong>
                <span class="console-status" id="status-${testFile}"><i class="fa-solid fa-spinner fa-spin"></i> Bezig...</span>
            </div>
            <pre class="console-output" id="output-${testFile}" style="background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; max-height: 300px; overflow-y: auto; font-size: 0.85em; line-height: 1.4; margin: 0;"></pre>
        </div>
    `;
    
    messagesDiv.appendChild(consoleDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update live console output
function updateLiveConsole(testFile, chunk, isError = false) {
    const outputPre = document.getElementById(`output-${testFile}`);
    if (!outputPre) return;
    
    const span = document.createElement('span');
    span.textContent = chunk;
    span.style.color = isError ? '#f48771' : '#d4d4d4';
    outputPre.appendChild(span);
    outputPre.scrollTop = outputPre.scrollHeight;
    
    // Scroll chat naar beneden
    const messagesDiv = document.getElementById('ai-chat-messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Markeer console als voltooid
function completeLiveConsole(testFile, success) {
    const statusSpan = document.getElementById(`status-${testFile}`);
    if (statusSpan) {
        statusSpan.innerHTML = success ? '<i class="fa-solid fa-circle-check"></i> Voltooid' : '<i class="fa-solid fa-circle-xmark"></i> Gefaald';
        statusSpan.style.color = success ? '#28a745' : '#dc3545';
    }
}

// Analyseer site
async function learnSite() {
    if (!currentSiteAgent) return;
    
    const btn = document.getElementById('ai-learn-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig...';
    
    addChatMessage('bot', '🧠 Ik ga de site analyseren... Dit kan even duren.');
    
    try {
        const response = await fetch(`/api/site-agents/${currentSiteAgent.id}/learn`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentSiteAgent = result.agent;
            loadSiteAgents(); // Refresh list
            addChatMessage('bot', `✅ Site geanalyseerd!\n\nIk heb ontdekt:\n• ${result.agent.navigation?.length || 0} pagina's\n• ${result.agent.forms?.length || 0} formulieren\n• ${Object.keys(result.agent.selectors || {}).length} belangrijke selectors\n\nJe kunt nu tests laten genereren!`);
        } else {
            addChatMessage('bot', `❌ Fout: ${result.error}`);
        }
        
    } catch (error) {
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-brain"></i> Analyseren';
    }
}

// Open generate test modal
function openGenerateTestModal() {
    if (!currentSiteAgent) {
        alert('Selecteer eerst een site agent!');
        return;
    }
    document.getElementById('generate-test-modal').classList.remove('hidden');
}

// Open help modal
function openHelpModal() {
    document.getElementById('ai-help-modal').classList.remove('hidden');
}

// Open knowledge modal
function openKnowledgeModal() {
    if (!currentSiteAgent) {
        alert('Selecteer eerst een site agent!');
        return;
    }
    
    // Vul de modal met de huidige kennis
    showSiteKnowledgeModal(currentSiteAgent);
    
    document.getElementById('ai-knowledge-modal').classList.remove('hidden');
}

// Toon site kennis in modal
function showSiteKnowledgeModal(agent) {
    const container = document.getElementById('ai-knowledge-modal-content');
    
    if (!agent.isLearned) {
        container.innerHTML = '<p><i class="fa-solid fa-file-pen"></i> Site nog niet geanalyseerd. Klik op "<i class="fa-solid fa-brain"></i> Analyseren".</p>';
        return;
    }
    
    let html = '<div class="knowledge-grid">';
    
    // Meta info
    html += `
        <div class="knowledge-card">
            <h4><i class="fa-solid fa-circle-info"></i> Algemeen</h4>
            <ul>
                <li><strong>Titel:</strong> ${agent.meta?.title || 'Onbekend'}</li>
                <li><strong>URL:</strong> ${agent.meta?.url || agent.baseUrl}</li>
                <li><strong>Geanalyseerd:</strong> ${new Date(agent.learnedAt).toLocaleString('nl-NL')}</li>
            </ul>
        </div>
    `;
    
    // Selectors
    if (Object.keys(agent.selectors || {}).length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-bullseye"></i> Selectors</h4>
                <ul>
                    ${Object.entries(agent.selectors).map(([key, val]) => `
                        <li><strong>${key}:</strong> ${val}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Forms
    if (agent.forms?.length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-pen-to-square"></i> Formulieren (${agent.forms.length})</h4>
                <ul>
                    ${agent.forms.map((form, i) => `
                        <li>Form ${i+1}: ${form.inputs?.length || 0} velden</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Navigation
    if (agent.navigation?.length > 0) {
        html += `
            <div class="knowledge-card">
                <h4><i class="fa-solid fa-compass"></i> Navigatie (${agent.navigation.length})</h4>
                <ul>
                    ${agent.navigation.map(nav => `
                        <li>${nav.text || nav.url} → ${nav.url}</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Handmatig kennis toevoegen
async function addManualKnowledge() {
    if (!currentSiteAgent) return;
    
    const type = document.getElementById('knowledge-type').value;
    const key = document.getElementById('knowledge-key').value.trim();
    const value = document.getElementById('knowledge-value').value.trim();
    
    if (!key || !value) {
        alert('Vul naam en waarde in!');
        return;
    }
    
    try {
        const response = await fetch(`/api/site-agents/${currentSiteAgent.id}/knowledge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, key, value })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentSiteAgent = result.agent;
            showSiteKnowledgeModal(currentSiteAgent);
            
            // Reset velden
            document.getElementById('knowledge-key').value = '';
            document.getElementById('knowledge-value').value = '';
            
            addChatMessage('bot', `✅ Kennis toegevoegd: **${key}** = ${value}`);
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Sluit modals
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
}

// Genereer test
async function generateTest() {
    const name = document.getElementById('generated-test-name').value.trim();
    const prompt = document.getElementById('generated-test-prompt').value.trim();
    const statusDiv = document.getElementById('generate-test-status');
    
    if (!name || !prompt) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Vul naam en beschrijving in!';
        statusDiv.style.display = 'block';
        return;
    }
    
    const btn = document.getElementById('do-generate-test-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Genereren...';
    
    statusDiv.className = 'status-message';
    statusDiv.textContent = '🧠 AI is bezig met genereren...';
    statusDiv.style.display = 'block';
    
    try {
        const response = await fetch('/api/generate-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteAgentId: currentSiteAgent.id,
                testName: name,
                prompt
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.className = 'status-message success';
            statusDiv.innerHTML = `
                <i class="fa-solid fa-circle-check"></i> Test "${result.file}" gegenereerd!<br>
                <i class="fa-solid fa-rocket"></i> Test wordt nu automatisch gestart...
            `;
            
            // Voeg toe aan chat
            addChatMessage('bot', `✅ Ik heb de test "${name}" gegenereerd en start hem nu automatisch!\n\nDe test is opgeslagen als \`${result.file}\`.`);
            
            // Clear modal velden
            document.getElementById('generated-test-name').value = '';
            document.getElementById('generated-test-prompt').value = '';
            
            // Start de test automatisch
            setTimeout(() => {
                runTest(result.file, false);
            }, 500);
            
        } else {
            statusDiv.className = 'status-message error';
            statusDiv.textContent = '❌ Fout: ' + result.error;
        }
        
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Fout: ' + error.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Genereren';
    }
}

// Creëer nieuwe site agent
async function createSiteAgent() {
    const name = document.getElementById('new-site-name').value.trim();
    const url = document.getElementById('new-site-url').value.trim();
    const desc = document.getElementById('new-site-desc').value.trim();
    const username = document.getElementById('new-site-username').value.trim();
    const password = document.getElementById('new-site-password').value.trim();
    
    // Verzamel geselecteerde skills
    const skills = [];
    document.querySelectorAll('#new-site-skills .skill-tag.selected').forEach(tag => {
        skills.push(tag.dataset.skill);
    });
    
    // Verzamel gekoppelde tests
    const linkedTests = [];
    const linkedContainer = document.getElementById('new-site-linked-tests');
    if (linkedContainer) {
        linkedContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            linkedTests.push(cb.value);
        });
    }
    
    if (!name || !url) {
        alert('Naam en URL zijn verplicht!');
        return;
    }
    
    const credentials = username ? { username, password } : null;
    
    try {
        const response = await fetch('/api/site-agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, baseUrl: url, description: desc, credentials, skills, linkedTests })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModals();
            loadSiteAgents();
            
            // Clear form
            document.getElementById('new-site-name').value = '';
            document.getElementById('new-site-url').value = '';
            document.getElementById('new-site-desc').value = '';
            document.getElementById('new-site-username').value = '';
            document.getElementById('new-site-password').value = '';
            document.querySelectorAll('#new-site-skills .skill-tag').forEach(t => t.classList.remove('selected'));
            if (linkedSelect) linkedSelect.selectedIndex = -1;
            
            // Auto select new agent
            selectSiteAgent(result.agent.id);
        } else {
            alert('Fout: ' + result.error);
        }
        
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Laad beschikbare tests voor koppelen
async function loadAvailableTestsForLinking() {
    const container = document.getElementById('new-site-linked-tests');
    if (!container) return;
    
    try {
        const response = await fetch('/api/available-tests');
        const tests = await response.json();
        
        container.innerHTML = tests.map(test => 
            `<label class="checkbox-item">
                <input type="checkbox" value="${test.file}">
                <span>${test.name}</span>
            </label>`
        ).join('');
        
    } catch (error) {
        console.error('Fout bij laden tests:', error);
    }
}

// ============================================
// MCP CONSOLE FUNCTIONALITEIT
// ============================================

let mcpTools = [];
let mcpLogEntries = [];

// Laad MCP tools
async function loadMcpTools() {
    const toolsList = document.getElementById('mcp-tools-list');
    if (!toolsList) return;

    toolsList.innerHTML = '<span class="mcp-loading">Laden...</span>';

    try {
        const response = await fetch('/api/mcp/tools');
        const data = await response.json();

        if (data.tools) {
            mcpTools = data.tools;
            toolsList.innerHTML = data.tools.map(tool => `
                <span class="mcp-tool-badge" title="${tool.description}">
                    <span class="tool-icon"><i class="fa-solid fa-wrench"></i></span>
                    ${tool.name.replace('playwright_', 'pw_')}
                </span>
            `).join('');
        } else {
            toolsList.innerHTML = '<span class="mcp-loading">Geen tools gevonden</span>';
        }
    } catch (error) {
        toolsList.innerHTML = `<span class="mcp-loading">Fout: ${error.message}</span>`;
    }
}

// Voeg MCP log entry toe
function addMcpLogEntry(tool, args, result, duration) {
    const logContent = document.getElementById('mcp-log-content');
    const logCount = document.getElementById('mcp-log-count');
    if (!logContent) return;

    // Verwijder empty state
    const emptyState = logContent.querySelector('.mcp-empty-state');
    if (emptyState) emptyState.remove();

    const entry = document.createElement('div');
    entry.className = 'mcp-log-entry';

    // Bepaal status op basis van resultaat
    const resultText = result?.content?.[0]?.text || result || '';
    if (resultText.includes('❌') || resultText.includes('Fout')) {
        entry.classList.add('error');
    } else if (resultText.includes('⚠️') || resultText.includes('warning')) {
        entry.classList.add('warning');
    } else {
        entry.classList.add('success');
    }

    const time = new Date().toLocaleTimeString('nl-NL');
    const argsStr = JSON.stringify(args, null, 2);
    const isError = resultText.includes('❌') || resultText.includes('Fout');

    entry.innerHTML = `
        <div class="mcp-log-header-row">
            <span class="mcp-log-tool-name"><i class="fa-solid fa-wrench"></i> ${tool}</span>
            <div>
                <span class="mcp-log-time">${time}</span>
                <span class="mcp-log-duration">${duration}ms</span>
            </div>
        </div>
        <div class="mcp-log-args">${argsStr}</div>
        <div class="mcp-log-result ${isError ? 'error-text' : ''}">${escapeHtml(resultText.substring(0, 500))}${resultText.length > 500 ? '...' : ''}</div>
    `;

    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;

    // Update count
    if (logCount) {
        const count = logContent.querySelectorAll('.mcp-log-entry').length;
        logCount.textContent = `${count} call${count !== 1 ? 's' : ''}`;
    }
}

// Wis MCP log
function clearMcpLog() {
    const logContent = document.getElementById('mcp-log-content');
    const logCount = document.getElementById('mcp-log-count');
    if (!logContent) return;

    logContent.innerHTML = `
        <div class="mcp-empty-state">
            <span><i class="fa-solid fa-robot"></i> MCP tools verschijnen hier wanneer de AI agent ze gebruikt</span>
            <br><small>Start een chat om te zien hoe Playwright wordt bestuurd</small>
        </div>
    `;

    if (logCount) logCount.textContent = '0 calls';

    // Wis ook op server
    fetch('/api/mcp/log', { method: 'DELETE' }).catch(() => {});
}

// Toggle MCP console
function toggleMcpConsole() {
    const panel = document.getElementById('mcp-console-panel');
    if (panel) {
        panel.classList.toggle('collapsed');
        const btn = document.getElementById('mcp-toggle-btn');
        if (btn) btn.innerHTML = panel.classList.contains('collapsed') ? '<i class="fa-solid fa-chevron-up"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
    }
}

// Escape HTML voor veilige weergave
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Socket.IO listener voor MCP tool calls
socket.on('mcp-tool-call', (data) => {
    addMcpLogEntry(data.tool, data.args, { content: [{ text: data.result }] }, data.duration);
});

// Socket.IO listener voor live gegenereerde code van MCP
socket.on('mcp-codegen-code', ({ tool, code, source }) => {
    appendToTestEditor(code, source || 'agent');
});

// Socket.IO listener voor agent context updates (handmatige acties)
socket.on('agent-context-update', ({ type, code, buffer }) => {
    if (type === 'handmatige-actie' && code) {
        addChatMessage('bot', `🖱️ Handmatige actie gedetecteerd:\n\`\`\`\n${code}\n\`\`\``);
    }
});

// ============================================
// MCP-GEINTEGREERDE CHAT
// ============================================

// Verstuur chat bericht met MCP integratie
async function sendMcpChatMessage(overrideMessage = null) {
    const input = document.getElementById('ai-chat-input');
    const message = overrideMessage || input.value.trim();

    if (!message || !currentSiteAgent) return;

    if (!overrideMessage && input) input.value = '';
    addChatMessage('user', message);

    // Toon loading
    const messagesDiv = document.getElementById('ai-chat-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-loading';
    loadingDiv.id = 'chat-loading';
    loadingDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MCP Agent denkt na...';
    messagesDiv.appendChild(loadingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    try {
        const response = await fetch('/api/mcp-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteAgentId: currentSiteAgent.id,
                message,
                history: chatHistory.slice(-10),
                socketId: socket.id
            })
        });

        const result = await response.json();

        // Verwijder loading
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();

        if (result.success) {
            // Bouw bericht met screenshots
            let botMessage = result.response;
            let screenshots = [];
            
            // Zoek screenshots in tool calls
            if (result.toolCalls && result.toolCalls.length > 0) {
                result.toolCalls.forEach(tc => {
                    // Log in MCP console
                    addMcpLogEntry(tc.tool, tc.args, { content: [{ text: tc.result }] }, tc.duration || 0);
                    
                    // Zoek screenshot paths in resultaten
                    if (tc.result && typeof tc.result === 'string') {
                        const pngMatch = tc.result.match(/\[Screenshot of viewport\]\(([^)]+\.png)\)/);
                        if (pngMatch) {
                            screenshots.push(pngMatch[1]);
                        }
                    }
                });
            }
            
            // Voeg screenshots toe aan bericht
            if (screenshots.length > 0) {
                botMessage += '\n\n**Screenshots:**';
                screenshots.forEach(path => {
                    const imageUrl = path.replace(/\\/g, '/');
                    botMessage += `\n![Screenshot](${imageUrl})`;
                });
            }
            
            addChatMessage('bot', botMessage);
            
            // Als er gegenereerde code is, toon in Test Editor
            if (result.generatedCode) {
                const testName = message.toLowerCase().includes('test') 
                    ? message.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30)
                    : 'gegenereerde-test';
                openTestEditor(result.generatedCode, testName);
                addChatMessage('bot', '📝 **Test gegenereerd!** Bekijk en bewerk de code in de Test Editor hierboven. Klik op **💾 Opslaan** om op te slaan of **▶️ Uitvoeren** om direct te testen.');
            }
        } else {
            addChatMessage('bot', `❌ Fout: ${result.error}`);
        }

    } catch (error) {
        const loading = document.getElementById('chat-loading');
        if (loading) loading.remove();
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

// ============================================
// TEST EDITOR FUNCTIES
// ============================================

let currentTestEditorName = '';
let generatedCodeBuffer = []; // Accumuleert gegenereerde code snippets

function openTestEditor(code = '', name = '') {
    const panel = document.getElementById('test-editor-panel');
    const nameInput = document.getElementById('test-editor-name');
    const codeInput = document.getElementById('test-editor-code');
    const statusBadge = document.getElementById('codegen-status-badge');
    
    if (panel) {
        // Test Editor is altijd zichtbaar in AI Agent tab — geen hidden toggle meer
        // Scroll naar de editor
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    if (nameInput) nameInput.value = name || 'nieuwe-test';
    if (codeInput && code) {
        codeInput.value = code;
        generatedCodeBuffer = [code];
    }
    if (statusBadge) {
        statusBadge.innerHTML = '<i class="fa-solid fa-file-pen"></i> Code geladen';
        statusBadge.className = 'status-badge status-success';
    }
    
    currentTestEditorName = name || 'nieuwe-test';
}

function clearTestEditor() {
    const nameInput = document.getElementById('test-editor-name');
    const codeInput = document.getElementById('test-editor-code');
    const statusBadge = document.getElementById('codegen-status-badge');
    
    if (nameInput) nameInput.value = '';
    if (codeInput) codeInput.value = '';
    generatedCodeBuffer = [];
    
    if (statusBadge) {
        statusBadge.innerHTML = '<i class="fa-solid fa-file-pen"></i> Klaar voor code generatie';
        statusBadge.className = 'status-badge status-info';
    }
}

function appendToTestEditor(code, source = 'agent') {
    const codeInput = document.getElementById('test-editor-code');
    const statusBadge = document.getElementById('codegen-status-badge');
    
    if (!codeInput) return;
    
    const timestamp = new Date().toLocaleTimeString('nl-NL');
    const labeledCode = `// [${source}] ${timestamp}\n${code}\n`;
    
    // Append aan buffer
    generatedCodeBuffer.push(labeledCode);
    
    // Append aan textarea
    const currentValue = codeInput.value;
    if (currentValue && !currentValue.endsWith('\n')) {
        codeInput.value = currentValue + '\n' + labeledCode;
    } else {
        codeInput.value = currentValue + labeledCode;
    }
    
    // Auto-scroll naar beneden
    codeInput.scrollTop = codeInput.scrollHeight;
    
    // Update status
    if (statusBadge) {
        statusBadge.innerHTML = `<i class="fa-solid fa-file-pen"></i> ${generatedCodeBuffer.length} snippet(s) gegenereerd`;
        statusBadge.className = 'status-badge status-success';
    }
}

function closeTestEditor() {
    // Test Editor is altijd zichtbaar — leeg in plaats van verbergen
    clearTestEditor();
}

async function saveTestFromEditor() {
    const nameInput = document.getElementById('test-editor-name');
    const codeInput = document.getElementById('test-editor-code');
    
    const name = nameInput?.value?.trim() || currentTestEditorName;
    const code = codeInput?.value?.trim();
    
    if (!name || !code) {
        alert('Vul een naam en code in!');
        return;
    }
    
    try {
        const response = await fetch('/api/create-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `✅ Test "${result.file}" opgeslagen!`);
            loadTests(); // Ververs test lijst
        } else {
            addChatMessage('bot', `❌ Fout: ${result.error}`);
        }
    } catch (error) {
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

async function runTestFromEditor() {
    const nameInput = document.getElementById('test-editor-name');
    const codeInput = document.getElementById('test-editor-code');
    
    const name = nameInput?.value?.trim() || currentTestEditorName;
    const code = codeInput?.value?.trim();
    
    if (!name || !code) {
        alert('Vul een naam en code in!');
        return;
    }
    
    // Eerst opslaan
    await saveTestFromEditor();
    
    // Dan uitvoeren
    try {
        const response = await fetch('/api/run-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testFile: `${name}.spec.js`, headed: true })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `▶️ Test "${name}" uitgevoerd!\n\n\`\`\`\n${result.output?.substring(0, 1000)}\n\`\`\``);
        } else {
            addChatMessage('bot', `❌ Test faalde:\n\n\`\`\`\n${result.output?.substring(0, 1000)}\n\`\`\``);
        }
    } catch (error) {
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// MCP Console event listeners
document.getElementById('mcp-refresh-tools-btn')?.addEventListener('click', loadMcpTools);
document.getElementById('mcp-clear-log-btn')?.addEventListener('click', clearMcpLog);
document.getElementById('mcp-toggle-btn')?.addEventListener('click', toggleMcpConsole);

document.getElementById('ai-provider').addEventListener('change', (e) => {
    const endpointGroup = document.getElementById('ai-endpoint-group');
    const apiKeyGroup = document.getElementById('ai-apikey-group');
    const provider = e.target.value;
    
    // Toon/verberg endpoint voor azure en ollama
    endpointGroup.style.display = (provider === 'azure' || provider === 'ollama') ? 'block' : 'none';
    
    // Verberg API key voor Ollama (lokaal, geen key nodig)
    apiKeyGroup.style.display = (provider === 'ollama') ? 'none' : 'block';
    
    // Update placeholder
    const endpointInput = document.getElementById('ai-endpoint');
    if (provider === 'ollama') {
        endpointInput.placeholder = 'http://localhost:11434';
    } else if (provider === 'azure') {
        endpointInput.placeholder = 'https://your-resource.openai.azure.com';
    }
    
    // Reset model dropdown
    const modelSelect = document.getElementById('ai-model-select');
    modelSelect.innerHTML = '<option value="">-- Kies een model --</option>';
    document.getElementById('ai-model').value = '';
});

document.getElementById('ai-fetch-models-btn').addEventListener('click', fetchAiModels);
document.getElementById('save-ai-config-btn').addEventListener('click', saveAiConfig);

// Collapsible sectie headers
document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', (e) => {
        // Niet inklappen als er op een knop binnen de header is geklikt
        if (e.target.tagName === 'BUTTON' && e.target.classList.contains('toggle-section-btn')) {
            e.stopPropagation();
        }
        
        const targetId = header.getAttribute('data-target');
        const body = document.getElementById(targetId);
        if (!body) return;
        
        const isCollapsed = body.classList.toggle('collapsed');
        header.classList.toggle('collapsed', isCollapsed);
        
        // Sla state op in localStorage
        const sectionKey = `section-collapsed-${targetId}`;
        localStorage.setItem(sectionKey, isCollapsed ? '1' : '0');
    });
});

// Herstel collapsible state bij laden
function restoreCollapsibleState() {
    document.querySelectorAll('.collapsible-header').forEach(header => {
        const targetId = header.getAttribute('data-target');
        const body = document.getElementById(targetId);
        if (!body) return;
        
        const sectionKey = `section-collapsed-${targetId}`;
        const isCollapsed = localStorage.getItem(sectionKey) === '1';
        
        if (isCollapsed) {
            body.classList.add('collapsed');
            header.classList.add('collapsed');
        }
    });
}

// Roep restoreCollapsibleState aan na het laden van de pagina
// (wordt aangeroepen via de bestaande DOMContentLoaded of direct)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreCollapsibleState);
} else {
    restoreCollapsibleState();
}

// Sidebar toggle (drawer inklappen)
document.getElementById('ai-sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('ai-sidebar');
    const layout = document.getElementById('ai-agent-layout');
    
    sidebar.classList.toggle('collapsed');
    layout.classList.toggle('sidebar-collapsed');
    
    // Sla state op
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('ai-sidebar-collapsed', isCollapsed ? '1' : '0');
});

// Herstel sidebar state bij laden
function restoreSidebarState() {
    const sidebar = document.getElementById('ai-sidebar');
    const layout = document.getElementById('ai-agent-layout');
    if (!sidebar || !layout) return;
    
    const isCollapsed = localStorage.getItem('ai-sidebar-collapsed') === '1';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        layout.classList.add('sidebar-collapsed');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSidebarState);
} else {
    restoreSidebarState();
}

// Test AI configuratie
document.getElementById('test-ai-config-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('test-ai-config-btn');
    const statusDiv = document.getElementById('ai-config-status');
    
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testen...';
    statusDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/test-ai-config', { method: 'POST' });
        const result = await response.json();
        
        statusDiv.className = result.success ? 'status-message success' : 'status-message error';
        statusDiv.textContent = result.message;
        statusDiv.style.display = 'block';
        
        // Toon beschikbare modellen als er suggesties zijn
        if (result.availableModels && !result.modelAvailable) {
            const modelSelect = document.getElementById('ai-model-select');
            modelSelect.innerHTML = '<option value="">-- Kies een model --</option>';
            result.availableModels.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                modelSelect.appendChild(opt);
            });
        }
    } catch (error) {
        statusDiv.className = 'status-message error';
        statusDiv.textContent = '❌ Fout: ' + error.message;
        statusDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plug"></i> Test';
    }
});
document.getElementById('add-site-agent-btn').addEventListener('click', () => {
    document.getElementById('site-agent-modal').classList.remove('hidden');
    loadAvailableTestsForLinking();
});

// Skills selector
document.querySelectorAll('#new-site-skills .skill-tag').forEach(tag => {
    tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
    });
});

// Password toggle
document.getElementById('toggle-password').addEventListener('click', () => {
    const pwInput = document.getElementById('new-site-password');
    const btn = document.getElementById('toggle-password');
    if (pwInput.type === 'password') {
        pwInput.type = 'text';
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        btn.title = 'Wachtwoord verbergen';
    } else {
        pwInput.type = 'password';
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        btn.title = 'Wachtwoord tonen';
    }
});

document.getElementById('create-site-agent-btn').addEventListener('click', createSiteAgent);

// Test Editor knoppen
// Test Editor is altijd zichtbaar — geen close knop meer, wel clear
document.getElementById('test-editor-save-btn')?.addEventListener('click', saveTestFromEditor);
document.getElementById('test-editor-run-btn')?.addEventListener('click', runTestFromEditor);
document.getElementById('test-editor-clear-btn')?.addEventListener('click', clearTestEditor);

// AI Chat knoppen
document.getElementById('ai-generate-test-btn')?.addEventListener('click', openGenerateTestModal);
document.getElementById('ai-new-test-btn')?.addEventListener('click', () => {
    clearTestEditor();
    document.getElementById('test-editor-name').value = 'nieuwe-test';
});
document.getElementById('ai-clear-chat-btn')?.addEventListener('click', () => {
    chatHistory = [];
    const messagesDiv = document.getElementById('ai-chat-messages');
    if (messagesDiv) messagesDiv.innerHTML = '';
});

// ✅ Klaar knop — finaliseer test
document.getElementById('ai-done-btn')?.addEventListener('click', async () => {
    if (!currentSiteAgent) {
        alert('Selecteer eerst een site agent!');
        return;
    }
    
    // Stuur "klaar" bericht naar server
    await sendMcpChatMessage('klaar');
});

// 🖱️ Handmatige actie knop
document.getElementById('manual-action-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('manual-action-input');
    const action = input?.value?.trim();
    
    if (!action) {
        alert('Typ een handmatige actie!');
        return;
    }
    
    if (!currentSiteAgent) {
        alert('Selecteer eerst een site agent!');
        return;
    }
    
    // Toon in chat
    addChatMessage('user', `🖱️ Handmatige actie: ${action}`);
    
    try {
        const response = await fetch('/api/manual-mcp-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                siteAgentId: currentSiteAgent.id,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addChatMessage('bot', `✅ Handmatige actie uitgevoerd:\n\`\`\`\n${result.code}\n\`\`\``);
            if (result.code) {
                appendToTestEditor(result.code, 'handmatig');
            }
        } else {
            addChatMessage('bot', `❌ Fout bij handmatige actie: ${result.error}`);
        }
    } catch (error) {
        addChatMessage('bot', `❌ Fout: ${error.message}`);
    }
    
    // Clear input
    if (input) input.value = '';
});

// Menu toggle knop
document.getElementById('menu-toggle-btn')?.addEventListener('click', toggleMenu);

// Gebruik MCP chat in plaats van gewone chat
document.getElementById('ai-chat-send-btn').addEventListener('click', () => sendMcpChatMessage());
document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
    // Ctrl+Enter of Shift+Enter = verstuur
    if (e.key === 'Enter' && (e.ctrlKey || e.shiftKey)) {
        e.preventDefault();
        sendMcpChatMessage();
    }
    // Gewone Enter = nieuwe regel (standaard textarea gedrag)
});

// Handmatige actie input — Enter = uitvoeren
document.getElementById('manual-action-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('manual-action-btn')?.click();
    }
});

document.getElementById('do-generate-test-btn').addEventListener('click', generateTest);
document.getElementById('add-knowledge-btn').addEventListener('click', addManualKnowledge);

// Modal sluit knoppen
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeModals);
});

// Sluit modal bij klik buiten
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModals();
    });
});

// Event listeners voor buttons
document.getElementById('run-all-btn').addEventListener('click', runAllTests);
document.getElementById('refresh-tests-btn').addEventListener('click', loadTests);
document.getElementById('refresh-videos-btn').addEventListener('click', loadVideos);
document.getElementById('refresh-screenshots-btn').addEventListener('click', loadScreenshots);
document.getElementById('create-test-btn').addEventListener('click', createTest);
document.getElementById('open-report-btn').addEventListener('click', () => {
    window.open('/playwright-report/index.html', '_blank');
});
document.getElementById('start-codegen-btn').addEventListener('click', startCodegen);
document.getElementById('add-scheduled-btn').addEventListener('click', addScheduledTest);

// Socket.IO events
socket.on('test-completed', (data) => {
    console.log('Test completed:', data);
    loadTests();
    loadVideos();
    loadScreenshots();
});

socket.on('test-output', (data) => {
    console.log('Test output:', data);
    updateLiveConsole(data.testFile, data.chunk, data.isError);
});

socket.on('test-completed', (data) => {
    console.log('Test completed:', data);
    completeLiveConsole(data.testFile, data.success);
    loadTests();
    loadVideos();
    loadScreenshots();
});

socket.on('all-tests-completed', (data) => {
    console.log('All tests completed:', data);
    loadTests();
    loadVideos();
    loadScreenshots();
});

socket.on('scheduled-test-completed', (data) => {
    console.log('Scheduled test completed:', data);
    loadScheduledTestsUI();
});

// Laad tests bij opstarten
loadTests();
loadTestsForSchedule();
loadAiConfig();
loadSiteAgents();
