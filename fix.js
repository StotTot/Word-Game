const fs = require('fs');
const data = require('./6letterwords.json');
data.words = data.words.map(w => w.toLowerCase());
fs.writeFileSync('6letterwords.json', JSON.stringify(data, null, 2));