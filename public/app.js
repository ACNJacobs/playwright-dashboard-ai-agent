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
                    <button class="btn btn-success btn-sm" title="Uitvoeren" onclick="runTest('${test.file}', false)"><i class="fa-solid fa-play"></i></button>
                    <button class="btn btn-primary btn-sm" title="Met Browser" onclick="runTest('${test.file}', true)"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-warning btn-sm" title="Bewerken" onclick="editTest('${test.name}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-sm" title="Verwijderen" onclick="deleteTest('${test.name}')"><i class="fa-solid fa-trash"></i></button>
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
        createBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i>';
        createBtn.title = 'Opslaan';
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
            createBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
            createBtn.title = 'Test Aanmaken';
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
            
            // Format schedule description based on schedule type
            let scheduleDescription = '';
            switch (test.scheduleType) {
                case 'interval':
                    scheduleDescription = `Elke ${test.intervalMinutes} min`;
                    break;
                case 'hourly':
                    scheduleDescription = 'Elk uur';
                    break;
                case 'daily':
                    scheduleDescription = `Dagelijks om ${test.time}`;
                    break;
                case 'weekly':
                    const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
                    scheduleDescription = `Wekelijks op ${days[test.dayOfWeek]} om ${test.time}`;
                    break;
                case 'monthly':
                    scheduleDescription = `Maandelijks op dag ${test.dayOfMonth} om ${test.time}`;
                    break;
                default:
                    scheduleDescription = `Elke ${test.intervalMinutes || 60} min`;
            }
            
            // Next run info
            const nextRunHtml = test.enabled && test.nextRunFormatted 
                ? `<span><i class="fa-solid fa-arrow-right" style="color:var(--info)"></i> <strong>Volgende:</strong> ${test.nextRunFormatted}</span>` 
                : '';
            
            // Run history summary
            const historyCount = test.runHistory ? test.runHistory.length : 0;
            const successCount = test.runHistory ? test.runHistory.filter(h => h.result === 'success').length : 0;
            const historyHtml = historyCount > 0 
                ? `<span><i class="fa-solid fa-chart-line" style="color:var(--text-muted)"></i> ${successCount}/${historyCount} succes</span>` 
                : '';
            
            return `
                <div class="card" data-schedule-id="${test.id}">
                    <div class="card-header">
                        <h3>${resultIcon} ${test.testFile}</h3>
                        <span class="status-badge status-${statusClass}">${status}</span>
                    </div>
                    <div class="card-meta">
                        <span><i class="fa-regular fa-clock"></i> ${scheduleDescription}</span>
                        <span><i class="fa-regular fa-calendar"></i> Laatste: ${lastRun}</span>
                        ${nextRunHtml}
                        ${historyHtml}
                    </div>
                    <div class="actions">
                        <button class="btn btn-success btn-sm" title="Nu Draaien" onclick="runScheduledTestNow('${test.id}')"><i class="fa-solid fa-play"></i></button>
                        <button class="btn btn-warning btn-sm" title="Bewerken" onclick="editScheduledTest('${test.id}')"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-secondary btn-sm" title="${test.enabled ? 'Pauzeren' : 'Hervatten'}" onclick="toggleScheduledTest('${test.id}', ${!test.enabled})">${test.enabled ? '<i class="fa-solid fa-pause"></i>' : '<i class="fa-solid fa-play"></i>'}</button>
                        <button class="btn btn-danger btn-sm" title="Verwijderen" onclick="deleteScheduledTest('${test.id}')"><i class="fa-solid fa-trash"></i></button>
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
    const scheduleType = document.getElementById('schedule-type').value;
    
    if (!testFile) {
        alert('Kies een test!');
        return;
    }
    
    // Validate required fields based on schedule type
    let requestData = { testFile, scheduleType, enabled: true };
    
    switch (scheduleType) {
        case 'interval':
            const interval = document.getElementById('scheduled-interval').value;
            if (!interval) {
                alert('Vul het interval in!');
                return;
            }
            requestData.intervalMinutes = parseInt(interval);
            break;
            
        case 'hourly':
            // No additional parameters needed
            break;
            
        case 'daily':
            const time = document.getElementById('scheduled-time').value;
            if (!time) {
                alert('Vul de tijd in!');
                return;
            }
            requestData.time = time;
            break;
            
        case 'weekly':
            const weeklyTime = document.getElementById('scheduled-time').value;
            const dayOfWeek = document.getElementById('scheduled-day-of-week').value;
            if (!weeklyTime) {
                alert('Vul de tijd in!');
                return;
            }
            requestData.time = weeklyTime;
            requestData.dayOfWeek = parseInt(dayOfWeek);
            break;
            
        case 'monthly':
            const monthlyTime = document.getElementById('scheduled-time').value;
            const dayOfMonth = document.getElementById('scheduled-day-of-month').value;
            if (!monthlyTime) {
                alert('Vul de tijd in!');
                return;
            }
            if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
                alert('Vul een geldige dag van de maand in (1-31)!');
                return;
            }
            requestData.time = monthlyTime;
            requestData.dayOfMonth = parseInt(dayOfMonth);
            break;
    }
    
    try {
        const response = await fetch('/api/scheduled-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Test gepland!`);
            loadScheduledTestsUI();
            
            // Reset form
            document.getElementById('scheduled-test-select').value = '';
            document.getElementById('schedule-type').value = 'interval';
            document.getElementById('scheduled-interval').value = '60';
            document.getElementById('scheduled-time').value = '';
            document.getElementById('scheduled-day-of-week').value = '0';
            document.getElementById('scheduled-day-of-month').value = '1';
            
            // Update UI based on schedule type
            updateScheduleFormUI();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Update schedule form UI based on selected schedule type
