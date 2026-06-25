// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// Playwright MCP Server - Biedt Playwright tools aan via Model Context Protocol

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// === MCP SERVER SETUP ===
const server = new Server(
  {
    name: 'playwright-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// === PLAYWRIGHT BROWSER STATE ===
let browser = null;
let context = null;
let page = null;
let codegenProcess = null;

async function ensureBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage();
  }
  return page;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
    page = null;
  }
}

// === TOOL DEFINITIONS ===
const TOOLS = [
  {
    name: 'playwright_navigate',
    description: 'Navigeer naar een URL in de browser. Opent een zichtbare browser als deze nog niet open is.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'De URL om naar te navigeren' },
        waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'], description: 'Wacht conditie' }
      },
      required: ['url']
    }
  },
  {
    name: 'playwright_click',
    description: 'Klik op een element op de pagina via selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of text van het element' },
        byText: { type: 'boolean', description: 'Of de selector een tekst is (getByText)' }
      },
      required: ['selector']
    }
  },
  {
    name: 'playwright_fill',
    description: 'Vul tekst in een input veld.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector van het input veld' },
        text: { type: 'string', description: 'De tekst om in te vullen' }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'playwright_type',
    description: 'Typ tekst karakter voor karakter (voor typeahead/autocomplete).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector van het input veld' },
        text: { type: 'string', description: 'De tekst om te typen' },
        delay: { type: 'number', description: 'Vertraging tussen toetsaanslagen in ms', default: 50 }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'playwright_select',
    description: 'Selecteer een optie uit een dropdown.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector van de <select>' },
        value: { type: 'string', description: 'De value om te selecteren' }
      },
      required: ['selector', 'value']
    }
  },
  {
    name: 'playwright_get_text',
    description: 'Haal de tekst op van een element.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector van het element' }
      },
      required: ['selector']
    }
  },
  {
    name: 'playwright_get_title',
    description: 'Haal de pagina titel op.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'playwright_screenshot',
    description: 'Maak een screenshot van de huidige pagina.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Naam voor de screenshot (zonder extensie)' },
        fullPage: { type: 'boolean', description: 'Volledige pagina screenshot', default: false }
      },
      required: ['name']
    }
  },
  {
    name: 'playwright_wait_for_selector',
    description: 'Wacht tot een element zichtbaar is.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector om op te wachten' },
        timeout: { type: 'number', description: 'Timeout in ms', default: 30000 }
      },
      required: ['selector']
    }
  },
  {
    name: 'playwright_wait_for_timeout',
    description: 'Wacht een aantal milliseconden.',
    inputSchema: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Aantal milliseconden om te wachten' }
      },
      required: ['ms']
    }
  },
  {
    name: 'playwright_press_key',
    description: 'Druk op een toets (Enter, Escape, Tab, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'De toets om te drukken (bijv. "Enter", "Escape", "Tab")' }
      },
      required: ['key']
    }
  },
  {
    name: 'playwright_scroll',
    description: 'Scroll op de pagina.',
    inputSchema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], description: 'Scroll richting' },
        amount: { type: 'number', description: 'Aantal pixels om te scrollen', default: 500 }
      },
      required: ['direction']
    }
  },
  {
    name: 'playwright_get_html',
    description: 'Haal de HTML van de huidige pagina op (voor analyse).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optionele CSS selector om te beperken', default: 'body' }
      }
    }
  },
  {
    name: 'playwright_get_elements',
    description: 'Lijst alle elementen die matchen met een selector.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector (bijv. "a", "button", "input")' }
      },
      required: ['selector']
    }
  },
  {
    name: 'playwright_codegen_start',
    description: 'Start Playwright codegen voor een URL. Genereert automatisch test code terwijl je interacties uitvoert.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'De URL om te bezoeken voor codegen' },
        outputFile: { type: 'string', description: 'Pad naar het output .spec.js bestand', default: 'tests/codegen-generated.spec.js' }
      },
      required: ['url']
    }
  },
  {
    name: 'playwright_codegen_stop',
    description: 'Stop codegen en geef de gegenereerde code terug.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'playwright_run_test',
    description: 'Voer een Playwright test uit en geef de resultaten terug.',
    inputSchema: {
      type: 'object',
      properties: {
        testFile: { type: 'string', description: 'Pad naar het .spec.js bestand' },
        headed: { type: 'boolean', description: 'Toon browser venster', default: true }
      },
      required: ['testFile']
    }
  },
  {
    name: 'playwright_create_test',
    description: 'Sla Playwright test code op als een .spec.js bestand.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Naam van de test (zonder .spec.js)' },
        code: { type: 'string', description: 'De volledige Playwright test code' }
      },
      required: ['name', 'code']
    }
  },
  {
    name: 'playwright_close_browser',
    description: 'Sluit de browser. Gebruik dit als je klaar bent.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// === TOOL HANDLERS ===
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'playwright_navigate': {
        const p = await ensureBrowser();
        const waitUntil = args.waitUntil || 'networkidle';
        await p.goto(args.url, { waitUntil, timeout: 60000 });
        const title = await p.title();
        return {
          content: [{
            type: 'text',
            text: `✅ Genavigeerd naar: ${args.url}\n📄 Pagina titel: ${title}\n🔗 Huidige URL: ${p.url()}`
          }]
        };
      }

      case 'playwright_click': {
        const p = await ensureBrowser();
        if (args.byText) {
          await p.getByText(args.selector).click();
        } else {
          await p.locator(args.selector).click();
        }
        return {
          content: [{
            type: 'text',
            text: `✅ Geklikt op: ${args.selector}`
          }]
        };
      }

      case 'playwright_fill': {
        const p = await ensureBrowser();
        await p.locator(args.selector).fill(args.text);
        return {
          content: [{
            type: 'text',
            text: `✅ Tekst ingevuld in "${args.selector}": "${args.text}"`
          }]
        };
      }

      case 'playwright_type': {
        const p = await ensureBrowser();
        await p.locator(args.selector).type(args.text, { delay: args.delay || 50 });
        return {
          content: [{
            type: 'text',
            text: `✅ Getypt in "${args.selector}": "${args.text}"`
          }]
        };
      }

      case 'playwright_select': {
        const p = await ensureBrowser();
        await p.locator(args.selector).selectOption(args.value);
        return {
          content: [{
            type: 'text',
            text: `✅ Geselecteerd "${args.value}" in "${args.selector}"`
          }]
        };
      }

      case 'playwright_get_text': {
        const p = await ensureBrowser();
        const text = await p.locator(args.selector).textContent();
        return {
          content: [{
            type: 'text',
            text: `📄 Tekst van "${args.selector}":\n${text || '(geen tekst)'}`
          }]
        };
      }

      case 'playwright_get_title': {
        const p = await ensureBrowser();
        const title = await p.title();
        return {
          content: [{
            type: 'text',
            text: `📄 Pagina titel: ${title}`
          }]
        };
      }

      case 'playwright_screenshot': {
        const p = await ensureBrowser();
        const screenshotDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const fileName = `${args.name}-${Date.now()}.png`;
        const filePath = path.join(screenshotDir, fileName);
        await p.screenshot({ path: filePath, fullPage: args.fullPage || false });
        return {
          content: [{
            type: 'text',
            text: `📸 Screenshot opgeslagen: screenshots/${fileName}`
          }]
        };
      }

      case 'playwright_wait_for_selector': {
        const p = await ensureBrowser();
        await p.waitForSelector(args.selector, { timeout: args.timeout || 30000 });
        return {
          content: [{
            type: 'text',
            text: `✅ Element "${args.selector}" is zichtbaar`
          }]
        };
      }

      case 'playwright_wait_for_timeout': {
        await new Promise(r => setTimeout(r, args.ms));
        return {
          content: [{
            type: 'text',
            text: `⏳ Gewacht ${args.ms}ms`
          }]
        };
      }

      case 'playwright_press_key': {
        const p = await ensureBrowser();
        await p.keyboard.press(args.key);
        return {
          content: [{
            type: 'text',
            text: `⌨️ Toets "${args.key}" ingedrukt`
          }]
        };
      }

      case 'playwright_scroll': {
        const p = await ensureBrowser();
        const amount = args.amount || 500;
        const directions = { up: [0, -amount], down: [0, amount], left: [-amount, 0], right: [amount, 0] };
        const [x, y] = directions[args.direction] || [0, amount];
        await p.evaluate(([dx, dy]) => window.scrollBy(dx, dy), [x, y]);
        return {
          content: [{
            type: 'text',
            text: `📜 Gescrolled ${args.direction} ${amount}px`
          }]
        };
      }

      case 'playwright_get_html': {
        const p = await ensureBrowser();
        const html = await p.locator(args.selector || 'body').innerHTML();
        const truncated = html.length > 3000 ? html.substring(0, 3000) + '\n... (getruncateerd)' : html;
        return {
          content: [{
            type: 'text',
            text: `🌐 HTML van "${args.selector || 'body'}" (${html.length} chars):\n\n${truncated}`
          }]
        };
      }

      case 'playwright_get_elements': {
        const p = await ensureBrowser();
        const elements = await p.locator(args.selector).all();
        const results = [];
        for (let i = 0; i < Math.min(elements.length, 20); i++) {
          const el = elements[i];
          const text = await el.textContent().catch(() => '');
          const tag = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => 'unknown');
          results.push(`[${i}] <${tag}> "${text?.trim().substring(0, 50) || ''}"`);
        }
        return {
          content: [{
            type: 'text',
            text: `🔍 ${elements.length} elementen gevonden voor "${args.selector}":\n${results.join('\n')}${elements.length > 20 ? '\n... en ' + (elements.length - 20) + ' meer' : ''}`
          }]
        };
      }

      case 'playwright_codegen_start': {
        const outputFile = args.outputFile || 'tests/codegen-generated.spec.js';
        const fullOutputPath = path.resolve(__dirname, outputFile);
        
        const testsDir = path.dirname(fullOutputPath);
        if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });
        
        codegenProcess = spawn('npx', ['playwright', 'codegen', '--target', 'javascript', '-o', fullOutputPath, args.url], {
          cwd: __dirname,
          shell: true,
          detached: true
        });
        
        return {
          content: [{
            type: 'text',
            text: `🎥 Codegen gestart voor ${args.url}!\n💾 Output wordt opgeslagen in: ${outputFile}\n🖱️ Voer nu je interacties uit in de browser die opent.\n⏹️ Gebruik "playwright_codegen_stop" om te stoppen en de code te krijgen.`
          }]
        };
      }

      case 'playwright_codegen_stop': {
        if (codegenProcess) {
          try {
            process.kill(-codegenProcess.pid, 'SIGTERM');
          } catch (e) {
            // ignore
          }
          codegenProcess = null;
        }
        
        await new Promise(r => setTimeout(r, 1000));
        
        const testsDir = path.join(__dirname, 'tests');
        let generatedCode = '';
        let generatedFile = '';
        
        if (fs.existsSync(testsDir)) {
          const files = fs.readdirSync(testsDir)
            .filter(f => f.includes('codegen') && f.endsWith('.spec.js'))
            .map(f => ({ name: f, stat: fs.statSync(path.join(testsDir, f)) }))
            .sort((a, b) => b.stat.mtime - a.stat.mtime);
          
          if (files.length > 0) {
            generatedFile = files[0].name;
            generatedCode = fs.readFileSync(path.join(testsDir, generatedFile), 'utf8');
          }
        }
        
        return {
          content: [{
            type: 'text',
            text: generatedCode
              ? `⏹️ Codegen gestopt!\n📄 Bestand: ${generatedFile}\n\n📝 Gegenereerde code:\n\n\`\`\`javascript\n${generatedCode}\n\`\`\``
              : `⏹️ Codegen gestopt. Geen gegenereerde code gevonden. Controleer de tests/ map.`
          }]
        };
      }

      case 'playwright_run_test': {
        const testPath = path.join('tests', args.testFile);
        const fullPath = path.resolve(__dirname, testPath);
        
        if (!fs.existsSync(fullPath)) {
          return {
            content: [{
              type: 'text',
              text: `❌ Testbestand niet gevonden: ${testPath}`
            }]
          };
        }
        
        const testPathForward = 'tests/' + args.testFile;
        const headedFlag = args.headed !== false ? '--headed --project=chromium' : '';
        const command = `npx playwright test "${testPathForward}" ${headedFlag}`;
        
        try {
          const output = execSync(command, { cwd: __dirname, encoding: 'utf8', timeout: 120000 });
          return {
            content: [{
              type: 'text',
              text: `✅ Test succesvol uitgevoerd!\n\n\`\`\`\n${output}\n\`\`\``
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `❌ Test faalde:\n\n\`\`\`\n${error.stdout || ''}\n${error.stderr || ''}\n\`\`\``
            }]
          };
        }
      }

      case 'playwright_create_test': {
        const fileName = `${args.name}.spec.js`;
        const filePath = path.join(__dirname, 'tests', fileName);
        
        const testsDir = path.join(__dirname, 'tests');
        if (!fs.existsSync(testsDir)) fs.mkdirSync(testsDir, { recursive: true });
        
        fs.writeFileSync(filePath, args.code);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Test opgeslagen als tests/${fileName}`
          }]
        };
      }

      case 'playwright_close_browser': {
        await closeBrowser();
        return {
          content: [{
            type: 'text',
            text: `🔒 Browser gesloten.`
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `❌ Onbekende tool: ${name}`
          }]
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Fout bij uitvoeren van ${name}: ${error.message}`
      }]
    };
  }
});

// === START SERVER ===
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Playwright MCP Server gestart via stdio');
}

main().catch(console.error);
