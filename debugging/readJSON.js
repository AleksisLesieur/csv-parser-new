const fs = require('fs');

function isValidJSON(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    JSON.parse(fileContent);
    return 'it is valid';
  } catch (error) {
    return 'no, there is an error: ' + error.message;
  }
}

// Streaming version for larger files
async function isValidJSONStream(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: 1024 * 1024, // 1MB chunks
    });

    let buffer = '';
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    stream.on('data', (chunk) => {
      try {
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
          } else if (char === '\\' && !escapeNext) {
            escapeNext = true;
          }

          if (!inString) {
            if (char === '{' || char === '[') {
              depth++;
            } else if (char === '}' || char === ']') {
              depth--;
            }

            if (depth < 0) {
              resolve('no, there is an error: Unexpected closing bracket');
              stream.destroy();
              return;
            }
          }
        }
      } catch (error) {
        resolve('no, there is an error: ' + error.message);
        stream.destroy();
      }
    });

    stream.on('end', () => {
      if (depth !== 0) {
        resolve('no, there is an error: Unclosed brackets');
      } else {
        resolve('it is valid');
      }
    });

    stream.on('error', (error) => {
      resolve('no, there is an error: ' + error.message);
    });
  });
}

// Usage:
async function validateJSON(filePath) {
  try {
    // For small files
    // console.log(isValidJSON(filePath));

    // For large files
    const result = await isValidJSONStream(filePath);
    console.log(result);
  } catch (error) {
    console.log('no, there is an error: ' + error.message);
  }
}

// Call it with your file
const fileName = process.argv[2];
validateJSON(`./../data/${fileName}.json`);
