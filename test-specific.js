import { parseCroatianCommand } from './src/components/tabs/GVAv2/parser/parseCroatianCommand.js';

const tests = [
  'primijeni normativ 2',
  'daj prvi normativ', 
  'daj drugi normativ',
  'normativ 2',
  'rasporedi procese prema normativu 1'
];

console.log('🎯 Testing specific commands:');
tests.forEach(cmd => {
  const result = parseCroatianCommand(cmd, {aliasToLine: {}, defaultYear: 2025});
  if (result) {
    console.log(`✅ "${cmd}" → ${result.type} ${JSON.stringify(result.profile || {})}`);
  } else {
    console.log(`❌ "${cmd}" → NOT RECOGNIZED`);
  }
});