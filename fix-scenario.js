const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config/apps-config.json', 'utf8'));

// Fix the AI scenario
const aiScenario = config.scenarios.find(s => s.name.includes('AI:'));
if (aiScenario) {
  // Fix type step - add target
  const typeStep = aiScenario.steps.find(s => s.action === 'type' && s.description.includes('Hallo'));
  if (typeStep && !typeStep.target) {
    typeStep.target = 'Naamloos';
  }
  
  // Fix filename step
  const filenameStep = aiScenario.steps.find(s => s.action === 'type' && s.description.includes('bestandsnaam'));
  if (filenameStep) {
    filenameStep.value = 'test.txt';
    filenameStep.description = 'Typ bestandsnaam "test.txt"';
  }
  
  fs.writeFileSync('config/apps-config.json', JSON.stringify(config, null, 2));
  console.log('AI scenario gefixt');
} else {
  console.log('AI scenario niet gevonden');
}
