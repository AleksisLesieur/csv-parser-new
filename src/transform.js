const fs = require("fs");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");

const { performance } = require("perf_hooks");
const { EOL } = require("os");

class ParseCSV extends Transform {
  constructor() {
    super({ highWaterMark: 1024 * 1024 });
    this.isHeadersCreated = false;
    this.headers = null;
    this.isFirstBatch = true;
    this.separators = [",", ";", "|", "\t"];
    this.selectedSeparator = "";
    this.lastLine = null;
    this.buffer = "";
  }

  formatField(value) {
    if (!value) return "";

    let cleaned = value.trim();

    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  }

  createHeaders(values) {
    if (!values || typeof values !== "string") {
      return;
    }

    for (const separator of this.separators) {
      if (values.includes(separator)) {
        this.selectedSeparator = separator;
        this.headers = values.split(separator).map((h) => h.trim());
        return this.headers;
      }
    }
    this.headers = [];
    return this.headers;
  }

  // createObjectString(headers, values) {
  //   let result = "{";
  //   for (let i = 0; i < headers.length; i++) {
  //     if (i > 0) {
  //       result += ",";
  //     }
  //     result += `"${headers[i]}":"${this.formatField(values[i])}"`; // create array of header/value pair strings and join them
  //   }
  //   return result + "}";
  // }

  createObjectString(headers, values) {
    const pairs = headers.map((header, i) => `"${header}":"${this.formatField(values[i])}"`);
    return "{" + pairs.join(",") + "}";
  }

  _transform(chunk, encoding, done) {
    try {
      const str = chunk.toString();
      //if lastLine add to start of str
      const data = this.buffer + str;
      const lines = data.split(EOL);

      // Save last line for flush
      this.buffer = lines.pop();

      if (!this.isHeadersCreated && lines.length > 0) {
        const headerLine = lines.shift();
        this.createHeaders(headerLine);
        this.isHeadersCreated = true;
      }

      const validLines = lines.filter((line) => line.trim());

      if (validLines.length > 0) {
        const prefix = this.isFirstBatch ? "[" : ",";
        this.isFirstBatch = false;

        const jsonData = validLines
          .map((line) => {
            const values = line.split(this.selectedSeparator);
            return this.createObjectString(this.headers, values);
          })
          .join(",");

        if (jsonData) {
          this.push(prefix + jsonData);
        }
      }

      done();
    } catch (err) {
      done(err);
    }
  }

  _flush(done) {
    try {
      if (this.buffer && this.buffer.trim()) {
        const prefix = this.isFirstBatch ? "[" : ",";
        const values = this.buffer.split(this.selectedSeparator);
        const jsonData = this.createObjectString(this.headers, values);
        this.push(prefix + jsonData);
      }

      this.push("]");
      done();
    } catch (error) {
      done(error);
    }
  }
}

async function parseCSVtoJSON(inputFile, outputFile) {
  const startTime = performance.now();
  const readStream = fs.createReadStream(inputFile);

  const writeStream = fs.createWriteStream(outputFile);

  const parse = new ParseCSV();

  try {
    await pipeline(readStream, parse, writeStream);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log("Conversion completed successfully");
    console.log(`Time taken: ${duration.toFixed(2)} milliseconds`);
    console.log(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
  } catch (err) {
    console.log(err);
    writeStream.end();
  }
}

const fileName = process.argv[2];

parseCSVtoJSON(`../csv-data/${fileName}.csv`, `../data/${fileName}.json`);
