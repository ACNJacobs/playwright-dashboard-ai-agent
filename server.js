// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// This file is part of the Playwright Dashboard.

const express = require('express');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 8080;

// Object om interactieve test sessies bij te houden
const interactiveSessions = {};

// === AI AGENT CONFIGURATION ===
const CONFIG_DIR = path.join(__dirname, 'config');
const API_CONFIG_FILE = path.join(CONFIG_DIR, 'api-config.json');
const SITE_AGENTS_FILE = path.join(CONFIG_DIR, 'site-agents.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Default API config
const DEFAULT_API_CONFIG = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  endpoint: '',
  maxTokens: 4000,
  temperature: 0.2
};

// Available AI providers configuration
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-4o',
    requiresEndpoint: false,
    baseUrl: 'https://api.openai.com/v1'
  },
  azure: {
    name: 'Azure OpenAI',
    defaultModel: 'gpt-4',
    requiresEndpoint: true,
    baseUrl: ''
  },
  claude: {
    name: 'Claude (Anthropic)',
    defaultModel: 'claude-3-opus-20240229',
    requiresEndpoint: false,
    baseUrl: 'https://api.anthropic.com'
  },
  grok: {
    name: 'Grok (xAI)',
    defaultModel: 'grok-2',
    requiresEndpoint: false,
    baseUrl: 'https://api.x.ai/v1'
  },
  ollama: {
    name: 'Ollama (Lokaal)',
    defaultModel: 'llama3.2',
    requiresEndpoint: true,
    baseUrl: 'http://localhost:11434'
  }
};

// Load API configuration
function loadApiConfig() {
  if (fs.existsSync(API_CONFIG_FILE)) {
    try {
      return { ...DEFAULT_API_CONFIG, ...JSON.parse(fs.readFileSync(API_CONFIG_FILE, 'utf8')) };
    } catch (e) {
      return DEFAULT_API_CONFIG;
    }
  }
  return DEFAULT_API_CONFIG;
}

