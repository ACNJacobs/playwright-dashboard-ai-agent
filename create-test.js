// Copyright (c) 2026 Ton Jacobs. All rights reserved.
// This file is part of the Playwright Test Suite.

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🎭 Playwright Test Generator - Automatisch\n');
  console.log('Dit script helpt je om automatisch een nieuwe test te maken.\n');
  
  // Vraag URL
  const url = await askQuestion('🌐 Op welke URL wil je testen? (bijv. https://example.com/login): ');
  if (!url) {
    console.log('❌ Geen URL opgegeven. Afgebroken.');
    rl.close();
    return;
  }
  
  // Vraag test naam
  const defaultName = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
  const testNameInput = await askQuestion(`📝 Wat is de naam van je test? [${defaultName}]: `);
  const testName = testNameInput || defaultName;
  
  // Vraag of assertions toegevoegd moeten worden
  const addAssertions = await askQuestion('✅ Wil je automatisch assertions toevoegen? (ja/nee) [ja]: ');
  const shouldAddAssertions = !addAssertions || addAssertions.toLowerCase() === 'ja' || addAssertions.toLowerCase() === 'j';
  
  console.log('\n' + '='.repeat(60));
  console.log('🚀 STAP 1: Codegen starten');
  console.log('='.repeat(60));
  console.log(`\n   URL: ${url}`);
  console.log(`   Test naam: ${testName}`);
  console.log(`   Assertions: ${shouldAddAssertions ? 'Ja' : 'Nee'}`);
  console.log('\n   ⚠️  INSTRUCTIES:');
  console.log('   1. Er opent een browser venster');
  console.log('   2. Voer je handelingen uit (klikken, typen, navigeren)');
  console.log('   3. Klik in het codegen venster op "Copy" (rechtsboven)');
  console.log('   4. Sluit het codegen venster');
  console.log('   5. Kom hier terug en plak de code\n');
  
  // Start codegen in een apart proces
  console.log('   Codegen starten...\n');
  
  try {
    // Start codegen detached zodat het script doorgaat
    const codegen = spawn('npx', ['playwright', 'codegen', url], {
      detached: true,
      stdio: 'ignore'
    });
    
    codegen.unref();
    
    // Wacht even zodat codegen kan starten
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } catch (error) {
    console.log('   ⚠️  Kon codegen niet automatisch starten.');
    console.log(`   Start handmatig: npx playwright codegen ${url}`);
  }
  
  // Vraag de gegenereerde code
  console.log('='.repeat(60));
  console.log('📝 STAP 2: Code plakken');
  console.log('='.repeat(60));
  console.log('\nPlak hier de gegenereerde code uit het codegen venster:');
  console.log('(Typ "KLAAR" op een nieuwe regel als je klaar bent)\n');
  
  let generatedCode = '';
  let line;
  while ((line = await askQuestion('')) !== 'KLAAR') {
    generatedCode += line + '\n';
  }
  
  if (!generatedCode.trim()) {
    console.log('❌ Geen code geplakt. Afgebroken.');
    rl.close();
    return;
  }
  
  console.log('\n✅ Code ontvangen!');
  
  // STAP 3: Verwerk de code
  console.log('\n' + '='.repeat(60));
  console.log('⚙️  STAP 3: Code verwerken');
  console.log('='.repeat(60));
  
  const testFileName = `${testName}.spec.js`;
  const testFilePath = path.join('tests', testFileName);
  
  // Verwerk de gegenereerde code
  let testContent = processGeneratedCode(generatedCode, testName, shouldAddAssertions);
  
  // Schrijf het bestand
  fs.writeFileSync(testFilePath, testContent);
  
  console.log(`\n   ✅ Testbestand aangemaakt: ${testFilePath}`);
  console.log(`   📄 Bestandsgrootte: ${testContent.length} tekens`);
  
  // Toon een voorbeeld
  console.log('\n   📋 Voorbeeld van de test:');
  console.log('   ' + '-'.repeat(50));
  const previewLines = testContent.split('\n').slice(0, 15);
  previewLines.forEach(line => {
    if (line.length > 50) line = line.substring(0, 47) + '...';
    console.log('   ' + line);
  });
  if (testContent.split('\n').length > 15) {
    console.log('   ...');
  }
  console.log('   ' + '-'.repeat(50));
  
  // STAP 4: Test uitvoeren
  console.log('\n' + '='.repeat(60));
  console.log('🧪 STAP 4: Test uitvoeren');
  console.log('='.repeat(60));
  
  const runTest = await askQuestion('\n▶️  Wil je de test nu uitvoeren? (ja/nee) [ja]: ');
  if (!runTest || runTest.toLowerCase() === 'ja' || runTest.toLowerCase() === 'j') {
    console.log('\n   Test uitvoeren...\n');
    try {
      execSync(`npx playwright test ${testFilePath} --headed`, { stdio: 'inherit' });
      console.log('\n   ✅ Test succesvol uitgevoerd!');
    } catch (error) {
      console.log('\n   ⚠️  Test uitgevoerd (mogelijk met fouten)');
    }
    
    // STAP 5: Rapport bekijken
    console.log('\n' + '='.repeat(60));
    console.log('📊 STAP 5: Rapport bekijken');
    console.log('='.repeat(60));
    
    const openReport = await askQuestion('\n📊 Wil je het HTML rapport bekijken? (ja/nee) [ja]: ');
    if (!openReport || openReport.toLowerCase() === 'ja' || openReport.toLowerCase() === 'j') {
      console.log('\n   Rapport openen...');
      console.log('   (Druk op Ctrl+C om de server te stoppen)\n');
      try {
        execSync('npx playwright show-report', { stdio: 'inherit' });
      } catch (error) {
        // Server wordt normaal gesproken onderbroken
      }
    }
  }
  
  // Samenvatting
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SAMENVATTING');
  console.log('='.repeat(60));
  console.log(`   📁 Testbestand: ${testFilePath}`);
  console.log(`   🌐 Getest op: ${url}`);
  console.log(`   ✅ Assertions: ${shouldAddAssertions ? 'Toegevoegd' : 'Niet toegevoegd'}`);
  console.log(`   📊 Rapport: playwright-report/index.html`);
  console.log(`   🎬 Video's: test-results/`);
  console.log('\n   💡 Volgende keer direct uitvoeren:');
  console.log(`      node create-test.js`);
  console.log('='.repeat(60));
  
  rl.close();
}

