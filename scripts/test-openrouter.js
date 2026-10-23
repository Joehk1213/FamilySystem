require('dotenv').config({ quiet: true });

const { parseCalendarInput } = require('../server/services/openrouterService');

async function main() {
  try {
    const result = await parseCalendarInput('星期五下午 3 點開會');
    console.log('OpenRouter free-model test passed.');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('OpenRouter free-model test failed:', error.message);
    process.exitCode = 1;
  }
}

main();