// Save API configuration
function saveApiConfig(config) {
  fs.writeFileSync(API_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Load site agents
function loadSiteAgents() {
  if (fs.existsSync(SITE_AGENTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SITE_AGENTS_FILE, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Save site agents
function saveSiteAgents(agents) {
  fs.writeFileSync(SITE_AGENTS_FILE, JSON.stringify(agents, null, 2));
}

// AI API call helper
async function callAiApi(prompt, systemPrompt = '', tools = null) {
  const config = loadApiConfig();
  
  // Ollama vereist geen API key (lokaal), andere providers wel
  if (!config.apiKey && config.provider !== 'ollama') {
    throw new Error('AI API key niet geconfigureerd. Ga naar AI Agent > Configuratie.');
  }
  
  let url, headers, body;
  
  if (config.provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
    body = {
      model: config.model || 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.2
    };
    if (tools) body.tools = tools;
  } else if (config.provider === 'azure') {
    url = `${config.endpoint}/openai/deployments/${config.model}/chat/completions?api-version=2024-02-01`;
    headers = {
      'api-key': config.apiKey,
      'Content-Type': 'application/json'
    };
    body = {
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.2
    };
    if (tools) body.tools = tools;
  } else if (config.provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    };
    body = {
      model: config.model || 'claude-3-opus-20240229',
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.2,
      messages: [
        ...(systemPrompt ? [{ role: 'assistant', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ]
    };
    // Claude heeft tool_use/tool_result formaat - vereist extra handling
  } else if (config.provider === 'grok') {
    url = 'https://api.x.ai/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
    body = {
      model: config.model || 'grok-2',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.2
    };
    if (tools) body.tools = tools;
  } else if (config.provider === 'ollama') {
    url = `${config.endpoint || 'http://localhost:11434'}/api/chat`;
    headers = {
      'Content-Type': 'application/json'
    };
    body = {
      model: config.model || 'llama3.2',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      stream: false,
      options: {
        temperature: config.temperature || 0.2,
        num_predict: config.maxTokens || 4000
      }
    };
    // Ollama tools support is beperkt
  } else {
    throw new Error(`Onbekende provider: ${config.provider}`);
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI API fout: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (config.provider === 'claude') {
    return data.content?.[0]?.text || '';
  }
  
  if (config.provider === 'ollama') {
    return data.message?.content || '';
  }
  
  return data.choices?.[0]?.message?.content || '';
}

// Site crawler - analyze a website
async function crawlSite(baseUrl, credentials = null) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  const siteKnowledge = {
    baseUrl,
    pages: [],
    selectors: {},
    forms: [],
    navigation: [],
    meta: {}
  };
  
  try {
    // Navigate to base URL
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Extract page title and meta
    siteKnowledge.meta.title = await page.title();
    siteKnowledge.meta.url = page.url();
    
    // Extract all links
    const links = await page.$$eval('a[href]', anchors => 
      anchors.map(a => ({
        text: a.textContent?.trim(),
        href: a.href,
        isExternal: !a.href.startsWith(window.location.origin)
      })).filter(l => l.text && l.text.length > 0)
    );
    
    // Group internal links by path
    const internalLinks = links.filter(l => !l.isExternal);
    const uniquePaths = [...new Set(internalLinks.map(l => {
      try {
        return new URL(l.href).pathname;
      } catch {
        return l.href;
      }
    }))];
    
    siteKnowledge.navigation = uniquePaths.slice(0, 20).map(path => ({
      path,
      label: internalLinks.find(l => l.href.includes(path))?.text || path
    }));
    
    // Extract forms
    const forms = await page.$$eval('form', forms => 
      forms.map((form, idx) => ({
        id: form.id || `form-${idx}`,
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
          type: input.type || input.tagName.toLowerCase(),
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required,
          selector: input.id ? `#${input.id}` : input.name ? `[name="${input.name}"]` : input.placeholder ? `[placeholder="${input.placeholder}"]` : undefined
        }))
      }))
    );
    siteKnowledge.forms = forms;
    
    // Extract important selectors
    const selectors = {};
    
    // Try to find login form
    const loginForm = forms.find(f => 
      f.inputs.some(i => i.type === 'password') ||
      f.inputs.some(i => i.name?.includes('pass')) ||
      f.inputs.some(i => i.name?.includes('login'))
    );
    if (loginForm) {
      selectors.loginForm = `#${loginForm.id}`;
      selectors.usernameInput = loginForm.inputs.find(i => i.type === 'text' || i.type === 'email')?.selector;
      selectors.passwordInput = loginForm.inputs.find(i => i.type === 'password')?.selector;
      selectors.submitButton = loginForm.inputs.find(i => i.type === 'submit')?.selector || `${selectors.loginForm} button[type="submit"]`;
    }
    
    // Try to find navigation
    const navSelectors = await page.$$eval('nav, header, [role="navigation"]', els => 
      els.map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        class: el.className,
        selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
      }))
    );
    if (navSelectors.length > 0) {
      selectors.navigation = navSelectors[0].selector;
    }
    
    // Try to find main content area
    const mainSelectors = await page.$$eval('main, [role="main"], #content, .content', els =>
      els.map(el => ({
        tag: el.tagName.toLowerCase(),
        id: el.id,
        class: el.className,
        selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
      }))
    );
    if (mainSelectors.length > 0) {
      selectors.mainContent = mainSelectors[0].selector;
    }
    
    siteKnowledge.selectors = selectors;
    
    // Take a screenshot for reference
    const screenshotPath = path.join(__dirname, 'config', `site-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    siteKnowledge.screenshot = screenshotPath;
    
  } catch (error) {
    console.error('Crawl error:', error);
    siteKnowledge.error = error.message;
  } finally {
    await browser.close();
  }
  
  return siteKnowledge;
}

// Helper function to calculate next run time
function calculateNextRun(test) {
  const now = new Date();
  let nextRun = new Date(now);
  
  switch (test.scheduleType) {
    case 'interval':
      const lastRun = test.lastRun ? new Date(test.lastRun) : null;
      const intervalMs = (test.intervalMinutes || 60) * 60 * 1000;
      nextRun = lastRun ? new Date(lastRun.getTime() + intervalMs) : now;
      if (nextRun < now) nextRun = now; // If overdue, run now
      break;
      
    case 'hourly':
      nextRun.setMinutes(0, 0, 0);
      nextRun.setHours(nextRun.getHours() + 1);
      break;
      
    case 'daily':
      if (test.time) {
        const [hours, minutes] = test.time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      if (test.time && test.dayOfWeek !== undefined) {
        const [hours, minutes] = test.time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        const daysUntil = (test.dayOfWeek - nextRun.getDay() + 7) % 7;
        nextRun.setDate(nextRun.getDate() + daysUntil);
        if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
      
    case 'monthly':
      if (test.time && test.dayOfMonth !== undefined) {
        const [hours, minutes] = test.time.split(':').map(Number);
        nextRun.setHours(hours, minutes, 0, 0);
        nextRun.setDate(test.dayOfMonth);
        if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
      
    default:
      // Legacy interval-based
      const lastRunLegacy = test.lastRun ? new Date(test.lastRun) : null;
      const intervalMsLegacy = (test.intervalMinutes || 60) * 60 * 1000;
      nextRun = lastRunLegacy ? new Date(lastRunLegacy.getTime() + intervalMsLegacy) : now;
      if (nextRun < now) nextRun = now;
  }
  
  return nextRun.toISOString();
}

// Helper function to format next run in human readable format
function formatNextRun(nextRunISO) {
  const nextRun = new Date(nextRunISO);
  const now = new Date();
  const diffMs = nextRun - now;
  
  if (diffMs <= 0) return 'Nu';
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 60) return `Over ${diffMins} min`;
  if (diffHours < 24) return `Over ${diffHours} uur`;
  if (diffDays === 1) return 'Morgen om ' + nextRun.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return `${nextRun.toLocaleDateString('nl-NL', { weekday: 'long' })} om ${nextRun.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}`;
  
  return nextRun.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Scheduled tests storage
const SCHEDULED_TESTS_FILE = path.join(__dirname, 'scheduled-tests.json');
let scheduledTests = [];

// Load scheduled tests from file
function loadScheduledTests() {
  if (fs.existsSync(SCHEDULED_TESTS_FILE)) {
    try {
      scheduledTests = JSON.parse(fs.readFileSync(SCHEDULED_TESTS_FILE, 'utf8'));
      // Migrate old data: add runHistory if missing
      scheduledTests.forEach(test => {
        if (!test.runHistory) test.runHistory = [];
      });
    } catch (e) {
      scheduledTests = [];
    }
  }
}

// Save scheduled tests to file
function saveScheduledTests() {
  fs.writeFileSync(SCHEDULED_TESTS_FILE, JSON.stringify(scheduledTests, null, 2));
}

// Run a scheduled test
function runScheduledTest(scheduledTest) {
  const testPath = path.join('tests', scheduledTest.testFile);
  if (!fs.existsSync(testPath)) {
    console.error(`Scheduled test file not found: ${scheduledTest.testFile}`);
    return;
  }
  
  // Gebruik altijd forward slashes voor Playwright (cross-platform)
  const testPathForward = 'tests/' + scheduledTest.testFile;
  const command = `npx playwright test "${testPathForward}"`;
  
  const startTime = Date.now();
  
  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    const success = !error || error.code === 0;
    const timestamp = new Date().toISOString();
    const duration = Date.now() - startTime;
    
    // Update last run info
    const testIndex = scheduledTests.findIndex(t => t.id === scheduledTest.id);
    if (testIndex !== -1) {
      scheduledTests[testIndex].lastRun = timestamp;
      scheduledTests[testIndex].lastResult = success ? 'success' : 'failed';
      
      // Add to run history (keep last 20 runs)
      if (!scheduledTests[testIndex].runHistory) scheduledTests[testIndex].runHistory = [];
      scheduledTests[testIndex].runHistory.unshift({
        timestamp,
        result: success ? 'success' : 'failed',
        duration,
        output: (stdout + stderr).substring(0, 5000) // Limit output size
      });
      if (scheduledTests[testIndex].runHistory.length > 20) {
        scheduledTests[testIndex].runHistory = scheduledTests[testIndex].runHistory.slice(0, 20);
      }
      
      saveScheduledTests();
    }
    
    console.log(`[${timestamp}] Scheduled test ${scheduledTest.testFile} completed: ${success ? 'success' : 'failed'} (${duration}ms)`);
    
    // Notify clients
    io.emit('scheduled-test-completed', { 
      id: scheduledTest.id, 
      testFile: scheduledTest.testFile, 
      success,
      timestamp,
      duration
    });
  });
}

// Scheduler loop - check every minute
setInterval(() => {
  const now = new Date();
  
  scheduledTests.forEach(test => {
    if (!test.enabled) return;
    
    // Check if it's time to run based on schedule type
    let shouldRun = false;
    
    switch (test.scheduleType) {
      case 'interval':
        // Original interval-based scheduling
        const lastRun = test.lastRun ? new Date(test.lastRun) : null;
        const intervalMs = (test.intervalMinutes || 60) * 60 * 1000;
        shouldRun = !lastRun || (now - lastRun) >= intervalMs;
        break;
        
      case 'hourly':
        // Run every hour at XX:00
        if (now.getMinutes() === 0) {
          const lastRunHourly = test.lastRun ? new Date(test.lastRun) : null;
          if (!lastRunHourly || 
              now.getHours() !== lastRunHourly.getHours() || 
              now.getDate() !== lastRunHourly.getDate() ||
              now.getMonth() !== lastRunHourly.getMonth() ||
              now.getFullYear() !== lastRunHourly.getFullYear()) {
            shouldRun = true;
          }
        }
        break;
        
      case 'daily':
        // Run daily at specified time
        if (test.time) {
          const [hours, minutes] = test.time.split(':').map(Number);
          if (now.getHours() === hours && now.getMinutes() === minutes) {
            const lastRunDaily = test.lastRun ? new Date(test.lastRun) : null;
            if (!lastRunDaily || 
                now.getDate() !== lastRunDaily.getDate() ||
                now.getMonth() !== lastRunDaily.getMonth() ||
                now.getFullYear() !== lastRunDaily.getFullYear()) {
              shouldRun = true;
            }
          }
        }
        break;
        
      case 'weekly':
        // Run weekly on specified day and time
        if (test.time && test.dayOfWeek !== undefined) {
          const [hours, minutes] = test.time.split(':').map(Number);
          if (now.getDay() === test.dayOfWeek && now.getHours() === hours && now.getMinutes() === minutes) {
            const lastRunWeekly = test.lastRun ? new Date(test.lastRun) : null;
            if (!lastRunWeekly || 
                getWeekNumber(now) !== getWeekNumber(new Date(lastRunWeekly)) ||
                now.getFullYear() !== lastRunWeekly.getFullYear()) {
              shouldRun = true;
            }
          }
        }
        break;
        
      case 'monthly':
        // Run monthly on specified day and time
        if (test.time && test.dayOfMonth !== undefined) {
          const [hours, minutes] = test.time.split(':').map(Number);
          if (now.getDate() === test.dayOfMonth && now.getHours() === hours && now.getMinutes() === minutes) {
            const lastRunMonthly = test.lastRun ? new Date(test.lastRun) : null;
            if (!lastRunMonthly || 
                now.getMonth() !== lastRunMonthly.getMonth() ||
                now.getFullYear() !== lastRunMonthly.getFullYear()) {
              shouldRun = true;
            }
          }
        }
        break;
        
      default:
        // Legacy interval-based (no scheduleType)
        const lastRunLegacy = test.lastRun ? new Date(test.lastRun) : null;
        const intervalMsLegacy = (test.intervalMinutes || 60) * 60 * 1000;
        shouldRun = !lastRunLegacy || (now - lastRunLegacy) >= intervalMsLegacy;
    }
    
    if (shouldRun) {
      runScheduledTest(test);
    }
  });
}, 60000); // Check every minute

// Helper function to get week number
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

// Load scheduled tests on startup
loadScheduledTests();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Helper functie om tests te scannen
function scanTests() {
  const testsDir = path.join(__dirname, 'tests');
  if (!fs.existsSync(testsDir)) return [];
  
  return fs.readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.js'))
    .map(f => ({
      name: f.replace('.spec.js', ''),
      file: f,
      path: path.join('tests', f)
    }));
}

// Helper functie om video's te scannen
function scanVideos() {
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) return [];
  
  const videos = [];
  fs.readdirSync(resultsDir).forEach(dir => {
    const videoPath = path.join(resultsDir, dir, 'video.webm');
    if (fs.existsSync(videoPath)) {
      videos.push({
        name: dir,
        path: `/test-results/${dir}/video.webm`,
        fullPath: videoPath
      });
    }
  });
  return videos;
}

// Helper functie om screenshots te scannen
function scanScreenshots() {
  const resultsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(resultsDir)) return [];
  
  const screenshots = [];
  fs.readdirSync(resultsDir).forEach(dir => {
    const dirPath = path.join(resultsDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      fs.readdirSync(dirPath).forEach(file => {
        if (file.endsWith('.png')) {
          screenshots.push({
            name: `${dir}/${file}`,
            path: `/test-results/${dir}/${file}`
          });
        }
      });
    }
  });
  return screenshots;
}

// API Routes

// Haal alle tests op
app.get('/api/tests', (req, res) => {
  res.json(scanTests());
});

// Haal alle video's op
app.get('/api/videos', (req, res) => {
  res.json(scanVideos());
});

// Haal alle screenshots op
app.get('/api/screenshots', (req, res) => {
  res.json(scanScreenshots());
});

// Voer een specifieke test uit
app.post('/api/run-test', (req, res) => {
  const { testFile, headed } = req.body;
  if (!testFile) {
    return res.status(400).json({ error: 'Geen testbestand opgegeven' });
  }
  
  const testPath = path.join('tests', testFile);
  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: 'Testbestand niet gevonden' });
  }
  
  // Gebruik altijd forward slashes voor Playwright (cross-platform)
  const testPathForward = 'tests/' + testFile;
  const command = `npx playwright test "${testPathForward}" ${headed ? '--headed --project=chromium' : ''}`;
  
  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    const success = !error || error.code === 0;
    res.json({
      success,
      output: stdout + stderr,
      testFile
    });
    
    // Stuur update naar alle verbonden clients
    io.emit('test-completed', { testFile, success });
  });
});

// Start een interactieve test sessie
app.post('/api/start-interactive-test', (req, res) => {
  const { testFile, headed } = req.body;
  if (!testFile) {
    return res.status(400).json({ error: 'Geen testbestand opgegeven' });
  }
  
  const testPath = path.join('tests', testFile);
  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: 'Testbestand niet gevonden' });
  }
  
  // Gebruik altijd forward slashes voor Playwright (cross-platform)
  const testPathForward = 'tests/' + testFile;
  const command = `npx playwright test "${testPathForward}" ${headed ? '--headed --project=chromium' : ''} --reporter=list`;
  
  // Start de test in een child process
  const child = exec(command, { cwd: __dirname });
  
  // Sla de child process op zodat we er later instructies naar kunnen sturen
  const sessionId = Date.now().toString();
  interactiveSessions[sessionId] = {
    process: child,
    testFile: testFile,
    socketId: req.body.socketId
  };
  
  res.json({
    success: true,
    sessionId: sessionId,
    message: 'Interactieve test sessie gestart'
  });
  
  // Stuur output naar de client via Socket.IO
  child.stdout.on('data', (data) => {
    io.to(req.body.socketId).emit('interactive-test-output', { sessionId, output: data });
  });
  
  child.stderr.on('data', (data) => {
    io.to(req.body.socketId).emit('interactive-test-output', { sessionId, output: data, isError: true });
  });
  
  child.on('close', (code) => {
    io.to(req.body.socketId).emit('interactive-test-completed', { sessionId, code });
    delete interactiveSessions[sessionId];
  });
});

// Stuur een instructie naar een lopende interactieve test
app.post('/api/send-instruction', (req, res) => {
  const { sessionId, instruction } = req.body;
  
  if (!sessionId || !interactiveSessions[sessionId]) {
    return res.status(404).json({ error: 'Sessie niet gevonden' });
  }
  
  if (!instruction) {
    return res.status(400).json({ error: 'Geen instructie opgegeven' });
  }
  
  // Voor nu sturen we de instructie naar de client via Socket.IO
  // In een volledige implementatie zouden we hier de instructie naar de test sturen
  io.to(interactiveSessions[sessionId].socketId).emit('instruction-received', { sessionId, instruction });
  
  res.json({
    success: true,
    message: 'Instructie verzonden'
  });
});

// Voer alle tests uit
app.post('/api/run-all-tests', (req, res) => {
  const command = 'npx playwright test';
  
  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    const success = !error || error.code === 0;
    res.json({
      success,
      output: stdout + stderr
    });
    
    io.emit('all-tests-completed', { success });
  });
});

// Start codegen
app.post('/api/codegen', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Geen URL opgegeven' });
  }
  
  // Start codegen in achtergrond met spawn (beter voor langdurige processen)
  const { spawn } = require('child_process');
  const codegen = spawn('npx', ['playwright', 'codegen', url], { 
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
    shell: true
  });
  
  codegen.on('error', (err) => {
    console.error('Codegen fout:', err);
  });
  
  // Laat het proces los zodat het zelfstandig draait
  codegen.unref();
  
  res.json({ 
    success: true, 
    message: `Codegen gestart voor ${url}. Er opent een browser venster.`,
    pid: codegen.pid
  });
});

// Genereer rapport
app.post('/api/generate-report', (req, res) => {
  exec('npx playwright show-report', { cwd: __dirname }, (error) => {
    res.json({ 
      success: true, 
      message: 'Rapport server gestart op http://localhost:9323'
    });
  });
});

// Maak nieuw testbestand
app.post('/api/create-test', (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Naam en code zijn verplicht' });
  }
  
  const fileName = `${name}.spec.js`;
  const filePath = path.join('tests', fileName);
  
  fs.writeFileSync(filePath, code);
  
  res.json({
    success: true,
    message: `Test ${fileName} aangemaakt`,
    file: fileName
  });
});

// Verwijder test
app.delete('/api/delete-test/:name', (req, res) => {
  const { name } = req.params;
  const filePath = path.join('tests', `${name}.spec.js`);
  
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true, message: `Test ${name} verwijderd` });
  } else {
    res.status(404).json({ error: 'Test niet gevonden' });
  }
});

// === SCHEDULED TESTS API ===

// Get all scheduled tests
app.get('/api/scheduled-tests', (req, res) => {
  // Add computed nextRun field to each test
  const testsWithNextRun = scheduledTests.map(test => ({
    ...test,
    nextRun: calculateNextRun(test),
    nextRunFormatted: formatNextRun(calculateNextRun(test))
  }));
  res.json(testsWithNextRun);
});

// Add a scheduled test
app.post('/api/scheduled-tests', (req, res) => {
  const { testFile, scheduleType, intervalMinutes, enabled, time, dayOfWeek, dayOfMonth } = req.body;
  
  if (!testFile) {
    return res.status(400).json({ error: 'testFile is verplicht' });
  }
  
  const testPath = path.join('tests', testFile);
  if (!fs.existsSync(testPath)) {
    return res.status(404).json({ error: 'Testbestand niet gevonden' });
  }
  
  // Validate schedule type and parameters
  if (!scheduleType) {
    return res.status(400).json({ error: 'scheduleType is verplicht' });
  }
  
  const validScheduleTypes = ['interval', 'daily', 'weekly', 'monthly', 'hourly'];
  if (!validScheduleTypes.includes(scheduleType)) {
    return res.status(400).json({ error: `Ongeldig scheduleType. Geldige waarden: ${validScheduleTypes.join(', ')}` });
  }
  
  // Validate parameters based on schedule type
  if (scheduleType === 'interval' && (!intervalMinutes || intervalMinutes < 1)) {
    return res.status(400).json({ error: 'intervalMinutes is verplicht en moet minimaal 1 zijn voor interval scheduling' });
  }
  
  if (scheduleType === 'daily' && !time) {
    return res.status(400).json({ error: 'time is verplicht voor daily scheduling (format: HH:MM)' });
  }
  
  if (scheduleType === 'weekly' && (!time || dayOfWeek === undefined)) {
    return res.status(400).json({ error: 'time en dayOfWeek zijn verplicht voor weekly scheduling (time format: HH:MM, dayOfWeek: 0-6 waar 0=zondag)' });
  }
  
  if (scheduleType === 'monthly' && (!time || dayOfMonth === undefined)) {
    return res.status(400).json({ error: 'time en dayOfMonth zijn verplicht voor monthly scheduling (time format: HH:MM, dayOfMonth: 1-31)' });
  }
  
  const scheduledTest = {
    id: Date.now().toString(),
    testFile,
    scheduleType,
    intervalMinutes: scheduleType === 'interval' ? parseInt(intervalMinutes) : undefined,
    time: time || undefined, // Format: "HH:MM"
    dayOfWeek: dayOfWeek !== undefined ? parseInt(dayOfWeek) : undefined, // 0-6 (0 = Sunday)
    dayOfMonth: dayOfMonth !== undefined ? parseInt(dayOfMonth) : undefined, // 1-31
    enabled: enabled !== false,
    createdAt: new Date().toISOString(),
    lastRun: null,
    lastResult: null
  };
  
  scheduledTests.push(scheduledTest);
  saveScheduledTests();
  
  let message = `Test ${testFile} gepland`;
  switch (scheduleType) {
    case 'interval':
      message += ` om elke ${intervalMinutes} minuten te draaien`;
      break;
    case 'hourly':
      message += ` om elk uur te draaien`;
      break;
    case 'daily':
      message += ` dagelijks om ${time} te draaien`;
      break;
    case 'weekly':
      const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
      message += ` wekelijks op ${days[dayOfWeek]} om ${time} te draaien`;
      break;
    case 'monthly':
      message += ` maandelijks op dag ${dayOfMonth} om ${time} te draaien`;
      break;
  }
  
  res.json({
    success: true,
    message,
    scheduledTest
  });
});

// Update a scheduled test
app.put('/api/scheduled-tests/:id', (req, res) => {
  const { id } = req.params;
  const { enabled, scheduleType, intervalMinutes, time, dayOfWeek, dayOfMonth } = req.body;
  
  const testIndex = scheduledTests.findIndex(t => t.id === id);
  if (testIndex === -1) {
    return res.status(404).json({ error: 'Geplande test niet gevonden' });
  }
  
  // Update basic fields
  if (enabled !== undefined) scheduledTests[testIndex].enabled = enabled;
  
  // Update schedule fields (full edit support)
  if (scheduleType) {
    const validScheduleTypes = ['interval', 'daily', 'weekly', 'monthly', 'hourly'];
    if (!validScheduleTypes.includes(scheduleType)) {
      return res.status(400).json({ error: `Ongeldig scheduleType. Geldige waarden: ${validScheduleTypes.join(', ')}` });
    }
    scheduledTests[testIndex].scheduleType = scheduleType;
  }
  
  if (intervalMinutes !== undefined) {
    scheduledTests[testIndex].intervalMinutes = parseInt(intervalMinutes);
  }
  
  if (time !== undefined) {
    scheduledTests[testIndex].time = time;
  }
  
  if (dayOfWeek !== undefined) {
    scheduledTests[testIndex].dayOfWeek = parseInt(dayOfWeek);
  }
  
  if (dayOfMonth !== undefined) {
    scheduledTests[testIndex].dayOfMonth = parseInt(dayOfMonth);
  }
  
  // Clean up fields that don't apply to the current schedule type
  const currentType = scheduledTests[testIndex].scheduleType;
  if (currentType !== 'interval') scheduledTests[testIndex].intervalMinutes = undefined;
  if (currentType !== 'daily' && currentType !== 'weekly' && currentType !== 'monthly') scheduledTests[testIndex].time = undefined;
  if (currentType !== 'weekly') scheduledTests[testIndex].dayOfWeek = undefined;
  if (currentType !== 'monthly') scheduledTests[testIndex].dayOfMonth = undefined;
  
  saveScheduledTests();
  
  res.json({
    success: true,
    message: 'Geplande test bijgewerkt',
    scheduledTest: scheduledTests[testIndex]
  });
});

// Delete a scheduled test
app.delete('/api/scheduled-tests/:id', (req, res) => {
  const { id } = req.params;
  
  const testIndex = scheduledTests.findIndex(t => t.id === id);
  if (testIndex === -1) {
    return res.status(404).json({ error: 'Geplande test niet gevonden' });
  }
  
  const removed = scheduledTests.splice(testIndex, 1)[0];
  saveScheduledTests();
  
  res.json({
    success: true,
    message: `Geplande test ${removed.testFile} verwijderd`
  });
});

// Run a scheduled test immediately
app.post('/api/scheduled-tests/:id/run-now', (req, res) => {
  const { id } = req.params;
  
  const scheduledTest = scheduledTests.find(t => t.id === id);
  if (!scheduledTest) {
    return res.status(404).json({ error: 'Geplande test niet gevonden' });
  }
  
  runScheduledTest(scheduledTest);
  
  res.json({
    success: true,
    message: `Test ${scheduledTest.testFile} wordt nu uitgevoerd`
  });
});

// Lees test inhoud
app.get('/api/test/:name', (req, res) => {
  const { name } = req.params;
  const filePath = path.join('tests', `${name}.spec.js`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Test niet gevonden' });
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ name, content });
});

// Update testbestand
app.put('/api/test/:name', (req, res) => {
  const { name } = req.params;
  const { code, newName } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Code is verplicht' });
  }
  
  const filePath = path.join('tests', `${name}.spec.js`);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Test niet gevonden' });
  }
  
  // Als naam is gewijzigd, hernoem het bestand
  if (newName && newName !== name) {
    const newFilePath = path.join('tests', `${newName}.spec.js`);
    
    // Controleer of nieuwe naam al bestaat
    if (fs.existsSync(newFilePath)) {
      return res.status(400).json({ error: 'Een test met deze naam bestaat al' });
    }
    
    fs.writeFileSync(filePath, code);
    fs.renameSync(filePath, newFilePath);
    
    res.json({
      success: true,
      message: `Test hernoemd van "${name}" naar "${newName}"`,
      newName: newName
    });
  } else {
    fs.writeFileSync(filePath, code);
    
    res.json({
      success: true,
      message: `Test "${name}" bijgewerkt`
    });
  }
});

// Serve test-results als statische bestanden
app.use('/test-results', express.static(path.join(__dirname, 'test-results')));
app.use('/playwright-report', express.static(path.join(__dirname, 'playwright-report')));
app.use('/.playwright-mcp', express.static(path.join(__dirname, '.playwright-mcp')));

// === AI AGENT API ROUTES ===

// Get API configuration
app.get('/api/ai-config', (req, res) => {
  const config = loadApiConfig();
  // Don't return the full API key for security
  const safeConfig = {
    ...config,
    apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : ''
  };
  res.json(safeConfig);
});

// Update API configuration
app.post('/api/ai-config', (req, res) => {
  const { provider, apiKey, model, endpoint, maxTokens, temperature } = req.body;
  const currentConfig = loadApiConfig();
  
  const newConfig = {
    provider: provider || currentConfig.provider,
    apiKey: apiKey && !apiKey.startsWith('••••') ? apiKey : currentConfig.apiKey,
    model: model || currentConfig.model,
    endpoint: endpoint || currentConfig.endpoint,
    maxTokens: parseInt(maxTokens) || currentConfig.maxTokens,
    temperature: parseFloat(temperature) || currentConfig.temperature
  };
  
  saveApiConfig(newConfig);
  res.json({ success: true, message: 'AI configuratie opgeslagen' });
});

// Test AI configuratie (verbinding testen)
app.post('/api/test-ai-config', async (req, res) => {
  try {
    const config = loadApiConfig();
    
    if (config.provider === 'ollama') {
      // Test Ollama verbinding
      const ollamaUrl = `${config.endpoint || 'http://localhost:11434'}/api/tags`;
      const response = await fetch(ollamaUrl, { method: 'GET' });
      
      if (!response.ok) {
        throw new Error(`Ollama niet bereikbaar: ${response.status}`);
      }
      
      const data = await response.json();
      const models = data.models?.map(m => m.name) || [];
      const hasModel = models.includes(config.model);
      
      res.json({
        success: true,
        provider: config.provider,
        model: config.model,
        availableModels: models,
        modelAvailable: hasModel,
        message: hasModel 
          ? `✅ Ollama werkt! Model "${config.model}" gevonden.` 
          : `⚠️ Ollama werkt, maar model "${config.model}" niet gevonden. Beschikbaar: ${models.slice(0, 5).join(', ')}`
      });
    } else {
      // Test andere providers met een simpele call
      const result = await callAiApi('Say "Connection OK" and nothing else.', 'You are a test bot.');
      res.json({
        success: true,
        provider: config.provider,
        model: config.model,
        response: result,
        message: '✅ AI provider werkt!'
      });
    }
  } catch (error) {
    res.json({
      success: false,
      provider: req.body.provider || loadApiConfig().provider,
      error: error.message,
      message: `❌ Verbinding mislukt: ${error.message}`
    });
  }
});

// Get all site agents
app.get('/api/site-agents', (req, res) => {
  const agents = loadSiteAgents();
  // Remove sensitive credentials from response
  const safeAgents = agents.map(agent => ({
    ...agent,
    credentials: agent.credentials ? { username: agent.credentials.username } : null
  }));
  res.json(safeAgents);
});

// Get single site agent
app.get('/api/site-agents/:id', (req, res) => {
  const { id } = req.params;
  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  res.json(agent);
});

// Create new site agent (register site)
app.post('/api/site-agents', async (req, res) => {
  const { name, baseUrl, credentials, description } = req.body;
  
  if (!name || !baseUrl) {
    return res.status(400).json({ error: 'Naam en URL zijn verplicht' });
  }
  
  try {
    // Validate URL
    new URL(baseUrl);
  } catch {
    return res.status(400).json({ error: 'Ongeldige URL' });
  }
  
  const agents = loadSiteAgents();
  
  // Check if site already exists
  if (agents.some(a => a.baseUrl === baseUrl)) {
    return res.status(400).json({ error: 'Deze site is al geregistreerd' });
  }
  
  const newAgent = {
    id: Date.now().toString(),
    name,
    baseUrl,
    description: description || '',
    credentials: credentials || null,
    pages: [],
    selectors: {},
    forms: [],
    navigation: [],
    flows: [],
    meta: {},
    skills: [], // Agent skills
    linkedTests: [], // Gekoppelde bestaande tests
    learnedAt: null,
    isLearned: false,
    createdAt: new Date().toISOString()
  };
  
  agents.push(newAgent);
  saveSiteAgents(agents);
  
  res.json({
    success: true,
    message: `Site agent "${name}" geregistreerd`,
    agent: newAgent
  });
});

// Learn about a site (crawl)
app.post('/api/site-agents/:id/learn', async (req, res) => {
  const { id } = req.params;
  const agents = loadSiteAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  
  if (agentIndex === -1) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  const agent = agents[agentIndex];
  
  try {
    // Start crawling
    const knowledge = await crawlSite(agent.baseUrl, agent.credentials);
    
    // Update agent with learned knowledge
    agents[agentIndex] = {
      ...agent,
      pages: knowledge.pages || [],
      selectors: knowledge.selectors || {},
      forms: knowledge.forms || [],
      navigation: knowledge.navigation || [],
      meta: knowledge.meta || {},
      screenshot: knowledge.screenshot || null,
      learnedAt: new Date().toISOString(),
      isLearned: true,
      error: knowledge.error || null
    };
    
    saveSiteAgents(agents);
    
    res.json({
      success: true,
      message: `Site "${agent.name}" geanalyseerd`,
      agent: agents[agentIndex]
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Fout bij analyseren: ${error.message}`
    });
  }
});

