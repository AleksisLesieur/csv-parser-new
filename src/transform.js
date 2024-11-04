const fs = require('fs');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

const { performance } = require('perf_hooks');

class parseCSV extends Transform {
  constructor() {
    super({ encoding: 'utf-8', highWaterMark: 1024 * 1024 });
    this.buffer = '';
    this.headers = null;
    this.isFirstChunk = true;
    this.isFirstObject = true;
    this.separators = [',', ';', '|', '\t'];
    this.selectedSeparator = '';
  }

  formatField(value) {
    if (!value) return '';

    let cleaned = value.trim();

    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  }

  // createObjectString(values) {
  //   let objectString = '{';

  //   for (let i = 0; i < this.headers.length; i++) {
  //     if (i > 0) {
  //       objectString += ',';
  //     }
  //     const value = this.formatField(values[i]);
  //     objectString += `"${this.headers[i]}": "${value}"`;
  //   }

  //   objectString += '}';
  //   return objectString;
  // }

  createHeaders(values) {
    if (!values || typeof values !== 'string') {
      return [];
    }

    for (const separator of this.separators) {
      if (values.includes(separator)) {
        this.selectedSeparator = separator;
        return values.split(separator);
      }
    }
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

        const headerValues = lines.shift();

        this.headers = this.createHeaders(headerValues).map((h) => h.trim());

        this.push('[\n');
      }

      // for (const line of lines) {
      //   if (!line.trim()) continue;

      //   const values = line.split(this.selectedSeparator);

      //   if (values.length !== this.headers.length) continue;

      //   if (!this.isFirstObject) {
      //     this.push(',\n');
      //   } else {
      //     this.isFirstObject = false;
      //   }

      //   const objectString = this.createObjectString(values);
      //   this.push(objectString);
      // }

      lines.reduce((isFirst, line) => {
        if (!line.trim()) return isFirst;

        const values = line.split(this.selectedSeparator);
        if (values.length !== this.headers.length) return isFirst;

        if (!isFirst) {
          this.push(',\n');
        }

        const objectString =
          this.headers.reduce((acc, header, index) => {
            const value = this.formatField(values[index]);
            return index === 0 ? `{"${header}": "${value}"` : `${acc},"${header}": "${value}"`;
          }, '') + '}';

        this.push(objectString);
        return false;
      }, this.isFirstObject);

      this.isFirstObject = false;

      callback();
    } catch (err) {
      callback(err);
    }
  }

  // jog paemus visa chunka (kuriame pvz 50 eiluciu) ji visa apdoroti i json ir tada papushinti i streama, nes dabar darau kiekviena eilute

  _flush(callback) {
    try {
      if (this.buffer.trim()) {
        const values = this.buffer.split(this.selectedSeparator);

        if (values.length === this.headers.length) {
          if (!this.isFirstObject) {
            this.push(',\n');
          }

          const objectString =
            values.reduce((acc, key, index) => {
              const value = this.formatField(values[index]);
              return index === 0 ? `{"${key}": "${value}"` : `${acc},"${key}": "${value}"`;
            }, '') + '}';

          this.push(objectString);
        }
      }

      this.push('\n]');
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

const fileName = process.argv[2];

parseCSVtoJSON(`../csv-data/${fileName}.csv`, `../data/${fileName}.json`);
