const fs = require("fs");
const fsPromises = require("fs").promises;
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");

const { performance } = require("perf_hooks");
const { EOL } = require("os");

const { Logger } = require("./logger");

const logMessage = new Logger();

// class CSVParserError extends Error {
//   constructor(message, originalError = null) {
//     super(message);
//     this.name = "CSVParserError";
//     this.originalError = originalError;
//   }
// }

// class HeaderValidationError extends CSVParserError {
//   constructor(message) {
//     super(message);
//     this.name = "HeaderValidationError";
//   }
// }

class ParseCSV extends Transform {
  constructor() {
    super({ highWaterMark: 1024 * 1024 });
    this.isHeadersCreated = false;
    this.headers = null;
    this.isFirstBatch = true;
    this.separators = [",", ";", "|", "\t"];
    this.selectedSeparator = "";
    this.buffer = "";

    logMessage.info("CSV Parser initialized");
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
      logMessage.warning("No headers found or invalid header format");

      return;
    }

    for (const separator of this.separators) {
      if (values.includes(separator)) {
        this.selectedSeparator = separator;
        this.headers = values.split(separator).map((h) => h.trim());

        logMessage.info(`Headers created with separator: "${this.selectedSeparator}"`); // Added
        logMessage.info(`Found ${this.headers.length} columns: ${this.headers.join(", ")}`); // Added

        return this.headers;
      }
    }
    logMessage.warning("No valid separator found in headers");

    this.headers = [];
    return this.headers;
  }

  createObjectString(headers, values) {
    const pairs = headers.map((header, i) => `"${header}":"${this.formatField(values[i])}"`);
    return "{" + pairs.join(",") + "}";
  }

  _transform(chunk, encoding, done) {
    try {
      // this.emit("error");
      const str = chunk.toString();
      const data = this.buffer + str;
      const lines = data.split(EOL);

      if (this.isFirstBatch) {
        logMessage.info(`Processing first batch of data`); // Added
      }

      // this.emit("error", "error exists");

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

        // if (validLines.length !== this.headers.length) {
        //   if (validLines.length > this.headers.length) {
        //     throw new Error("there are more values than headers!");
        //   }
        //   if (validLines.length < this.headers.length) {
        //     throw new Error("there are more headers than values!");
        //   }
        // }

        const jsonData = validLines
          .map((line) => {
            const values = line.split(this.selectedSeparator);

            // handling errors

            if (values.length !== this.headers.length) {
              if (values.length > this.headers.length) {
                throw new Error("there are more values than headers!");
              }
              if (values.length < this.headers.length) {
                throw new Error("there are more headers than values!");
              }
            }

            return this.createObjectString(this.headers, values);
          })
          .join(",");

        if (jsonData) {
          this.push(prefix + jsonData);
        }
      }

      done();
    } catch (err) {
      this.emit("error", new Error(err));
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
      this.emit("error", new Error(err));
      done(error);
    }
  }
}

async function parseCSVtoJSON(inputFile, outputFile) {
  const startTime = performance.now();
  const readStream = fs.createReadStream(inputFile);

  logMessage.info("Conversion start time");
  logMessage.info(`Reading file: ${inputFile}`); // Added
  logMessage.info(`Output will be saved to: ${outputFile}`);

  const writeStream = fs.createWriteStream(outputFile);

  const parse = new ParseCSV();

  try {
    await pipeline(readStream, parse, writeStream);

    const endTime = performance.now();
    const duration = endTime - startTime;

    logMessage.success("Conversion completed successfully!");
    logMessage.success(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
    logMessage.info(`File size processed: ${(fs.statSync(inputFile).size / 1024 / 1024 / 1024).toFixed(2)} GB`); // Added
    logMessage.info(`Output JSON size: ${(fs.statSync(outputFile).size / 1024 / 1024 / 1024).toFixed(2)} GB`); // Added
    logMessage.info("Memory usage: " + (process.memoryUsage().heapUsed / 1024 / 1024 / 1024).toFixed(2) + " GB"); // Added
  } catch (err) {
    logMessage.error(`Stack trace: ${err.message}`); // Added
    writeStream.end();
  }
}

async function saveLogFile(logFileName, saveFile) {
  const logContent = saveFile.slice(2).join("\n");

  try {
    await fsPromises.writeFile(`../dataLog/${logFileName}.log`, logContent);
    logMessage.success("Log file has been saved successfully");
  } catch (err) {
    logMessage.error("Error writing to log file:", err);
  }
}

// Main execution
const fileName = process.argv[2];

async function main() {
  try {
    await parseCSVtoJSON(`../csv-data/${fileName}.csv`, `../dataJSON/${logMessage.savingFileName(fileName)}.json`);
    await saveLogFile(logMessage.savingFileName(fileName), logMessage.getData());
  } catch (err) {
    logMessage.error("Error in main process:", err.message);
  }
}

main();

// gali pasirasyti duplex streama
// db butu per flaga, jog irasytu i duombaze tik kai paduodu i terminala node transform.js [filename] --saveTODB