// Delete site agent
app.delete('/api/site-agents/:id', (req, res) => {
  const { id } = req.params;
  let agents = loadSiteAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  
  if (agentIndex === -1) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  const removed = agents.splice(agentIndex, 1)[0];
  saveSiteAgents(agents);
  
  res.json({
    success: true,
    message: `Site agent "${removed.name}" verwijderd`
  });
});

// Add manual knowledge to site agent
app.post('/api/site-agents/:id/knowledge', (req, res) => {
  const { id } = req.params;
  const { type, key, value } = req.body;
  
  let agents = loadSiteAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  
  if (agentIndex === -1) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  const agent = agents[agentIndex];
  
  // Initialize if not exists
  if (!agent.selectors) agent.selectors = {};
  if (!agent.forms) agent.forms = [];
  if (!agent.navigation) agent.navigation = [];
  if (!agent.custom) agent.custom = {};
  
  // Add based on type
  switch (type) {
    case 'selector':
      agent.selectors[key] = value;
      break;
    case 'form':
      agent.forms.push({ name: key, description: value, inputs: [] });
      break;
    case 'navigation':
      agent.navigation.push({ text: key, url: value });
      break;
    case 'custom':
    default:
      if (!agent.custom) agent.custom = {};
      agent.custom[key] = value;
      break;
  }
  
  agent.isLearned = true;
  agent.learnedAt = new Date().toISOString();
  
  saveSiteAgents(agents);
  
  res.json({
    success: true,
    message: `Kennis "${key}" toegevoegd`,
    agent: agents[agentIndex]
  });
});
app.delete('/api/site-agents/:id', (req, res) => {
  const { id } = req.params;
  let agents = loadSiteAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  
  if (agentIndex === -1) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  const removed = agents.splice(agentIndex, 1)[0];
  saveSiteAgents(agents);
  
  res.json({
    success: true,
    message: `Site agent "${removed.name}" verwijderd`
  });
});

