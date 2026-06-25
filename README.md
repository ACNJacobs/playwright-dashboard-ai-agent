# 🎭 Playwright Dashboard with AI Agent

A comprehensive Playwright test management dashboard with an integrated AI Agent powered by MCP (Model Context Protocol) for automated browser testing and code generation.

## ✨ Features

- **🤖 AI Agent** — Chat with an AI that can browse websites, take screenshots, and generate Playwright test code in real-time
- **🎬 Codegen Mode** — All browser actions automatically generate TypeScript/JavaScript Playwright code
- **📝 Live Test Editor** — See generated code appear live as the AI agent navigates websites
- **🏢 Site Agents** — Configure multiple websites with custom credentials and test scenarios
- **🧪 Test Management** — Create, run, edit, and delete Playwright tests from the dashboard
- **📸 Screenshots & Videos** — Automatic capture and gallery viewing
- **⏰ Scheduled Tests** — Run tests on a schedule
- **📊 Reports** — HTML test reports generated automatically

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- [Playwright](https://playwright.dev/) installed globally or locally
- (Optional) [Ollama](https://ollama.com/) for local AI — or any OpenAI/Azure/Claude API key

### Installation

```bash
# Clone the repository
git clone https://github.com/ACNJacobs/playwright-dashboard-ai-agent.git
cd playwright-dashboard-ai-agent

# Install dependencies
npm install

# Install Playwright browsers (if not already installed)
npx playwright install
```

### Configuration

#### Option 1: Ollama (Local AI — Free, No API Key)

1. Install [Ollama](https://ollama.com/)
2. Pull a code model:
   ```bash
   ollama pull qwen2.5-coder:latest
   ```
3. Start Ollama (runs on http://localhost:11434 by default)
4. Open the dashboard → AI Agent tab → select **Ollama (Lokaal)**
5. Set model to `qwen2.5-coder:latest` and endpoint to `http://localhost:11434`
6. Click **💾 Opslaan** then **🔌 Test**

#### Option 2: OpenAI

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Open the dashboard → AI Agent tab → select **OpenAI**
3. Paste your API key and choose a model (e.g., `gpt-4o`)
4. Click **💾 Opslaan** then **🔌 Test**

#### Option 3: Azure OpenAI

1. Get your Azure OpenAI endpoint and deployment name
2. Open the dashboard → AI Agent tab → select **Azure OpenAI**
3. Fill in endpoint, deployment name, and API key
4. Click **💾 Opslaan** then **🔌 Test**

### Running the Dashboard

```bash
node server.js
```

Open http://localhost:3002 in your browser.

## 🖥️ Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **🧪 Tests** | View and manage all Playwright test files |
| **🎬 Video's** | Watch recorded test execution videos |
| **📸 Screenshots** | Browse captured screenshots |
| **➕ Nieuwe Test** | Create a new test from scratch |
| **🎥 Codegen** | Launch Playwright Codegen for manual recording |
| **⏰ Gepland** | Schedule tests to run automatically |
| **🤖 AI Agent** | Chat with AI, generate tests automatically |

## 🤖 Using the AI Agent

1. **Configure AI** — Go to AI Agent tab, set up your provider (see above)
2. **Add a Site** — Click "➕ Nieuwe Site" to add a website URL and optional credentials
3. **Start Chatting** — Describe what you want to test, e.g.:
   > "Bezoek https://www.wikipedia.org, zoek naar 'Playwright', en controleer of de zoekresultaten laden"
4. **Watch Code Generate** — The AI navigates the site via MCP and Playwright code appears live in the Test Editor
5. **Manual Actions** — Type specific actions like "klik op Inloggen" or "vul Username in met testuser" and click ▶️ Uitvoeren
6. **Save Test** — When done, click **✅ Klaar** to save the generated code as a `.spec.js` file

### AI Agent Layout

```
┌─────────────────┬──────────────────┬─────────────────┐
│  AI Config      │   Chat with AI   │  Test Editor    │
│  Site Agents    │   + Manual       │  (live code)    │
│  (collapsible)  │   Actions        │                 │
└─────────────────┴──────────────────┴─────────────────┘
```

- **Left panel** — Collapsible drawers for AI Configuration and Site Agents
- **Middle panel** — Chat interface + manual action input
- **Right panel** — Live Test Editor showing generated Playwright code

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox
- **Browser Automation**: Playwright, @playwright/mcp (MCP Server)
- **AI Integration**: OpenAI, Azure OpenAI, Claude, Grok, Ollama
- **Protocol**: Model Context Protocol (MCP) via SSE transport

## 📁 Project Structure

```
playwright-dashboard-ai-agent/
├── server.js              # Main Express server + MCP integration
├── public/
│   ├── index.html         # Dashboard UI
│   ├── app.js             # Frontend logic
│   ├── style.css          # Base styles
│   └── style-new.css      # AI Agent layout styles
├── config/
│   ├── api-config.json    # AI provider config (gitignored)
│   └── site-agents.json   # Site configurations
├── tests/                 # Playwright test files
├── screenshots/           # Captured screenshots
├── playwright-report/     # HTML test reports
└── package.json
```

## 🔒 Security Notes

- `config/api-config.json` is **gitignored** — never commit API keys
- Site agent credentials are stored locally in `config/site-agents.json`
- The dashboard runs locally on `localhost:3002` by default

## 📝 License

Copyright (c) 2026 Ton Jacobs. All rights reserved.

## 🤝 Contributing

This is a personal project. Feel free to fork and customize for your own Playwright workflows!

---

**Questions?** Open an issue on [GitHub](https://github.com/ACNJacobs/playwright-dashboard-ai-agent/issues)