function updateScheduleFormUI() {
    const scheduleType = document.getElementById('schedule-type').value;
    
    // Hide all optional groups first
    document.getElementById('interval-group').style.display = 'none';
    document.getElementById('time-group').style.display = 'none';
    document.getElementById('day-of-week-group').style.display = 'none';
    document.getElementById('day-of-month-group').style.display = 'none';
    
    // Show relevant groups based on schedule type
    switch (scheduleType) {
        case 'interval':
            document.getElementById('interval-group').style.display = 'block';
            break;
            
        case 'hourly':
            // No additional fields needed
            break;
            
        case 'daily':
            document.getElementById('time-group').style.display = 'block';
            break;
            
        case 'weekly':
            document.getElementById('time-group').style.display = 'block';
            document.getElementById('day-of-week-group').style.display = 'block';
            break;
            
        case 'monthly':
            document.getElementById('time-group').style.display = 'block';
            document.getElementById('day-of-month-group').style.display = 'block';
            break;
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
            // Remove the card from DOM immediately for better UX
            const card = document.querySelector(`[data-schedule-id="${id}"]`);
            if (card) {
                card.style.opacity = '0';
                card.style.transform = 'translateX(100px)';
                card.style.transition = 'all 0.3s ease';
                setTimeout(() => {
                    card.remove();
                    // Check if list is now empty
                    const list = document.getElementById('scheduled-list');
                    if (list.children.length === 0) {
                        list.innerHTML = '<div class="card"><p>Geen geplande tests. Voeg er een toe!</p></div>';
                    }
                }, 300);
            } else {
                loadScheduledTestsUI();
            }
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Bewerk geplande test - open modal
async function editScheduledTest(id) {
    try {
        const response = await fetch('/api/scheduled-tests');
        const tests = await response.json();
        const test = tests.find(t => t.id === id);
        
        if (!test) {
            alert('Geplande test niet gevonden');
            return;
        }
        
        // Use existing modal from HTML
        const modal = document.getElementById('edit-schedule-modal');
        if (!modal) {
            alert('Edit modal niet gevonden in HTML');
            return;
        }
        
        // Set values
        document.getElementById('edit-schedule-id').value = test.id;
        document.getElementById('edit-test-file').value = test.testFile;
        document.getElementById('edit-schedule-type').value = test.scheduleType || 'interval';
        document.getElementById('edit-interval').value = test.intervalMinutes || 60;
        document.getElementById('edit-time').value = test.time || '';
        document.getElementById('edit-day-of-week').value = test.dayOfWeek !== undefined ? test.dayOfWeek : 1;
        document.getElementById('edit-day-of-month').value = test.dayOfMonth || 1;
        
        // Update UI visibility
        updateEditFormUI();
        
        // Show modal
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
        
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Update edit form UI based on selected schedule type
function updateEditFormUI() {
    const scheduleType = document.getElementById('edit-schedule-type').value;
    
    document.getElementById('edit-interval-group').style.display = 'none';
    document.getElementById('edit-time-group').style.display = 'none';
    document.getElementById('edit-day-of-week-group').style.display = 'none';
    document.getElementById('edit-day-of-month-group').style.display = 'none';
    
    switch (scheduleType) {
        case 'interval':
            document.getElementById('edit-interval-group').style.display = 'block';
            break;
        case 'daily':
            document.getElementById('edit-time-group').style.display = 'block';
            break;
        case 'weekly':
            document.getElementById('edit-time-group').style.display = 'block';
            document.getElementById('edit-day-of-week-group').style.display = 'block';
            break;
        case 'monthly':
            document.getElementById('edit-time-group').style.display = 'block';
            document.getElementById('edit-day-of-month-group').style.display = 'block';
            break;
    }
}

// Save schedule edit
async function saveScheduleEdit() {
    const id = document.getElementById('edit-schedule-id').value;
    const scheduleType = document.getElementById('edit-schedule-type').value;
    
    let updateData = { scheduleType };
    
    switch (scheduleType) {
        case 'interval':
            const interval = document.getElementById('edit-interval').value;
            if (!interval) {
                alert('Vul het interval in!');
                return;
            }
            updateData.intervalMinutes = parseInt(interval);
            break;
            
        case 'hourly':
            // No additional parameters needed
            break;
            
        case 'daily':
            const dailyTime = document.getElementById('edit-time').value;
            if (!dailyTime) {
                alert('Vul de tijd in!');
                return;
            }
            updateData.time = dailyTime;
            break;
            
        case 'weekly':
            const weeklyTime = document.getElementById('edit-time').value;
            const dayOfWeek = document.getElementById('edit-day-of-week').value;
            if (!weeklyTime) {
                alert('Vul de tijd in!');
                return;
            }
            updateData.time = weeklyTime;
            updateData.dayOfWeek = parseInt(dayOfWeek);
            break;
            
        case 'monthly':
            const monthlyTime = document.getElementById('edit-time').value;
            const dayOfMonth = document.getElementById('edit-day-of-month').value;
            if (!monthlyTime) {
                alert('Vul de tijd in!');
                return;
            }
            if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
                alert('Vul een geldige dag van de maand in (1-31)!');
                return;
            }
            updateData.time = monthlyTime;
            updateData.dayOfMonth = parseInt(dayOfMonth);
            break;
    }
    
    try {
        const response = await fetch(`/api/scheduled-tests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeEditModal();
            loadScheduledTestsUI();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-schedule-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
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
        apiKeyGroup.style.display = 'block'; // API key altijd tonen, ook voor Ollama cloud
        
        // Probeer modellen op te halen
        // Voor Ollama: altijd proberen (geen key nodig voor lokaal, maar cloud kan key vereisen)
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
                    <button class="btn btn-success btn-sm" title="Pas Fix Toe" onclick="applyAiFix('${extraData.testFile}', \`${extraData.fixedCode.replace(/`/g, '\\`')}\`)"><i class="fa-solid fa-check"></i></button>
                    <button class="btn btn-secondary btn-sm" title="Test Uitvoeren" onclick="runFixedTest('${extraData.testFile}')"><i class="fa-solid fa-play"></i></button>
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
                <button class="btn btn-success btn-sm" title="Goedkeuren & Starten" onclick="approveTestGeneration('${originalMessage.replace(/'/g, "\\'")}')"><i class="fa-solid fa-check"></i></button>
                <button class="btn btn-secondary btn-sm" title="Annuleren" onclick="rejectTestGeneration()"><i class="fa-solid fa-xmark"></i></button>
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
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
        btn.innerHTML = '<i class="fa-solid fa-brain"></i>';
        btn.title = 'Analyseren';
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
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
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i>';
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
    
    // API key is optioneel voor Ollama (lokaal), maar kan nodig zijn voor cloud-hosted Ollama
    apiKeyGroup.style.display = 'block';
    
    // Update placeholder
    const endpointInput = document.getElementById('ai-endpoint');
    if (provider === 'ollama') {
        endpointInput.placeholder = 'http://localhost:11434 of https://jouw-ollama-cloud.com';
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
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
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
        btn.innerHTML = '<i class="fa-solid fa-plug"></i>';
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

// ============================================
// AUTOMATISCH VERVERSEN (VERVER) FUNCTIE
// ============================================

let autoRefreshEnabled = false;
let autoRefreshInterval = null;

// Toggle automatisch verversen
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    
    const toggleBtn = document.getElementById('auto-refresh-btn');
    const statusIndicator = document.getElementById('auto-refresh-status');
    
    if (autoRefreshEnabled) {
        // Start automatisch verversen (elke 10 seconden)
        autoRefreshInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
            
            switch(activeTab) {
                case 'tests':
                    loadTests();
                    break;
                case 'videos':
                    loadVideos();
                    break;
                case 'screenshots':
                    loadScreenshots();
                    break;
                case 'scheduled':
                    loadScheduledTestsUI();
                    break;
                case 'ai-agent':
                    // Voor AI agent tab verversen we de relevante data
                    if (currentSiteAgent) {
                        loadSiteAgents();
                    }
                    break;
            }
        }, 10000); // Elke 10 seconden
        
        // Update UI
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            toggleBtn.title = 'Stop automatisch verversen';
        }
        
        if (statusIndicator) {
            statusIndicator.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--success);"></i> Auto-refresh actief';
        }
        
        console.log('Automatisch verversen gestart');
    } else {
        // Stop automatisch verversen
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        
        // Update UI
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            toggleBtn.title = 'Start automatisch verversen';
        }
        
        if (statusIndicator) {
            statusIndicator.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i> Auto-refresh inactief';
        }
        
        console.log('Automatisch verversen gestopt');
    }
}

// Voeg event listener toe voor de ververs knop
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('auto-refresh-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAutoRefresh);
    }
});

// ============================================
// INTERACTIEVE TEST FUNCTIES
// ============================================

let currentInteractiveSession = null;

// Start een interactieve test sessie
async function startInteractiveTest(testFile) {
    try {
        const response = await fetch('/api/start-interactive-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                testFile, 
                headed: true,
                socketId: socket.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentInteractiveSession = result.sessionId;
            showInteractiveTestPanel(testFile, result.sessionId);
        } else {
            alert('Fout bij starten interactieve test: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Toon het interactieve test paneel
function showInteractiveTestPanel(testFile, sessionId) {
    // Verberg andere panels en toon het interactieve test paneel
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Maak een nieuw paneel aan voor de interactieve test
    let interactivePanel = document.getElementById('interactive-test-panel');
    if (!interactivePanel) {
        interactivePanel = document.createElement('section');
        interactivePanel.id = 'interactive-test-panel';
        interactivePanel.className = 'tab-content active';
        interactivePanel.innerHTML = `
            <div class="form-card">
                <h2><i class="fa-solid fa-comments"></i> Interactieve Test: ${testFile}</h2>
                <div class="interactive-test-container">
                    <div class="test-output-panel">
                        <h3>Test Output</h3>
                        <pre id="interactive-test-output" class="test-output"></pre>
                    </div>
                    <div class="instruction-panel">
                        <h3>Instructies</h3>
                        <div class="instruction-input-area">
                            <textarea id="instruction-input" placeholder="Typ hier je instructies... Bijv. 'Klik op de login knop' of 'Vul gebruikersnaam in met testuser'"></textarea>
                            <button id="send-instruction-btn" class="btn btn-primary" title="Verstuur Instructie"><i class="fa-solid fa-paper-plane"></i></button>
                        </div>
                        <div class="instruction-history" id="instruction-history">
                            <!-- Instructie geschiedenis wordt hier getoond -->
                        </div>
                    </div>
                </div>
                <button id="close-interactive-test-btn" class="btn btn-secondary" title="Sluiten"><i class="fa-solid fa-times"></i> Sluiten</button>
            </div>
        `;
        document.querySelector('main.container').appendChild(interactivePanel);
        
        // Voeg event listeners toe
        document.getElementById('send-instruction-btn').addEventListener('click', sendInstruction);
        document.getElementById('close-interactive-test-btn').addEventListener('click', closeInteractiveTest);
        
        // Enter-toets in textarea stuurt instructie
        document.getElementById('instruction-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendInstruction();
            }
        });
    } else {
        interactivePanel.classList.add('active');
        document.getElementById('interactive-test-output').textContent = '';
        document.getElementById('instruction-history').innerHTML = '';
    }
    
    // Scroll naar het paneel
    interactivePanel.scrollIntoView({ behavior: 'smooth' });
}

// Stuur een instructie naar de test
async function sendInstruction() {
    const input = document.getElementById('instruction-input');
    const instruction = input.value.trim();
    
    if (!instruction || !currentInteractiveSession) return;
    
    // Voeg instructie toe aan geschiedenis
    const history = document.getElementById('instruction-history');
    const instructionElement = document.createElement('div');
    instructionElement.className = 'instruction-item';
    instructionElement.innerHTML = `
        <div class="instruction-text">${instruction}</div>
        <div class="instruction-time">${new Date().toLocaleTimeString()}</div>
    `;
    history.appendChild(instructionElement);
    history.scrollTop = history.scrollHeight;
    
    // Clear input
    input.value = '';
    
    try {
        const response = await fetch('/api/send-instruction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: currentInteractiveSession,
                instruction: instruction
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            alert('Fout bij versturen instructie: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Sluit de interactieve test
function closeInteractiveTest() {
    const panel = document.getElementById('interactive-test-panel');
    if (panel) {
        panel.classList.remove('active');
    }
    
    // Toon de tests tab weer
    switchTab('tests');
    
    // Reset de huidige sessie
    currentInteractiveSession = null;
}

// Socket.IO listener voor interactieve test output
socket.on('interactive-test-output', (data) => {
    const outputElement = document.getElementById('interactive-test-output');
    if (outputElement && data.sessionId === currentInteractiveSession) {
        outputElement.textContent += data.output;
        outputElement.scrollTop = outputElement.scrollHeight;
    }
});

// Socket.IO listener voor instructieontvangst
socket.on('instruction-received', (data) => {
    if (data.sessionId === currentInteractiveSession) {
        // Toon een notificatie dat de instructie is ontvangen
        const outputElement = document.getElementById('interactive-test-output');
        if (outputElement) {
            outputElement.textContent += `\n[INSTRUCTIE ONTVANGEN]: ${data.instruction}\n`;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    }
});

// Socket.IO listener voor test voltooiing
socket.on('interactive-test-completed', (data) => {
    if (data.sessionId === currentInteractiveSession) {
        const outputElement = document.getElementById('interactive-test-output');
        if (outputElement) {
            outputElement.textContent += `\n[Test voltooid met exit code: ${data.code}]\n`;
            outputElement.scrollTop = outputElement.scrollHeight;
        }
        
        // Reset de huidige sessie
        currentInteractiveSession = null;
    }
});

// ============================================
// INTERACTIEVE TEST FUNCTIES VOOR AI AGENT
// ============================================

let aiAgentInteractiveSession = null;

// Laad beschikbare tests in de dropdown voor interactieve test
async function loadTestsForInteractiveTest() {
    const select = document.getElementById('interactive-test-select');
    if (!select) return;
    
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
        console.error('Fout bij laden tests voor interactieve test:', error);
    }
}

// Start een interactieve test vanuit de AI Agent
async function startInteractiveTestFromAgent() {
    const testFile = document.getElementById('interactive-test-select').value;
    const outputElement = document.getElementById('interactive-test-output');
    
    if (!testFile) {
        alert('Selecteer eerst een test!');
        return;
    }
    
    if (outputElement) {
        outputElement.textContent = `Starten van interactieve test: ${testFile}...\n`;
    }
    
    try {
        const response = await fetch('/api/start-interactive-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                testFile, 
                headed: true,
                socketId: socket.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            aiAgentInteractiveSession = result.sessionId;
            if (outputElement) {
                outputElement.textContent += `Interactieve test sessie gestart (ID: ${result.sessionId})\n`;
            }
        } else {
            if (outputElement) {
                outputElement.textContent += `Fout bij starten interactieve test: ${result.error}\n`;
            }
        }
    } catch (error) {
        if (outputElement) {
            outputElement.textContent += `Fout: ${error.message}\n`;
        }
    }
}

// Stuur een instructie naar de lopende interactieve test
async function sendInstructionFromAgent() {
    const instructionInput = document.getElementById('interactive-instruction-input');
    const instruction = instructionInput.value.trim();
    const outputElement = document.getElementById('interactive-test-output');
    
    if (!instruction || !aiAgentInteractiveSession) {
        if (!aiAgentInteractiveSession) {
            alert('Er is geen actieve interactieve test sessie!');
        }
        return;
    }
    
    if (outputElement) {
        outputElement.textContent += `\n[INSTRUCTIE VERZONDEN]: ${instruction}\n`;
        outputElement.scrollTop = outputElement.scrollHeight;
    }
    
    try {
        const response = await fetch('/api/send-instruction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: aiAgentInteractiveSession,
                instruction: instruction
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            if (outputElement) {
                outputElement.textContent += `Fout bij versturen instructie: ${result.error}\n`;
            }
        }
        
        // Clear input
        instructionInput.value = '';
    } catch (error) {
        if (outputElement) {
            outputElement.textContent += `Fout: ${error.message}\n`;
        }
    }
}

// Voeg event listeners toe voor de nieuwe knoppen
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-interactive-test-btn');
    const sendBtn = document.getElementById('send-instruction-btn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startInteractiveTestFromAgent);
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendInstructionFromAgent);
    }
    
    // Laad tests in de dropdown wanneer de AI Agent tab wordt geopend
    const aiAgentTabBtn = document.querySelector('[data-tab="ai-agent"]');
    if (aiAgentTabBtn) {
        aiAgentTabBtn.addEventListener('click', loadTestsForInteractiveTest);
    }
    
    // Event listener voor schedule type dropdown
    const scheduleTypeSelect = document.getElementById('schedule-type');
    if (scheduleTypeSelect) {
        scheduleTypeSelect.addEventListener('change', updateScheduleFormUI);
    }
    
    // Initialize schedule form UI
    updateScheduleFormUI();
    
    // Event listeners voor interactieve codegeneratie
    const startCodegenBtn = document.getElementById('start-ai-codegen-btn');
    const sendCodegenInstructionBtn = document.getElementById('send-codegen-instruction-btn');
    const editCodeBtn = document.getElementById('edit-code-btn');
    const saveCodeBtn = document.getElementById('save-code-btn');
    
    if (startCodegenBtn) {
        startCodegenBtn.addEventListener('click', startInteractiveCodegen);
    }
    
    if (sendCodegenInstructionBtn) {
        sendCodegenInstructionBtn.addEventListener('click', sendCodegenInstruction);
    }
    
    if (editCodeBtn) {
        editCodeBtn.addEventListener('click', enableCodeEditing);
    }
    
    if (saveCodeBtn) {
        saveCodeBtn.addEventListener('click', saveGeneratedCode);
    }
    
    // Event listeners voor Applicaties tab
    const addAppBtn = document.getElementById('add-app-btn');
    const stepActionSelect = document.getElementById('step-action');
    const addStepBtn = document.getElementById('add-step-btn');
    const saveScenarioBtn = document.getElementById('save-scenario-btn');
    const appsTabBtn = document.querySelector('[data-tab="apps"]');
    
    if (addAppBtn) {
        addAppBtn.addEventListener('click', addApp);
    }
    
    if (stepActionSelect) {
        stepActionSelect.addEventListener('change', updateStepFormUI);
        updateStepFormUI(); // Initialize
    }
    
    if (addStepBtn) {
        addStepBtn.addEventListener('click', addScenarioStep);
    }
    
    if (saveScenarioBtn) {
        saveScenarioBtn.addEventListener('click', saveScenario);
    }
    
    if (appsTabBtn) {
        appsTabBtn.addEventListener('click', () => {
            loadApps();
            loadScenarios();
            checkWinAppDriverStatus();
        });
    }
});

// ============================================
// INTERACTIEVE CODEGENERATIE FUNCTIES
// ============================================

let currentCodegenSession = null;

// Start interactieve codegeneratie
async function startInteractiveCodegen() {
    const description = document.getElementById('codegen-description').value;
    const codeElement = document.getElementById('generated-code');
    
    if (!description) {
        alert('Voer eerst een testbeschrijving in!');
        return;
    }
    
    if (codeElement) {
        codeElement.textContent = 'Codegeneratie gestart...\n';
    }
    
    try {
        // In een volledige implementatie zou dit een API-aanroep zijn naar de AI
        // Voor nu simuleren we de codegeneratie
        const simulatedCode = `const { test, expect } = require('@playwright/test');

test('${description.substring(0, 20)}', async ({ page }) => {
  // Navigeer naar de site
  await page.goto('https://example.com');
  
  // Wacht tot de pagina is geladen
  await page.waitForLoadState('networkidle');
  
  // Voer acties uit op basis van de beschrijving
  // TODO: Implementeer specifieke acties op basis van de beschrijving
  
  // Controleer resultaten
  await expect(page).toHaveTitle(/Example/);
});`;
        
        if (codeElement) {
            codeElement.textContent = simulatedCode;
        }
        
        currentCodegenSession = {
            description: description,
            code: simulatedCode
        };
        
        // Stuur een bericht naar de chat dat de codegeneratie is voltooid
        addChatMessage('bot', 'Ik heb een basis test gegenereerd op basis van je beschrijving. Je kunt de code nu bewerken of instructies geven om specifieke acties toe te voegen.');
    } catch (error) {
        if (codeElement) {
            codeElement.textContent = `Fout bij codegeneratie: ${error.message}\n`;
        }
    }
}

// Stuur instructies voor codegeneratie
async function sendCodegenInstruction() {
    const instruction = document.getElementById('codegen-instructions').value;
    const codeElement = document.getElementById('generated-code');
    
    if (!instruction) {
        alert('Voer eerst een instructie in!');
        return;
    }
    
    if (!currentCodegenSession) {
        alert('Er is geen actieve codegeneratie sessie!');
        return;
    }
    
    try {
        // In een volledige implementatie zou dit een API-aanroep zijn naar de AI
        // Voor nu simuleren we het bijwerken van de code op basis van de instructie
        const updatedCode = currentCodegenSession.code + `\n\n  // Instructie: ${instruction}\n  // TODO: Implementeer deze instructie`;
        
        if (codeElement) {
            codeElement.textContent = updatedCode;
        }
        
        currentCodegenSession.code = updatedCode;
        
        // Stuur een bericht naar de chat dat de instructie is verwerkt
        addChatMessage('bot', `Ik heb de instructie "${instruction}" verwerkt en de code bijgewerkt. Je kunt de code verder bewerken als dat nodig is.`);
        
        // Clear instruction input
        document.getElementById('codegen-instructions').value = '';
    } catch (error) {
        if (codeElement) {
            codeElement.textContent = `Fout bij verwerken instructie: ${error.message}\n`;
        }
    }
}

// Schakel code bewerken in
function enableCodeEditing() {
    const codeElement = document.getElementById('generated-code');
    
    if (codeElement) {
        codeElement.readOnly = false;
        codeElement.style.backgroundColor = '#ffffff';
        codeElement.style.color = '#000000';
        addChatMessage('bot', 'Je kunt nu de code direct bewerken in het tekstveld. Klik op "Code Opslaan" wanneer je klaar bent.');
    }
}

// Sla gegenereerde code op
async function saveGeneratedCode() {
    const codeElement = document.getElementById('generated-code');
    
    if (!codeElement) {
        alert('Geen code om op te slaan!');
        return;
    }
    
    const code = codeElement.value;
    
    if (!code) {
        alert('Er is geen code om op te slaan!');
        return;
    }
    
    try {
        // In een volledige implementatie zou dit een API-aanroep zijn om de code op te slaan
        // Voor nu simuleren we het opslaan
        const fileName = 'interactieve-test.spec.js';
        
        // Stuur een bericht naar de chat dat de code is opgeslagen
        addChatMessage('bot', `De code is opgeslagen als ${fileName}. Je kunt de test nu uitvoeren of verder bewerken.`);
        
        // Zet de code weer op read-only
        codeElement.readOnly = true;
        codeElement.style.backgroundColor = '#0f172a';
        codeElement.style.color = '#e2e8f0';
    } catch (error) {
        alert(`Fout bij opslaan code: ${error.message}`);
    }
}

// ============================================
// APPLICATIE TEST FUNCTIES (WinAppDriver)
// ============================================

let currentScenarioSteps = [];

// Check WinAppDriver status
async function checkWinAppDriverStatus() {
    const statusEl = document.getElementById('winappdriver-status');
    if (!statusEl) return;
    
    try {
        const response = await fetch('/api/winappdriver-status');
        const data = await response.json();
        
        if (data.running) {
            statusEl.className = 'status-badge status-success';
            statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> WinAppDriver actief';
        } else {
            statusEl.className = 'status-badge status-warning';
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> WinAppDriver niet bereikbaar. Start: WinAppDriver.exe';
        }
    } catch (error) {
        statusEl.className = 'status-badge status-danger';
        statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> WinAppDriver niet bereikbaar';
    }
}

// Load apps list
async function loadApps() {
    try {
        const response = await fetch('/api/apps');
        const apps = await response.json();
        
        const listEl = document.getElementById('apps-list');
        const scenarioSelect = document.getElementById('scenario-app');
        
        if (listEl) {
            if (apps.length === 0) {
                listEl.innerHTML = '<p class="empty-state">Geen applicaties geconfigureerd. Voeg er een toe!</p>';
            } else {
                listEl.innerHTML = apps.map(app => `
                    <div class="card" data-app-id="${app.id}">
                        <div class="card-header">
                            <h3><i class="fa-solid fa-desktop"></i> ${app.name}</h3>
                            <span class="status-badge status-info">Geconfigureerd</span>
                        </div>
                        <div class="card-body">
                            <div class="card-meta">
                                <i class="fa-solid fa-terminal"></i> ${app.target.substring(0, 60)}${app.target.length > 60 ? '...' : ''}
                            </div>
                            ${app.windowTitle ? `<div class="card-meta"><i class="fa-solid fa-window-maximize"></i> ${app.windowTitle}</div>` : ''}
                            ${app.description ? `<div class="card-meta"><i class="fa-solid fa-align-left"></i> ${app.description}</div>` : ''}
                        </div>
                        <div class="card-actions">
                            <button class="btn btn-danger btn-sm" onclick="deleteApp('${app.id}')" title="Verwijderen">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Update scenario dropdown
        if (scenarioSelect) {
            scenarioSelect.innerHTML = '<option value="">-- Kies een applicatie --</option>' +
                apps.map(app => `<option value="${app.id}">${app.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Fout bij laden apps:', error);
    }
}

// Add new app
async function addApp() {
    const name = document.getElementById('app-name').value.trim();
    const target = document.getElementById('app-target').value.trim();
    const windowTitle = document.getElementById('app-window-title').value.trim();
    const description = document.getElementById('app-description').value.trim();
    
    if (!name || !target) {
        alert('Naam en target zijn verplicht!');
        return;
    }
    
    try {
        const response = await fetch('/api/apps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, target, windowTitle, description })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('app-name').value = '';
            document.getElementById('app-target').value = '';
            document.getElementById('app-window-title').value = '';
            document.getElementById('app-description').value = '';
            loadApps();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Delete app
async function deleteApp(id) {
    if (!confirm('Weet je zeker dat je deze applicatie wilt verwijderen?')) return;
    
    try {
        const response = await fetch(`/api/apps/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            loadApps();
            loadScenarios();
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Update step form UI based on action type
function updateStepFormUI() {
    const action = document.getElementById('step-action').value;
    
    document.getElementById('step-target-group').style.display = 
        ['click', 'type', 'verify'].includes(action) ? 'block' : 'none';
    document.getElementById('step-text-group').style.display = 
        action === 'type' ? 'block' : 'none';
    document.getElementById('step-duration-group').style.display = 
        action === 'wait' ? 'block' : 'none';
    document.getElementById('step-key-group').style.display = 
        action === 'key' ? 'block' : 'none';
}

// Add step to scenario
function addScenarioStep() {
    const action = document.getElementById('step-action').value;
    const target = document.getElementById('step-target').value.trim();
    const text = document.getElementById('step-text').value.trim();
    const duration = document.getElementById('step-duration').value;
    const key = document.getElementById('step-key').value;
    const by = document.getElementById('step-by').value;
    
    const step = { action, by };
    
    if (target) step.target = target;
    if (text) step.text = text;
    if (duration) step.duration = parseInt(duration);
    if (key) step.key = key;
    
    currentScenarioSteps.push(step);
    renderStepsList();
    
    // Clear inputs
    document.getElementById('step-target').value = '';
    document.getElementById('step-text').value = '';
}

// Remove step from scenario
function removeStep(index) {
    currentScenarioSteps.splice(index, 1);
    renderStepsList();
}

// Render steps list
function renderStepsList() {
    const listEl = document.getElementById('steps-list');
    if (!listEl) return;
    
    if (currentScenarioSteps.length === 0) {
        listEl.innerHTML = '<p class="empty-state">Geen stappen toegevoegd.</p>';
        return;
    }
    
    listEl.innerHTML = currentScenarioSteps.map((step, index) => `
        <div class="step-item">
            <span class="step-number">${index + 1}</span>
            <span class="step-action">${step.action}</span>
            ${step.target ? `<span class="step-target">${step.target}</span>` : ''}
            ${step.text ? `<span class="step-text">"${step.text}"</span>` : ''}
            ${step.duration ? `<span class="step-duration">${step.duration}ms</span>` : ''}
            ${step.key ? `<span class="step-key">[${step.key}]</span>` : ''}
            <button class="btn btn-danger btn-xs" onclick="removeStep(${index})" title="Verwijderen">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `).join('');
}

// Save scenario
async function saveScenario() {
    const name = document.getElementById('scenario-name').value.trim();
    const appId = document.getElementById('scenario-app').value;
    
    if (!name || !appId) {
        alert('Scenario naam en applicatie zijn verplicht!');
        return;
    }
    
    if (currentScenarioSteps.length === 0) {
        alert('Voeg minimaal één stap toe!');
        return;
    }
    
    try {
        const response = await fetch('/api/app-scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, appId, steps: currentScenarioSteps })
        });
        
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('scenario-name').value = '';
            document.getElementById('scenario-app').value = '';
            currentScenarioSteps = [];
            renderStepsList();
            loadScenarios();
        } else {
            alert('Fout: ' + result.error);
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Load scenarios
async function loadScenarios() {
    try {
        const response = await fetch('/api/app-scenarios');
        const scenarios = await response.json();
        
        const listEl = document.getElementById('scenarios-list');
        if (!listEl) return;
        
        if (scenarios.length === 0) {
            listEl.innerHTML = '<p class="empty-state">Geen scenarios. Maak er een!</p>';
            return;
        }
        
        // Get apps for names
        const appsResponse = await fetch('/api/apps');
        const apps = await appsResponse.json();
        
        listEl.innerHTML = scenarios.map(scenario => {
            const app = apps.find(a => a.id === scenario.appId);
            return `
                <div class="card" data-scenario-id="${scenario.id}">
                    <div class="card-header">
                        <h3><i class="fa-solid fa-flask"></i> ${scenario.name}</h3>
                        <span class="status-badge status-info">${scenario.steps.length} stappen</span>
                    </div>
                    <div class="card-body">
                        <div class="card-meta">
                            <i class="fa-solid fa-desktop"></i> ${app ? app.name : 'Onbekende app'}
                        </div>
                        <div class="card-meta">
                            <i class="fa-solid fa-list-ol"></i> ${scenario.steps.map(s => s.action).join(', ')}
                        </div>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-primary btn-sm" onclick="runScenario('${scenario.id}')" title="Uitvoeren">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteScenario('${scenario.id}')" title="Verwijderen">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Fout bij laden scenarios:', error);
    }
}

// Run scenario
async function runScenario(id) {
    try {
        const response = await fetch(`/api/app-scenarios/${id}/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success === false) {
            alert('Scenario mislukt: ' + (result.error || 'Onbekende fout'));
        } else {
            const stepResults = result.steps.map(s => 
                `${s.action}: ${s.success ? '✅' : '❌'} ${s.message}`
            ).join('\n');
            
            alert(`Scenario uitgevoerd!\n\n${stepResults}`);
            
            // Show screenshots if any
            const screenshots = result.steps.filter(s => s.screenshot);
            if (screenshots.length > 0) {
                console.log('Screenshots:', screenshots.map(s => s.screenshot));
            }
        }
    } catch (error) {
        alert('Fout bij uitvoeren scenario: ' + error.message);
    }
}

// Delete scenario
async function deleteScenario(id) {
    if (!confirm('Weet je zeker dat je dit scenario wilt verwijderen?')) return;
    
    try {
        const response = await fetch(`/api/app-scenarios/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
            loadScenarios();
        }
    } catch (error) {
        alert('Fout: ' + error.message);
    }
}

// Socket.IO event for real-time app test updates
socket.on('app-test-step', (data) => {
    console.log('App test step:', data);
});