// Update site agent (skills, linked tests)
app.put('/api/site-agents/:id', (req, res) => {
  const { id } = req.params;
  const { skills, linkedTests, description } = req.body;
  
  let agents = loadSiteAgents();
  const agentIndex = agents.findIndex(a => a.id === id);
  
  if (agentIndex === -1) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  if (skills !== undefined) agents[agentIndex].skills = skills;
  if (linkedTests !== undefined) agents[agentIndex].linkedTests = linkedTests;
  if (description !== undefined) agents[agentIndex].description = description;
  
  saveSiteAgents(agents);
  
  res.json({
    success: true,
    message: 'Site agent bijgewerkt',
    agent: agents[agentIndex]
  });
});

// Get available AI providers
app.get('/api/ai-providers', (req, res) => {
  res.json(AI_PROVIDERS);
});

// Get available models from AI provider
app.get('/api/ai-models', async (req, res) => {
  const config = loadApiConfig();
  
  if (!config.apiKey && config.provider !== 'ollama') {
    return res.status(400).json({ error: 'API key niet geconfigureerd' });
  }
  
  try {
    let models = [];
    
    if (config.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      const data = await response.json();
      // Filter alleen chat modellen (gpt-)
      models = data.data
        ?.filter(m => m.id.startsWith('gpt-'))
        ?.map(m => ({ id: m.id, name: m.id }))
        ?.sort((a, b) => a.id.localeCompare(b.id)) || [];
        
    } else if (config.provider === 'grok') {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${config.apiKey}` }
      });
      const data = await response.json();
      models = data.models
        ?.map(m => ({ id: m.id, name: m.id }))
        ?.sort((a, b) => a.id.localeCompare(b.id)) || [];
        
    } else if (config.provider === 'claude') {
      // Claude heeft geen publieke models API, gebruik bekende modellen
      models = [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' }
      ];
      
    } else if (config.provider === 'ollama') {
      const baseUrl = config.endpoint || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/tags`);
      const data = await response.json();
      models = data.models
        ?.map(m => ({ id: m.name, name: m.name }))
        ?.sort((a, b) => a.name.localeCompare(b.name)) || [];
        
    } else if (config.provider === 'azure') {
      // Azure gebruikt deployments, haal op van endpoint
      if (config.endpoint) {
        const response = await fetch(`${config.endpoint}/openai/deployments?api-version=2023-03-15-preview`, {
          headers: { 'api-key': config.apiKey }
        });
        const data = await response.json();
        models = data.data
          ?.map(d => ({ id: d.id, name: `${d.id} (${d.model})` }))
          ?.sort((a, b) => a.id.localeCompare(b.id)) || [];
      } else {
        models = [{ id: 'gpt-4', name: 'gpt-4' }, { id: 'gpt-35-turbo', name: 'gpt-35-turbo' }];
      }
    }
    
    res.json(models);
    
  } catch (error) {
    res.status(500).json({ error: `Fout bij ophalen modellen: ${error.message}` });
  }
});

