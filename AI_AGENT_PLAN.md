# AI Test Agent - Implementatie Plan

## Overzicht
Een AI-gedreven test agent die per website leert, testcases genereert en uitvoert via Playwright.

## Architectuur

### 1. API Configuratie Module
- **Bestand**: `config/api-config.json`
- **Doel**: Sla API keys en model instellingen op
- **Velden**: provider (openai/azure/claude), apiKey, model, endpoint (voor Azure)
- **UI**: Nieuwe "⚙️ Config" tab in dashboard

### 2. Site Agent Knowledge Base
- **Bestand**: `config/site-agents.json`
- **Doel**: Per site een "agent" die geleerd heeft over de site
- **Velden per agent**:
  - `siteId`: unieke identifier
  - `name`: beschrijvende naam
  - `baseUrl`: hoofd URL van de site
  - `credentials`: login gegevens (optioneel, encrypted)
  - `pages`: array van ontdekte pagina's
  - `selectors`: bekende selectors (login, formulieren, knoppen)
  - `flows`: bekende user flows (login → dashboard → etc.)
  - `learnedAt`: wanneer het leren plaatsvond
  - `isAuthenticated`: of de site login vereist

### 3. Site Crawler & Analyzer
- **Endpoint**: `POST /api/learn-site`
- **Proces**:
  1. Bezoek de site met Playwright (headless)
  2. Scrap de DOM structuur, formulieren, links
  3. Identificeer belangrijke elementen (login, navigatie, CTA's)
  4. Sla de kennis op in `site-agents.json`
  5. Genereer een samenvatting voor de gebruiker

### 4. Chat Interface
- **Tab**: "🤖 AI Agent" in dashboard
- **Features**:
  - Chat venster met berichten historie
  - Context: geselecteerde site agent
  - Mogelijkheden:
    - "Genereer een test voor de login flow"
    - "Wat weet je over deze site?"
    - "Voer een smoke test uit"
    - "Analyseer de homepage"

### 5. AI Test Generator
- **Endpoint**: `POST /api/generate-test`
- **Flow**:
  1. Gebruiker stelt vraag in chat
  2. Systeem bouwt prompt met:
     - Site kennis (selectors, flows)
     - Playwright best practices
     - Specifieke vraag van gebruiker
  3. Stuur prompt naar AI API
  4. Parse response → valideer of het geldige Playwright code is
  5. Sla op als `.spec.js` bestand
  6. Optioneel: voer direct uit

### 6. Prompt Engineering Strategy
**System Prompt voor Test Generatie**:
```
Je bent een Playwright test automation expert. 
Gebruik de volgende site kennis om een test te schrijven:
- Base URL: {baseUrl}
- Bekende selectors: {selectors}
- Pagina structuur: {pages}
- User flows: {flows}

Schrijf een complete Playwright test in JavaScript die:
1. Gebruik maakt van @playwright/test
2. De gevraagde functionaliteit test
3. Robuuste selectors gebruikt (data-testid voorkeur, dan text, dan CSS)
4. Wacht op netwerk idle waar nodig
5. Screenshots maakt bij belangrijke stappen
6. Duidelijke comments heeft in het Nederlands

Geef ALLEEN de code terug, geen markdown formatting, geen uitleg.
```

## Data Flow
```
Gebruiker → Dashboard → AI Agent Tab
  ↓
Selecteer/Configureer API
  ↓
Registreer Nieuwe Site (URL + credentials)
  ↓
[Crawler] Playwright bezoekt site → Analyseert DOM
  ↓
[Kennis Opslag] Site structuur, selectors, flows opgeslagen
  ↓
[Chat] Gebruiker vraagt: "Test de login"
  ↓
[Prompt Builder] Combineert site kennis + vraag
  ↓
[AI API] Genereert Playwright code
  ↓
[Validator] Controleert of code geldig is
  ↓
[Test Opslag] Slaat op als tests/{naam}.spec.js
  ↓
[Optioneel] Voer test uit → Toon resultaten
```

## UI Mockup (Nieuwe Tab: 🤖 AI Agent)
```
┌─────────────────────────────────────────────────────────────┐
│  🤖 AI Test Agent                                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │ Site Agents  │  │ Chat                                │ │
│  │              │  │                                     │ │
│  │ ➕ Nieuw     │  │ Bot: Hallo! Ik ben je test agent.   │ │
│  │              │  │      Selecteer een site om mee te   │ │
│  │ 🏠 Wikipedia │  │      beginnen.                      │ │
│  │ 🏢 Altrad   │  │                                     │ │
│  │ 🛒 Webshop  │  │ Jij: Test de login flow             │ │
│  │              │  │                                     │ │
│  │ [Details]   │  │ Bot: ✅ Test gegenereerd!           │ │
│  │ [Verwijder] │  │      "login-flow.spec.js" aangemaakt│ │
│  │              │  │      Wil je hem uitvoeren?          │ │
│  │              │  │                                     │ │
│  │              │  │ [Typ hier...] [Verstuur]            │ │
│  └──────────────┘  └─────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧠 Site Kennis (van geselecteerde agent)            │   │
│  │ • Homepage: 12 secties, 3 formulieren               │   │
│  │ • Login selector: #username (input)                 │   │
│  │ • Bekende flows: Login → Dashboard → Profiel        │   │
│  │ • Laatst geüpdatet: 2026-06-17                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Implementatie Volgorde
1. **Fase 1**: API Config systeem (opslag + UI)
2. **Fase 2**: Site Agent data model + registratie UI
3. **Fase 3**: Site Crawler (Playwright DOM analyse)
4. **Fase 4**: Chat UI + berichten systeem
5. **Fase 5**: AI Test Generator (prompt builder + API call)
6. **Fase 6**: Integratie + testen

## Technische Keuzes
- **AI Provider**: Flexibel (OpenAI/Azure/Claude) via configuratie
- **Crawler**: Bestaande Playwright installatie hergebruiken
- **Data opslag**: JSON files (consistent met huidige architectuur)
- **Frontend**: Vanilla JS (consistent met huidige dashboard)
- **Security**: API keys in apart config bestand (niet in repo)
