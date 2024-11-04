const fs = require('fs');

async function readLargeJSON(filePath) {
  console.log(`Reading file: ${filePath}`);

  const stream = fs.createReadStream(filePath, {
    encoding: 'utf8',
    highWaterMark: 100 * 1024 * 1024, // 10MB chunks
  });

  let buffer = '';
  let isFirstChunk = true;
  let count = 0;
  let depth = 0;
  let objectStart = -1;

  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => {
      try {
        // Handle the first chunk's opening bracket
        if (isFirstChunk) {
          chunk = chunk.trimStart();
          if (chunk[0] === '[') {
            chunk = chunk.slice(1);
          }
          isFirstChunk = false;
        }

        buffer += chunk;

        let pos = 0;
        while (pos < buffer.length) {
          // Track object boundaries using { and }
          if (buffer[pos] === '{') {
            if (depth === 0) {
              objectStart = pos;
            }
            depth++;
          } else if (buffer[pos] === '}') {
            depth--;

            // We've found a complete object
            if (depth === 0 && objectStart !== -1) {
              let objStr = buffer.slice(objectStart, pos + 1);
              try {
                const obj = JSON.parse(objStr);
                count++;

                // Process the object
                if (count % 1000 === 0) {
                  console.log(`Processed ${count} objects`);
                  // Log a sample object every 1000 objects
                  console.log('Sample object:', JSON.stringify(obj).slice(0, 100) + '...');
                }

                // Move past the comma if it exists
                while (pos + 1 < buffer.length && (buffer[pos + 1] === ',' || buffer[pos + 1] === ' ' || buffer[pos + 1] === '\n')) {
                  pos++;
                }

                // Remove processed object from buffer
                buffer = buffer.slice(pos + 1);
                pos = 0;
                objectStart = -1;
                continue;
              } catch (e) {
                console.error('Error parsing object:', e.message);
              }
            }
          }
          pos++;
        }

        // If buffer gets too large, trim it
        if (buffer.length > 20 * 1024 * 1024) {
          // 20MB
          console.warn('Buffer getting too large, possible malformed JSON');
          buffer = buffer.slice(-10 * 1024 * 1024); // Keep last 10MB
        }
      } catch (e) {
        console.error('Error processing chunk:', e.message);
      }
    });

    stream.on('error', (error) => {
      console.error('Stream error:', error);
      reject(error);
    });

    stream.on('end', () => {
      console.log(`Finished processing ${count} objects`);
      resolve(count);
    });
  });
}

const fileName = process.argv[2];

async function main() {
  try {
    const count = await readLargeJSON(`./../data/${fileName}.json`);
    console.log(`Total objects processed: ${count}`);
  } catch (error) {
    console.error('Error reading file:', error);
    process.exit(1);
  }
}

main();