// Get available tests for linking
app.get('/api/available-tests', (req, res) => {
  res.json(scanTests());
});

// Generate test using AI
app.post('/api/generate-test', async (req, res) => {
  const { siteAgentId, prompt, testName } = req.body;
  
  if (!siteAgentId || !prompt || !testName) {
    return res.status(400).json({ error: 'Site agent, prompt en test naam zijn verplicht' });
  }
  
  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === siteAgentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  try {
    // Build system prompt with site knowledge - INCLUSIEF credentials
    const credentialsInfo = agent.credentials 
      ? `\n- Login credentials: gebruikersnaam="${agent.credentials.username}", wachtwoord="${agent.credentials.password}"`
      : '\n- Geen login credentials opgeslagen';
    
    const systemPrompt = `Je bent een Playwright test automation expert. 
Gebruik de volgende site kennis om een test te schrijven:
- Site naam: ${agent.name}
- Base URL: ${agent.baseUrl}
- Beschrijving: ${agent.description || 'Geen'}
- Bekende selectors: ${JSON.stringify(agent.selectors || {})}
- Pagina structuur: ${JSON.stringify(agent.navigation || [])}
- Formulieren: ${JSON.stringify(agent.forms || [])}${credentialsInfo}

BELANGRIJK: Als er login credentials zijn opgeslagen, gebruik deze ALTIJD in de test:
- Vul de gebruikersnaam in met: await page.fill('#P9999_USERNAME', '${agent.credentials?.username || 'jouw_gebruikersnaam'}');
- Vul het wachtwoord in met: await page.fill('#P9999_PASSWORD', '${agent.credentials?.password || 'jouw_wachtwoord'}');
- Klik daarna op de submit button

Schrijf een complete Playwright test in JavaScript die:
1. Gebruik maakt van @playwright/test
2. De gevraagde functionaliteit test
3. Robuuste selectors gebruikt (data-testid voorkeur, dan text, dan CSS)
4. Wacht op netwerk idle waar nodig
5. Screenshots maakt bij belangrijke stappen
6. Duidelijke comments heeft in het Nederlands
7. Een timeout van 120000ms (2 minuten) gebruikt voor langzame sites

Geef ALLEEN de code terug, geen markdown formatting, geen uitleg.`;

    // Call AI API
    const generatedCode = await callAiApi(prompt, systemPrompt);
    
    // Clean up the code (remove markdown code blocks if present)
    let cleanCode = generatedCode
      .replace(/```javascript\n?/g, '')
      .replace(/```js\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Validate it's actually Playwright code
    if (!cleanCode.includes('require(\'@playwright/test\')') && !cleanCode.includes('import')) {
      // Try to wrap it in a proper test structure
      cleanCode = `const { test, expect } = require('@playwright/test');

${cleanCode}`;
    }
    
    // Save the test
    const fileName = `${testName}.spec.js`;
    const filePath = path.join('tests', fileName);
    
    fs.writeFileSync(filePath, cleanCode);
    
    res.json({
      success: true,
      message: `Test "${testName}" gegenereerd`,
      file: fileName,
      code: cleanCode
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Fout bij genereren: ${error.message}`
    });
  }
});

// Generate test AND run it immediately with live console output
app.post('/api/generate-and-run-test', async (req, res) => {
  const { siteAgentId, prompt, testName } = req.body;
  
  if (!siteAgentId || !prompt || !testName) {
    return res.status(400).json({ error: 'Site agent, prompt en test naam zijn verplicht' });
  }
  
  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === siteAgentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  try {
    // Build system prompt with site knowledge - INCLUSIEF credentials
    const credentialsInfo = agent.credentials 
      ? `\n- Login credentials: gebruikersnaam="${agent.credentials.username}", wachtwoord="${agent.credentials.password}"`
      : '\n- Geen login credentials opgeslagen';
    
    const systemPrompt = `Je bent een Playwright test automation expert. 
Gebruik de volgende site kennis om een test te schrijven:
- Site naam: ${agent.name}
- Base URL: ${agent.baseUrl}
- Beschrijving: ${agent.description || 'Geen'}
- Bekende selectors: ${JSON.stringify(agent.selectors || {})}
- Pagina structuur: ${JSON.stringify(agent.navigation || [])}
- Formulieren: ${JSON.stringify(agent.forms || [])}${credentialsInfo}

BELANGRIJK: Als er login credentials zijn opgeslagen, gebruik deze ALTIJD in de test.
Je MOET de credentials HARD-CODED in de test plaatsen, GEEN omgevingsvariabelen gebruiken.

Gebruik EXACT deze code (vervang niets, gebruik de exacte waarden):
- await page.fill('#P9999_USERNAME', '${agent.credentials?.username || 'jouw_gebruikersnaam'}');
- await page.fill('#P9999_PASSWORD', '${agent.credentials?.password || 'jouw_wachtwoord'}');
- await page.click('#wwvFlowForm button[type="submit"]');

Dit is ABSOLUUT VERPLICHT. Gebruik NOOIT process.env of omgevingsvariabelen.

Schrijf een complete Playwright test in JavaScript die:
1. Gebruik maakt van @playwright/test
2. De gevraagde functionaliteit test
3. Robuuste selectors gebruikt (data-testid voorkeur, dan text, dan CSS)
4. Wacht op netwerk idle waar nodig
5. Screenshots maakt bij belangrijke stappen
6. Duidelijke comments heeft in het Nederlands
7. Een timeout van 120000ms (2 minuten) gebruikt voor langzame sites

Geef ALLEEN de code terug, geen markdown formatting, geen uitleg.`;

    // Call AI API
    const generatedCode = await callAiApi(prompt, systemPrompt);
    
    // Clean up the code (remove markdown code blocks if present)
    let cleanCode = generatedCode
      .replace(/```javascript\n?/g, '')
      .replace(/```js\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // FORCEER echte credentials in de gegenereerde code
    if (agent.credentials && agent.credentials.username) {
      // Vervang alle varianten van placeholder gebruikersnaam
      cleanCode = cleanCode.replace(
        /await page\.fill\(['"]#P9999_USERNAME['"],\s*['"].*?['"]\)/g,
        `await page.fill('#P9999_USERNAME', '${agent.credentials.username}')`
      );
      cleanCode = cleanCode.replace(
        /await page\.fill\(['"]#P9999_USERNAME['"],\s*process\.env\.\w+\s*\|\|\s*['"].*?['"]\)/g,
        `await page.fill('#P9999_USERNAME', '${agent.credentials.username}')`
      );
      // Vervang placeholder tekst in strings
      cleanCode = cleanCode.replace(/jouw_gebruikersnaam/g, agent.credentials.username);
    }
    
    if (agent.credentials && agent.credentials.password) {
      // Vervang alle varianten van placeholder wachtwoord
      cleanCode = cleanCode.replace(
        /await page\.fill\(['"]#P9999_PASSWORD['"],\s*['"].*?['"]\)/g,
        `await page.fill('#P9999_PASSWORD', '${agent.credentials.password}')`
      );
      cleanCode = cleanCode.replace(
        /await page\.fill\(['"]#P9999_PASSWORD['"],\s*process\.env\.\w+\s*\|\|\s*['"].*?['"]\)/g,
        `await page.fill('#P9999_PASSWORD', '${agent.credentials.password}')`
      );
      // Vervang placeholder tekst in strings
      cleanCode = cleanCode.replace(/jouw_wachtwoord/g, agent.credentials.password);
    }
    
    // Validate it's actually Playwright code
    if (!cleanCode.includes('require(\'@playwright/test\')') && !cleanCode.includes('import')) {
      cleanCode = `const { test, expect } = require('@playwright/test');\n\n${cleanCode}`;
    }
    
    // Save the test
    const fileName = `${testName}.spec.js`;
    const filePath = path.join('tests', fileName);
    fs.writeFileSync(filePath, cleanCode);
    
    // Start the test execution with live output via Socket.IO
    const testPathForward = 'tests/' + fileName;
    const command = `npx playwright test "${testPathForward}" --headed --project=chromium`;
    
    const { spawn } = require('child_process');
    const testProcess = spawn('npx', ['playwright', 'test', testPathForward, '--headed', '--project=chromium'], {
      cwd: __dirname,
      shell: true
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      io.emit('test-output', { testFile: fileName, chunk, output });
    });
    
    testProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      io.emit('test-output', { testFile: fileName, chunk, output, isError: true });
    });
    
    testProcess.on('close', (code) => {
      const success = code === 0;
      io.emit('test-completed', { testFile: fileName, success, output });
    });
    
    res.json({
      success: true,
      message: `Test "${testName}" gegenereerd en gestart`,
      file: fileName,
      code: cleanCode,
      running: true
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Fout bij genereren of uitvoeren: ${error.message}`
    });
  }
});

// Chat with AI about a site
app.post('/api/chat', async (req, res) => {
  const { siteAgentId, message, history } = req.body;
  
  if (!siteAgentId || !message) {
    return res.status(400).json({ error: 'Site agent en bericht zijn verplicht' });
  }
  
  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === siteAgentId);
  
  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }
  
  try {
    const systemPrompt = `Je bent een Playwright test automation assistant voor de site "${agent.name}" (${agent.baseUrl}).

BELANGRIJK: Je kunt WEL tests uitvoeren! Als de gebruiker vraagt om een test te draaien, genereren of uitvoeren, zeg dan dat je dat gaat doen via het dashboard.

Site kennis:
- Bekende pagina's: ${JSON.stringify(agent.navigation || [])}
- Bekende selectors: ${JSON.stringify(agent.selectors || {})}
- Formulieren: ${JSON.stringify(agent.forms || [])}
- Login credentials: ${agent.credentials ? `gebruikersnaam="${agent.credentials.username}", wachtwoord="${agent.credentials.password}"` : 'niet opgeslagen'}
- Laatst geanalyseerd: ${agent.learnedAt || 'Nog niet'}

Je kunt:
1. Tests GENEREREN en DIRECT UITVOEREN in een browser
2. Vragen beantwoorden over de site structuur
3. Test strategieën adviseren
4. Playwright code snippets geven
5. Uitleggen hoe bepaalde flows werken

Als de gebruiker vraagt om een test:
- Zeg dat je de test gaat genereren en uitvoeren
- Geef een korte beschrijving van wat je gaat testen
- Gebruik de site kennis voor robuuste selectors

Antwoord in het Nederlands. Wees beknopt maar nuttig.`;

    // Build conversation context
    let fullPrompt = message;
    if (history && history.length > 0) {
      const context = history.map(h => `${h.role}: ${h.content}`).join('\n');
      fullPrompt = `Eerdere conversatie:\n${context}\n\nNieuwe vraag: ${message}`;
    }
    
    const response = await callAiApi(fullPrompt, systemPrompt);
    
    res.json({
      success: true,
      response: response.trim()
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Fout bij chat: ${error.message}`
    });
  }
});

// Analyze test failure and suggest fix
app.post('/api/analyze-test-failure', async (req, res) => {
  const { testFile, siteAgentId } = req.body;
  
  if (!testFile) {
    return res.status(400).json({ error: 'Testbestand is verplicht' });
  }
  
  try {
    // Lees de test code
    const testPath = path.join('tests', testFile);
    if (!fs.existsSync(testPath)) {
      return res.status(404).json({ error: 'Testbestand niet gevonden' });
    }
    const testCode = fs.readFileSync(testPath, 'utf8');
    
    // Zoek test resultaten
    const testName = testFile.replace('.spec.js', '');
    const resultsDir = path.join(__dirname, 'test-results');
    let errorContext = '';
    let screenshotPath = '';
    let videoPath = '';
    let testOutput = '';
    
    // Zoek naar resultaten directories
    if (fs.existsSync(resultsDir)) {
      const resultDirs = fs.readdirSync(resultsDir).filter(dir => 
        dir.includes(testName) && fs.statSync(path.join(resultsDir, dir)).isDirectory()
      );
      
      for (const dir of resultDirs) {
        const dirPath = path.join(resultsDir, dir);
        
        // Lees error context
        const errorContextPath = path.join(dirPath, 'error-context.md');
        if (fs.existsSync(errorContextPath)) {
          errorContext += `\n--- ${dir} ---\n` + fs.readFileSync(errorContextPath, 'utf8');
        }
        
        // Zoek screenshot
        const screenshots = fs.readdirSync(dirPath).filter(f => f.endsWith('.png'));
        if (screenshots.length > 0) {
          screenshotPath = `/test-results/${dir}/${screenshots[0]}`;
        }
        
        // Zoek video
        const videoFile = path.join(dirPath, 'video.webm');
        if (fs.existsSync(videoFile)) {
          videoPath = `/test-results/${dir}/video.webm`;
        }
      }
    }
    
    // Lees laatste test output uit .last-run.json
    const lastRunPath = path.join(resultsDir, '.last-run.json');
    if (fs.existsSync(lastRunPath)) {
      try {
        const lastRun = JSON.parse(fs.readFileSync(lastRunPath, 'utf8'));
        testOutput = JSON.stringify(lastRun, null, 2);
      } catch (e) {
        // ignore
      }
    }
    
    // Bouw prompt voor AI
    let siteContext = '';
    if (siteAgentId) {
      const agents = loadSiteAgents();
      const agent = agents.find(a => a.id === siteAgentId);
      if (agent) {
        siteContext = `
Site context:
- Site: ${agent.name} (${agent.baseUrl})
- Selectors: ${JSON.stringify(agent.selectors || {})}
- Forms: ${JSON.stringify(agent.forms || [])}
`;
      }
    }
    
    const analysisPrompt = `Analyseer deze Playwright test fout en geef een FIX.

TEST CODE:
\`\`\`javascript
${testCode}
\`\`\`

FOUTMELDING / ERROR CONTEXT:
\`\`\`
${errorContext || 'Geen error context gevonden'}
\`\`\`

TEST OUTPUT:
\`\`\`
${testOutput}
\`\`\`
${siteContext}

INSTRUCTIES:
1. Analyseer WAAROM de test faalt
2. Geef de VOLLEDIGE GECORRIGEERDE test code terug
3. Leg kort uit wat je hebt aangepast
4. Gebruik robuuste selectors (getByRole, getByText, etc.)
5. Voeg waar nodig waitForLoadState of waitForTimeout toe
6. Zorg dat de test echt werkt, geen placeholders

Geef ALLEEN de volledige code terug, voorafgegaan door een korte uitleg.`;

    const systemPrompt = `Je bent een Playwright test debugging expert. Je analyseert fouten en geeft werkende fixes. Antwoord in het Nederlands.`;
    
    const aiResponse = await callAiApi(analysisPrompt, systemPrompt);
    
    // Parse de response - zoek code blok
    let fixedCode = aiResponse;
    let explanation = '';
    
    // Probeer uitleg en code te scheiden
    const codeBlockMatch = aiResponse.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      fixedCode = codeBlockMatch[1].trim();
      explanation = aiResponse.replace(/```(?:javascript|js)?\n?[\s\S]*?```/, '').trim();
    }
    
    // Valideer dat het Playwright code is
    if (!fixedCode.includes('require(\'@playwright/test\')') && !fixedCode.includes('import')) {
      fixedCode = `const { test, expect } = require('@playwright/test');\n\n${fixedCode}`;
    }
    
    res.json({
      success: true,
      explanation: explanation || aiResponse.substring(0, 500),
      fixedCode: fixedCode,
      originalFile: testFile,
      errorContext: errorContext,
      screenshotPath: screenshotPath,
      videoPath: videoPath
    });
    
  } catch (error) {
    res.status(500).json({
      error: `Fout bij analyse: ${error.message}`
    });
  }
});

