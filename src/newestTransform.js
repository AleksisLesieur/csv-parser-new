const fs = require("fs");
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");

const { performance } = require("perf_hooks");

class parseCSV extends Transform {
  constructor() {
    super({
      encoding: "utf-8",
      highWaterMark: 1024 * 1024,
    });
    this.buffer = ""; // Changed to string since we're using utf-8
    this.headers = null;
    this.isFirstChunk = true;
    this.isFirstBatch = true;
    this.batchSize = 1000;
    this.currentBatch = [];
    this.separators = [",", ";", "|", "\t"];
    this.selectedSeparator = "";
  }

  formatField(value) {
    if (!value) return "";
    return value.trim().replace(/^"|"$/g, "").replace(/"/g, '\\"');
  }

  createHeaders(values) {
    if (!values?.trim()) return [];

    for (const separator of this.separators) {
      if (values.includes(separator)) {
        this.selectedSeparator = separator;
        return values.split(separator).map((h) => h.trim());
      }
    }
    return [];
  }

  createObjectString(headers, values) {
    let result = "{";
    for (let i = 0; i < headers.length; i++) {
      if (i > 0) result += ",";
      result += `"${headers[i]}":"${this.formatField(values[i])}"`;
    }
    return result + "}";
  }

  processBatch(lines) {
    const batchData = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const values = line.split(this.selectedSeparator);
      if (values.length !== this.headers.length) continue;

      batchData.push(this.createObjectString(this.headers, values));

      if (batchData.length >= this.batchSize) {
        // Add comma if not first batch
        const prefix = this.isFirstBatch ? "[" : "";
        this.isFirstBatch = false;
        this.push(prefix + batchData.join(",") + ",");
        batchData.length = 0;
      }
    }

    // Push remaining items
    if (batchData.length > 0) {
      const prefix = this.isFirstBatch ? "[" : "";
      this.isFirstBatch = false;
      this.push(prefix + batchData.join(",") + ",");
    }
  }

  _transform(chunk, encoding, done) {
    try {
      // Add chunk to buffer
      this.buffer += chunk;

      const lastNewLineIndex = this.buffer.lastIndexOf("\n");

      if (lastNewLineIndex === -1) {
        done();
        return;
      }

      const currentChunk = this.buffer.slice(0, lastNewLineIndex);
      this.buffer = this.buffer.slice(lastNewLineIndex + 1);

      if (this.isFirstChunk) {
        this.isFirstChunk = false;
        const lines = currentChunk.split("\n");
        const headerLine = lines.shift();
        this.headers = this.createHeaders(headerLine);

        // Process remaining lines in batch
        if (lines.length > 0) {
          this.processBatch(lines);
        }
      } else {
        this.processBatch(currentChunk.split("\n"));
      }

      done();
    } catch (err) {
      done(err);
    }
  }

  _flush(callback) {
    try {
      if (this.buffer.trim()) {
        const lines = this.buffer.split("\n");
        if (lines.length > 0) {
          this.processBatch(lines);
        }
      }

      // Remove trailing comma and close array
      if (!this.isFirstBatch) {
        this.push("]");
      } else {
        // If no data was processed, push empty array
        this.push("[]");
      }
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

async function parseCSVtoJSON(inputFile, outputFile) {
  const startTime = performance.now();
  const readStream = fs.createReadStream(inputFile, {
    encoding: "utf-8",
  });

  const writeStream = fs.createWriteStream(outputFile, {
    encoding: "utf-8",
  });

  const parse = new parseCSV();

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
