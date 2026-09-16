import { simulatePortfolio, computeXIRR, solveRequiredSIP } from './src/engine.js';
import { PRESETS } from './src/presets.js';

console.log('Testing Simulation Engine...');
const defaultPreset = PRESETS[0];
const sim = simulatePortfolio(defaultPreset.config);

console.log('Final Corpus:', sim.summary.finalCorpus);
console.log('Total Invested:', sim.summary.totalInvested);
console.log('Wealth Created:', sim.summary.wealthCreated);
console.log('XIRR (%):', sim.summary.xirr.toFixed(2));

if (sim.summary.finalCorpus > 0 && sim.summary.totalInvested > 0 && sim.summary.xirr > 0) {
  console.log('✓ Simulation engine test passed!');
} else {
  console.error('✗ Simulation test failed');
  process.exit(1);
}

// Test changing SIP amount
const configModified = JSON.parse(JSON.stringify(defaultPreset.config));
const primarySip = configModified.events.find(e => e.type === 'sip');
primarySip.amount = 50000;
const sim2 = simulatePortfolio(configModified);
console.log('Updated SIP (50k) Final Corpus:', sim2.summary.finalCorpus);

if (sim2.summary.finalCorpus > sim.summary.finalCorpus) {
  console.log('✓ SIP update calculation test passed!');
} else {
  console.error('✗ SIP update test failed');
  process.exit(1);
}

// Test Goal Seeker
const requiredSIP = solveRequiredSIP(defaultPreset.config, 15000000);
console.log('Required SIP for 1.5 Cr:', requiredSIP);
if (requiredSIP > 0) {
  console.log('✓ Goal seeker test passed!');
}