function processGeneratedCode(code, testName, addAssertions) {
  // Verwijder de const { chromium } = require('playwright'); regel
  let processedCode = code
    .replace(/const\s+{\s*chromium\s*}\s+=\s+require\(['"]playwright['"]\);?\n?/g, '')
    .replace(/\(async\s+\(\)\s+=>\s+{\s*\n?/g, '')
    .replace(/\n?}\)\(\);?\s*$/g, '');
  
  // Verwijder browser.close() als die er is
  processedCode = processedCode.replace(/await\s+browser\.close\(\);?\n?/g, '');
  
  // Verwijder overbodige newlines aan het begin en eind
  processedCode = processedCode.trim();
  
  // Verwijder const browser = await chromium.launch... regels
  processedCode = processedCode.replace(/const\s+browser\s+=\s+await\s+chromium\.launch\([^)]*\);?\n?/g, '');
  processedCode = processedCode.replace(/const\s+context\s+=\s+await\s+browser\.newContext\([^)]*\);?\n?/g, '');
  processedCode = processedCode.replace(/const\s+page\s+=\s+await\s+context\.newPage\(\);?\n?/g, '');
  
  let assertions = '';
  if (addAssertions) {
    assertions = generateAssertions(processedCode);
  }
  
  const testContent = `const { test, expect } = require('@playwright/test');

test('${testName}', async ({ page }) => {
${indentCode(processedCode, 2)}
${assertions ? '\n' + assertions : ''}
});
`;
  
  return testContent;
}

function indentCode(code, spaces) {
  const indent = ' '.repeat(spaces);
  return code.split('\n').map(line => {
    if (line.trim() === '') return '';
    return indent + line;
  }).join('\n');
}

function generateAssertions(code) {
  let assertions = [];
  
  // Detecteer page.goto en voeg URL assertion toe
  const gotoMatch = code.match(/page\.goto\(['"]([^'"]+)['"]\)/);
  if (gotoMatch) {
    assertions.push(`  // ✅ Controle: juiste pagina geladen`);
    assertions.push(`  await expect(page).toHaveURL('${gotoMatch[1]}');`);
  }
  
  // Detecteer fill acties en voeg value assertions toe
  const fillMatches = [...code.matchAll(/page\.fill\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g)];
  fillMatches.forEach(match => {
    assertions.push(`  // ✅ Controle: veld correct ingevuld`);
    assertions.push(`  await expect(page.locator('${match[1]}')).toHaveValue('${match[2]}');`);
  });
  
  // Detecteer click acties
  const clickMatches = [...code.matchAll(/page\.click\(['"]([^'"]+)['"]\)/g)];
  clickMatches.forEach(match => {
    assertions.push(`  // ✅ Controle: element was zichtbaar`);
    assertions.push(`  await expect(page.locator('${match[1]}')).toBeVisible();`);
  });
  
  // Detecteer page.waitForSelector
  const waitMatches = [...code.matchAll(/page\.waitForSelector\(['"]([^'"]+)['"]\)/g)];
  waitMatches.forEach(match => {
    assertions.push(`  // ✅ Controle: element is aanwezig`);
    assertions.push(`  await expect(page.locator('${match[1]}')).toBeVisible();`);
  });
  
  return assertions.join('\n');
}

main().catch(error => {
  console.error('\n❌ Fout:', error.message);
  rl.close();
  process.exit(1);
});
