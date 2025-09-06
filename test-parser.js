// Test script for Croatian command parser
import { parseCroatianCommand } from './src/components/tabs/GVAv2/parser/parseCroatianCommand.js';

const testCommands = [
  'primijeni normativ jedan',
  'primijeni normativ 1',
  'primijeni normativ dva',
  'primijeni normativ 2',
  'daj prvi normativ',
  'daj drugi normativ',
  'normativ jedan',
  'normativ 2',
  'rasporedi procese prema normativu 1',
  'rasporedi procese prema normativu 2',
  'primijeni normativ custom početak plus 3 kraj plus 7',
  'pokaži standardni plan',
  'poravnaj kraj prethodne na početak sljedeće',
  'dodaj svim procesima po jedan dan',
  'dodaj svim procesima po 3 dana',
  'poništi',
  'odustani',
  'analiza petak',
  'otvori subota stranica 1',
];

console.log('🧪 Testing Croatian Command Parser\n');

testCommands.forEach((cmd, index) => {
  console.log(`${index + 1}. "${cmd}"`);
  
  try {
    const result = parseCroatianCommand(cmd, { 
      aliasToLine: { 'PR1': 'line1', 'PR2': 'line2' }, 
      defaultYear: 2025 
    });
    
    if (result) {
      console.log(`   ✅ Parsed:`, JSON.stringify(result, null, 2));
    } else {
      console.log(`   ❌ Not recognized`);
    }
  } catch (error) {
    console.log(`   🚨 Error:`, error.message);
  }
  
  console.log('');
});

console.log('🏁 Parser test complete');