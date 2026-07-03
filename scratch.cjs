const fs = require('fs');
const key = fs.readFileSync('.env', 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY=')).split('=')[1].trim().replace(/\"/g, '');
fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key)
  .then(r => r.json())
  .then(d => {
    if (d.models) {
      console.log("Allowed models:", d.models.map(m => m.name));
    } else {
      console.log("Error:", d);
    }
  });