// Apply AI fix to test
app.post('/api/apply-fix', (req, res) => {
  const { testFile, fixedCode } = req.body;
  
  if (!testFile || !fixedCode) {
    return res.status(400).json({ error: 'Testbestand en fixed code zijn verplicht' });
  }
  
  try {
    const testPath = path.join('tests', testFile);
    fs.writeFileSync(testPath, fixedCode);
    
    res.json({
      success: true,
      message: `Test ${testFile} is bijgewerkt met de AI fix`
    });
  } catch (error) {
    res.status(500).json({
      error: `Fout bij opslaan fix: ${error.message}`
    });
  }
});

// Serve config screenshots
app.use('/config', express.static(path.join(__dirname, 'config')));

// === MCP CLIENT INTEGRATION (met @playwright/mcp via SDK SSE transport) ===
const { spawn } = require('child_process');

let mcpServerProcess = null;
const MCP_PORT = 8931;
let mcpClient = null;

// Start de officiële @playwright/mcp server met codegen=typescript
async function startMcpServer() {
  if (mcpServerProcess) return;

  mcpServerProcess = spawn('npx', ['@playwright/mcp', '--port', String(MCP_PORT), '--headless', '--codegen=typescript'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  mcpServerProcess.stdout.on('data', (data) => {
    console.log('[MCP]', data.toString().trim());
  });

  mcpServerProcess.stderr.on('data', (data) => {
    console.error('[MCP stderr]', data.toString().trim());
  });

  mcpServerProcess.on('close', (code) => {
    console.log(`[MCP Server] Proces afgesloten met code ${code}`);
    mcpServerProcess = null;
    mcpClient = null;
  });

  // Wacht tot de server draait
  await new Promise(r => setTimeout(r, 3000));
  
  // Initialiseer MCP client met SDK
  await initMcpClient();
}

// Initialiseer MCP client met SDK SSE transport
async function initMcpClient() {
  try {
    const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
    const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
    
    const transport = new SSEClientTransport(new URL(`http://localhost:${MCP_PORT}/sse`));
    mcpClient = new Client({ name: 'playwright-dashboard', version: '1.0.0' });
    
    await mcpClient.connect(transport);
    console.log('[MCP] Client verbonden via SSE');
    
    // Haal tools op
    const toolsResult = await mcpClient.listTools();
    console.log(`[MCP] ${toolsResult.tools?.length || 0} tools geladen`);
    
  } catch (error) {
    console.error('[MCP] Fout bij initialiseren client:', error.message);
    mcpClient = null;
  }
}

// Helper om MCP tools op te halen
async function getMcpTools() {
  await startMcpServer();
  
  if (!mcpClient) {
    throw new Error('MCP client niet geïnitialiseerd');
  }
  
  const toolsResult = await mcpClient.listTools();
  return toolsResult.tools || [];
}

// Session-buffers voor gegenereerde code (per socket)
const sessionCodeBuffers = new Map(); // socketId -> { snippets: [], agentContext: [] }

function getSessionBuffer(socketId) {
  if (!sessionCodeBuffers.has(socketId)) {
    sessionCodeBuffers.set(socketId, { snippets: [], agentContext: [] });
  }
  return sessionCodeBuffers.get(socketId);
}

function clearSessionBuffer(socketId) {
  sessionCodeBuffers.set(socketId, { snippets: [], agentContext: [] });
}

// Helper om gegenereerde code uit MCP response te extraheren
function extractGeneratedCode(result, toolName = '', args = {}) {
  // PRIORITEIT 1: Probeer parseResponse uit @playwright/mcp
  try {
    const { parseResponse } = require('@playwright/mcp');
    const parsed = parseResponse(result);
    if (parsed && parsed.code) {
      return parsed.code;
    }
  } catch (e) {
    // parseResponse niet beschikbaar of faalt — ga door met fallbacks
  }
  
  // PRIORITEIT 2: Zoek "### Ran Playwright code" blok in de response text
  const text = result?.content?.[0]?.text || '';
  const codeMatch = text.match(/### Ran Playwright code\n```(?:javascript|js|typescript|ts)?\n?([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  
  // PRIORITEIT 3: Zoek naar await page. statements in de text
  const lines = text.split('\n');
  const codeLines = lines.filter(line => 
    line.trim().startsWith('await page.') || 
    line.trim().startsWith('await expect(') ||
    (line.trim().startsWith('const ') && line.includes('page'))
  );
  
  if (codeLines.length > 0) {
    return codeLines.join('\n');
  }
  
  // PRIORITEIT 4: Genereer code uit tool args (pragmatische fallback)
  // Dit werkt altijd, onafhankelijk van MCP codegen output
  const generatedCodeFromArgs = generateCodeFromToolArgs(toolName, args);
  if (generatedCodeFromArgs) {
    return generatedCodeFromArgs;
  }
  
  return null;
}

// Genereer Playwright code uit tool naam en args
function generateCodeFromToolArgs(toolName, args) {
  switch (toolName) {
    case 'browser_navigate':
      return args.url ? `await page.goto('${args.url}');` : null;
    
    case 'browser_click':
      if (args.element) {
        // Detecteer locator type
        const el = args.element;
        if (el.startsWith('text=')) return `await page.getByText('${el.slice(5)}').click();`;
        if (el.startsWith('role=')) return `await page.getByRole('${el.slice(5)}').click();`;
        if (el.startsWith('label=')) return `await page.getByLabel('${el.slice(6)}').click();`;
        if (el.startsWith('placeholder=')) return `await page.getByPlaceholder('${el.slice(12)}').click();`;
        if (el.startsWith('testid=')) return `await page.getByTestId('${el.slice(7)}').click();`;
        if (el.startsWith('#')) return `await page.locator('${el}').click();`;
        return `await page.locator('${el}').click();`;
      }
      if (args.selector) return `await page.locator('${args.selector}').click();`;
      if (args.x !== undefined && args.y !== undefined) return `await page.mouse.click(${args.x}, ${args.y});`;
      return null;
    
    case 'browser_type':
    case 'browser_fill_form':
      if (args.element && args.text !== undefined) {
        const el = args.element;
        if (el.startsWith('text=')) return `await page.getByText('${el.slice(5)}').fill('${args.text}');`;
        if (el.startsWith('label=')) return `await page.getByLabel('${el.slice(6)}').fill('${args.text}');`;
        if (el.startsWith('placeholder=')) return `await page.getByPlaceholder('${el.slice(12)}').fill('${args.text}');`;
        return `await page.locator('${el}').fill('${args.text}');`;
      }
      return null;
    
    case 'browser_select_option':
      if (args.element && args.value) {
        return `await page.locator('${args.element}').selectOption('${args.value}');`;
      }
      return null;
    
    case 'browser_press_key':
      if (args.key) {
        return `await page.keyboard.press('${args.key}');`;
      }
      return null;
    
    case 'browser_take_screenshot':
      if (args.path) {
        return `await page.screenshot({ path: '${args.path}'${args.fullPage ? ', fullPage: true' : ''} });`;
      }
      return `await page.screenshot();`;
    
    case 'browser_wait_for':
      if (args.element) {
        return `await page.waitForSelector('${args.element}');`;
      }
      if (args.timeout) {
        return `await page.waitForTimeout(${args.timeout});`;
      }
      return null;
    
    case 'browser_evaluate':
      if (args.script) {
        const scriptShort = args.script.replace(/'/g, "\\'").substring(0, 50);
        return `await page.evaluate(() => { /* ${scriptShort}... */ });`;
      }
      return null;
    
    case 'browser_handle_dialog':
      if (args.accept === false) {
        return `page.on('dialog', dialog => dialog.dismiss());`;
      }
      return `page.on('dialog', dialog => dialog.accept());`;
    
    case 'browser_resize':
      if (args.width && args.height) {
        return `await page.setViewportSize({ width: ${args.width}, height: ${args.height} });`;
      }
      return null;
    
    case 'browser_console_messages':
      return `const messages = await page.evaluate(() => console.log('check'));`;
    
    case 'browser_snapshot':
      return `// Accessibility snapshot opgevraagd`;
    
    case 'browser_tabs':
      return `const tabs = await page.context().pages();`;
    
    case 'browser_navigate_back':
      return `await page.goBack();`;
    
    case 'browser_hover':
      if (args.element) {
        return `await page.locator('${args.element}').hover();`;
      }
      return null;
    
    case 'browser_drag':
    case 'browser_drop':
      if (args.source && args.target) {
        return `await page.locator('${args.source}').dragTo(page.locator('${args.target}'));`;
      }
      return null;
    
    case 'browser_file_upload':
      if (args.element && args.files) {
        return `await page.locator('${args.element}').setInputFiles('${args.files}');`;
      }
      return null;
    
    default:
      return null;
  }
}

// Helper om een MCP tool aan te roepen
async function callMcpTool(name, args, socketId = null) {
  await startMcpServer();
  
  if (!mcpClient) {
    throw new Error('MCP client niet geïnitialiseerd');
  }
  
  const startTime = Date.now();
  
  const result = await mcpClient.callTool({ name, arguments: args });
  
  const duration = Date.now() - startTime;
  
  // Extraheer gegenereerde code
  const generatedCode = extractGeneratedCode(result, name, args);
  
  // Als er code is, sla op in session buffer en emit naar frontend
  if (generatedCode && socketId) {
    const buffer = getSessionBuffer(socketId);
    const snippet = {
      tool: name,
      code: generatedCode,
      timestamp: Date.now(),
      source: 'agent'
    };
    buffer.snippets.push(snippet);
    
    // Emit naar frontend voor live Test Editor update
    io.to(socketId).emit('mcp-codegen-code', {
      tool: name,
      code: generatedCode,
      source: 'agent'
    });
  }
  
  // Emit naar alle Socket.IO clients (voor MCP console log)
  io.emit('mcp-tool-call', {
    tool: name,
    args,
    result: result?.content?.[0]?.text || JSON.stringify(result),
    duration
  });
  
  return result;
}

// MCP API Routes
app.get('/api/mcp/tools', async (req, res) => {
  try {
    const tools = await getMcpTools();
    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/mcp/call', async (req, res) => {
  const { tool, args } = req.body;
  if (!tool) {
    return res.status(400).json({ error: 'Tool naam is verplicht' });
  }

  try {
    const result = await callMcpTool(tool, args || {});
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// === MCP-AI CHAT ENDPOINT ===
// Deze endpoint gebruikt MCP tools voor de AI agent interactie
app.post('/api/mcp-chat', async (req, res) => {
  const { siteAgentId, message, history, mode = 'auto', socketId } = req.body;

  if (!siteAgentId || !message) {
    return res.status(400).json({ error: 'Site agent en bericht zijn verplicht' });
  }

  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === siteAgentId);

  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }

  try {
    // Haal tools op
    const tools = await getMcpTools();
    const toolsList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');

    // Bepaal of de gebruiker "klaar" zegt om de test te finaliseren
    const isFinalizeRequest = message.toLowerCase().trim() === 'klaar' ||
                              message.toLowerCase().includes('test opslaan') ||
                              message.toLowerCase().includes('finalize');

    if (isFinalizeRequest) {
      // Finaliseer de test uit de buffer
      const buffer = socketId ? getSessionBuffer(socketId) : { snippets: [] };
      
      if (buffer.snippets.length === 0) {
        return res.json({
          success: true,
          response: 'Er is nog geen code gegenereerd. Start eerst een test generatie!'
        });
      }
      
      // Bouw complete test
      const codeLines = buffer.snippets.map(s => s.code);
      const uniqueLines = [...new Set(codeLines)]; // Verwijder duplicaten
      
      const testBody = uniqueLines.join('\n  ');
      const testName = agent.name.replace(/[^a-zA-Z0-9]/g, '-') + '-test';
      
      const finalCode = `const { test, expect } = require('@playwright/test');

test('${testName}', async ({ page }) => {
  ${testBody}
});`;
      
      // Clear buffer
      if (socketId) clearSessionBuffer(socketId);
      
      res.json({
        success: true,
        response: '✅ Test gefinaliseerd! De complete test staat in de Test Editor. Klik op **💾 Opslaan** om op te slaan.',
        generatedCode: finalCode,
        toolCalls: []
      });
      return;
    }

    // Bepaal of de gebruiker een test wil genereren
    const isTestRequest = message.toLowerCase().includes('test') || 
                          message.toLowerCase().includes('codegen') ||
                          message.toLowerCase().includes('genereer') ||
                          message.toLowerCase().includes('maak') ||
                          message.toLowerCase().includes('schrijf');

    if (isTestRequest) {
      // MODE: Test generatie via MCP + AI
      
      // Clear buffer voor nieuwe test
      if (socketId) clearSessionBuffer(socketId);
      
      // STAP 1: Navigeer naar de site
      const navigateResult = await callMcpTool('browser_navigate', { url: agent.baseUrl }, socketId);
      
      // STAP 2: Maak screenshot voor context
      const screenshotResult = await callMcpTool('browser_take_screenshot', {}, socketId);
      
      // STAP 3: Haal pagina structuur op
      const snapshotResult = await callMcpTool('browser_snapshot', {}, socketId);
      
      // STAP 4: Genereer test code met AI
      const credentialsInfo = agent.credentials 
        ? `\n- Login credentials: gebruikersnaam="${agent.credentials.username}", wachtwoord="${agent.credentials.password}"`
        : '\n- Geen login credentials opgeslagen';
      
      const testPrompt = `Je bent een Playwright test automation expert.

Genereer een complete Playwright test op basis van deze opdracht:
"${message}"

Site informatie:
- Site naam: ${agent.name}
- Base URL: ${agent.baseUrl}
- Pagina structuur (accessibility tree): ${snapshotResult?.content?.[0]?.text?.substring(0, 2000) || 'Niet beschikbaar'}
- Bekende selectors: ${JSON.stringify(agent.selectors || {})}
- Formulieren: ${JSON.stringify(agent.forms || [])}${credentialsInfo}

BELANGRIJK: Als er login credentials zijn, gebruik deze ALTIJD:
- await page.fill('#P9999_USERNAME', '${agent.credentials?.username || 'jouw_gebruikersnaam'}');
- await page.fill('#P9999_PASSWORD', '${agent.credentials?.password || 'jouw_wachtwoord'}');
- await page.click('#wwvFlowForm button[type="submit"]');

Schrijf een complete Playwright test in JavaScript die:
1. Gebruik maakt van @playwright/test
2. De gevraagde functionaliteit test
3. Robuuste selectors gebruikt (getByRole, getByText voorkeur)
4. Wacht op netwerk idle waar nodig
5. Screenshots maakt bij belangrijke stappen
6. Duidelijke comments heeft in het Nederlands
7. Een timeout van 120000ms gebruikt

Geef ALLEEN de code terug, geen markdown formatting, geen uitleg.`;

      const generatedCode = await callAiApi(testPrompt, '', []);
      
      // Clean up de code
      let cleanCode = generatedCode
        .replace(/```javascript\n?/g, '')
        .replace(/```js\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // FORCEER echte credentials
      if (agent.credentials && agent.credentials.username) {
        cleanCode = cleanCode.replace(
          /await page\.fill\(['"]#P9999_USERNAME['"],\s*['"].*?['"]\)/g,
          `await page.fill('#P9999_USERNAME', '${agent.credentials.username}')`
        );
        cleanCode = cleanCode.replace(/jouw_gebruikersnaam/g, agent.credentials.username);
      }
      
      if (agent.credentials && agent.credentials.password) {
        cleanCode = cleanCode.replace(
          /await page\.fill\(['"]#P9999_PASSWORD['"],\s*['"].*?['"]\)/g,
          `await page.fill('#P9999_PASSWORD', '${agent.credentials.password}')`
        );
        cleanCode = cleanCode.replace(/jouw_wachtwoord/g, agent.credentials.password);
      }
      
      // Valideer dat het Playwright code is
      if (!cleanCode.includes('require(\'@playwright/test\')') && !cleanCode.includes('import')) {
        cleanCode = `const { test, expect } = require('@playwright/test');\n\n${cleanCode}`;
      }
      
      res.json({
        success: true,
        response: 'Ik heb een test gegenereerd op basis van de site! Je kunt deze nu bekijken in de Test Editor.',
        generatedCode: cleanCode,
        toolCalls: [
          { tool: 'browser_navigate', args: { url: agent.baseUrl }, result: navigateResult?.content?.[0]?.text, success: true },
          { tool: 'browser_take_screenshot', args: {}, result: screenshotResult?.content?.[0]?.text, success: true },
          { tool: 'browser_snapshot', args: {}, result: snapshotResult?.content?.[0]?.text?.substring(0, 500), success: true }
        ]
      });
      
    } else {
      // MODE: Normale MCP interactie (navigeren, klikken, screenshots)
      
      // Haal huidige buffer op voor context
      const buffer = socketId ? getSessionBuffer(socketId) : { snippets: [] };
      const bufferContext = buffer.snippets.length > 0 
        ? `\n\nHuidige gegenereerde code:\n${buffer.snippets.map(s => `// [${s.source}] ${s.tool}\n${s.code}`).join('\n')}`
        : '';
      
      // STAP 1: Vraag het model om een plan te maken
      const planPrompt = `Je bent een Playwright test automation planner.

Gebruiker vraagt: "${message}"

Beschikbare tools:
${toolsList}${bufferContext}

Maak een JSON plan met stappen. Elke stap heeft een "tool" en "args".
Voorbeeld:
[
  {"tool": "browser_navigate", "args": {"url": "https://example.com"}},
  {"tool": "browser_take_screenshot", "args": {}}
]

Geef ALLEEN de JSON array terug, geen uitleg.`;

      const planResponse = await callAiApi(planPrompt, '', []);
      
      // Parse het plan
      let plan = [];
      try {
        const jsonMatch = planResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('Fout bij parsen plan:', e);
      }

      // STAP 2: Voer de stappen uit
      const toolResults = [];
      
      for (const step of plan) {
        if (!step.tool) continue;
        
        try {
          const result = await callMcpTool(step.tool, step.args || {}, socketId);
          toolResults.push({
            tool: step.tool,
            args: step.args,
            result: result?.content?.[0]?.text || JSON.stringify(result),
            success: true
          });
        } catch (error) {
          toolResults.push({
            tool: step.tool,
            args: step.args,
            error: error.message,
            success: false
          });
        }
      }

      // STAP 3: Vraag het model om een samenvatting
      const resultsSummary = toolResults.map(tr => {
        if (tr.success) {
          return `Tool ${tr.tool} uitgevoerd. Resultaat: ${tr.result?.substring(0, 500)}...`;
        } else {
          return `Tool ${tr.tool} mislukt: ${tr.error}`;
        }
      }).join('\n');

      const summaryPrompt = `Je hebt deze acties uitgevoerd voor de gebruiker:

${resultsSummary}

Geef een korte, vriendelijke samenvatting in het Nederlands van wat je hebt gedaan.`;

      const summaryResponse = await callAiApi(summaryPrompt, '', []);

      res.json({
        success: true,
        response: summaryResponse,
        toolCalls: toolResults
      });
    }

  } catch (error) {
    res.status(500).json({
      error: `Fout bij MCP chat: ${error.message}`
    });
  }
});

// === HANDMATIGE MCP ACTIE ENDPOINT ===
// Gebruiker typt een actie in natuurlijke taal, AI vertaalt naar MCP tool call
app.post('/api/manual-mcp-action', async (req, res) => {
  const { siteAgentId, action, socketId } = req.body;

  if (!siteAgentId || !action) {
    return res.status(400).json({ error: 'Site agent en actie zijn verplicht' });
  }

  const agents = loadSiteAgents();
  const agent = agents.find(a => a.id === siteAgentId);

  if (!agent) {
    return res.status(404).json({ error: 'Site agent niet gevonden' });
  }

  try {
    // Haal huidige pagina snapshot op voor context
    let snapshotText = '';
    try {
      const snapshotResult = await callMcpTool('browser_snapshot', {}, socketId);
      snapshotText = snapshotResult?.content?.[0]?.text?.substring(0, 1500) || '';
    } catch (e) {
      // Geen actieve browser sessie, navigeer eerst
      await callMcpTool('browser_navigate', { url: agent.baseUrl }, socketId);
      const snapshotResult = await callMcpTool('browser_snapshot', {}, socketId);
      snapshotText = snapshotResult?.content?.[0]?.text?.substring(0, 1500) || '';
    }

    // Vraag AI om actie te vertalen naar MCP tool call
    const translatePrompt = `Je bent een Playwright MCP tool vertaler.

De gebruiker typte deze handmatige actie:
"${action}"

Huidige pagina structuur:
${snapshotText}

Vertaal deze actie naar EEN enkele MCP tool call in JSON formaat:
{"tool": "browser_...", "args": {...}}

Beschikbare tools:
- browser_navigate: { url }
- browser_click: { element: "text=..." of "selector" }
- browser_type: { element: "...", text: "..." }
- browser_fill_form: { fields: [{name, value}] }
- browser_take_screenshot: {}
- browser_snapshot: {}
- browser_wait_for: { element: "..." }
- browser_press_key: { key: "Enter" }

Geef ALLEEN de JSON terug, geen uitleg.`;

    const translateResponse = await callAiApi(translatePrompt, '', []);
    
    // Parse de tool call
    let toolCall = null;
    try {
      const jsonMatch = translateResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        toolCall = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Fout bij parsen tool call:', e);
    }

    if (!toolCall || !toolCall.tool) {
      return res.status(400).json({ 
        error: 'Kon actie niet vertalen naar MCP tool call',
        rawResponse: translateResponse 
      });
    }

    // Voer de tool call uit
    const result = await callMcpTool(toolCall.tool, toolCall.args || {}, socketId);
    
    // Extraheer gegenereerde code
    const generatedCode = extractGeneratedCode(result);
    
    res.json({
      success: true,
      tool: toolCall.tool,
      args: toolCall.args,
      code: generatedCode,
      result: result?.content?.[0]?.text || JSON.stringify(result)
    });

  } catch (error) {
    res.status(500).json({
      error: `Fout bij handmatige actie: ${error.message}`
    });
  }
});

// Socket.IO voor real-time updates
io.on('connection', (socket) => {
  console.log('Client verbonden:', socket.id);
  
  // Sla socket ID op in request object voor MCP chat
  socket.on('register-session', () => {
    console.log('Session geregistreerd voor socket:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Client verbroken:', socket.id);
    // Clean up session buffer
    sessionCodeBuffers.delete(socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🎭 Playwright Dashboard`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`📁 Project: ${__dirname}`);
});
