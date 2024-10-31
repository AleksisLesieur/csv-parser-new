const fs = require('fs');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

const { performance } = require('perf_hooks');

class parseCSV extends Transform {
  constructor() {
    super({ encoding: 'utf-8' });
    this.buffer = '';
    this.headers = null;
    this.isFirstChunk = true;
    this.isFirstObject = true;
  }

  formatField(value) {
    if (!value) return '';

    let cleaned = value.trim();

    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  }

  _transform(chunk, encoding, callback) {
    try {
      this.buffer += chunk.toString();

      const lastNewLineIndex = this.buffer.lastIndexOf('\n');

      if (lastNewLineIndex === -1) {
        callback();
        return;
      }

      const lines = this.buffer.slice(0, lastNewLineIndex).split('\n');

      this.buffer = this.buffer.slice(lastNewLineIndex + 1);

      if (this.isFirstChunk) {
        this.isFirstChunk = false;
        this.headers = lines
          .shift()
          .split('|')
          .map((h) => h.trim());

        this.push(Buffer.from('[\n'));
      }

      for (const line of lines) {
        if (!line.trim()) continue;

        const values = line.split('|');

        if (values.length !== this.headers.length) continue;

        if (!this.isFirstObject) {
          this.push(Buffer.from(',\n'));
        } else {
          this.isFirstObject = false;
        }

        let objectString = '{';

        for (let i = 0; i < this.headers.length; i++) {
          if (i > 0) {
            objectString += ',';
          }
          const value = this.formatField(values[i]);
          objectString += `"${this.headers[i]}":"${value}"`;
        }
        objectString += '}';

        this.push(Buffer.from(objectString));
      }
      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback) {
    try {
      if (this.buffer.trim()) {
        const values = this.buffer.split('|');
        if (values.length === this.headers.length) {
          if (!this.isFirstObject) {
            this.push(Buffer.from(',\n'));
          }

          let objectString = '{';

          for (let i = 0; i < this.headers.length; i++) {
            if (i > 0) {
              objectString += ',';
            }
            const value = this.formatField(values[i]);
            objectString += `"${this.headers[i]}":"${value}"`;
          }
          objectString += '}';

          this.push(Buffer.from(objectString));
        }
      }

      this.push(Buffer.from('\n]'));
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

async function parseCSVtoJSON(inputFile, outputFile) {
  const startTime = performance.now();
  const readStream = fs.createReadStream(inputFile, {
    encoding: 'utf-8',
    highWaterMark: 1024 * 1024,
  });

  const writeStream = fs.createWriteStream(outputFile, {
    encoding: 'utf-8',
    highWaterMark: 1024 * 1024,
  });

  const parse = new parseCSV();

  try {
    await pipeline(readStream, parse, writeStream);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log('Conversion completed successfully');
    console.log(`Time taken: ${duration.toFixed(2)} milliseconds`);
    console.log(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
  } catch (err) {
    console.log(err);
    writeStream.end();
  }
}

parseCSVtoJSON('./../csv-data/mockData2.csv', './../data/output.json');

