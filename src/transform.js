const fs = require("fs");
const fsPromises = require("fs").promises;
const { Transform } = require("stream");
const { pipeline } = require("stream/promises");
const { performance } = require("perf_hooks");
const { EOL } = require("os");
const { Logger } = require("./logger");
const Database = require("./database");

const logMessage = new Logger();
const db = new Database();

class DatabaseStream extends Transform {
  constructor(fileName) {
    super();
    this.fileName = fileName;
    this.jsonData = "";
  }

  _transform(chunk, encoding, callback) {
    this.jsonData += chunk.toString();
    this.push(chunk);
    callback();
  }

  async _final(callback) {
    try {
      await db.saveToDatabase(this.fileName, this.jsonData);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

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

        logMessage.info(`Headers created with separator: "${this.selectedSeparator}"`);
        logMessage.info(`Found ${this.headers.length} columns: ${this.headers.join(", ")}`);

        return this.headers;
      }
    }
    logMessage.warning("No valid separator found in headers");

    this.headers = [];
    return this.headers;
  }

  createObjectString(headers, values) {
    const orderedPairs = [];
    for (let i = 0; i < headers.length; i++) {
      orderedPairs.push(`"${headers[i]}":"${this.formatField(values[i])}"`);
    }
    return "{" + orderedPairs.join(",") + "}";
  }

  _transform(chunk, encoding, done) {   const prefix = this.isFirstBatch ? "[" : ",";
    try {
      const str = chunk.toString();
      const data = this.buffer + str;
      const lines = data.split(EOL);

      if (this.isFirstBatch) {
        logMessage.info(`Processing first batch of data`);
      }

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

async function parseCSVtoJSON(inputFile, outputFile, fileName, saveDB = false) {
  const startTime = performance.now();
  const readStream = fs.createReadStream(inputFile);
  const writeStream = fs.createWriteStream(outputFile);
  const parse = new ParseCSV();

  let endTime;
  let duration;

  readStream.on("error", async (error) => {
    if (error.code === "ENOENT") {
      console.error(`\nError: "${fileName}.csv" does not exist in the csv-data folder. Please check the file name and try again.\n`);
      await logMessage.error(`Error: "${fileName}.csv" does not exist in the csv-data folder. Please check the file name and try again.`);
      process.exit(1);
    }
  });

  try {
    if (saveDB) {
      const dbStream = new DatabaseStream(fileName);
      await pipeline(readStream, parse, dbStream, writeStream);
    } else {
      await pipeline(readStream, parse, writeStream);
    }

    endTime = performance.now();
    duration = endTime - startTime;

    const message = saveDB ? "Conversion completed and file saved to database!" : "Conversion to JSON was completed successfully!";
    logMessage.success(message);
    logMessage.success(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
  } catch (err) {
    logMessage.error("Conversion failed:", err.message);
    throw err;
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

async function main() {
  const fileName = process.argv[2];
  const saveDB = process.argv.includes("--saveDB");

  try {
    if (saveDB) {
      await db.initializeDatabase();
      logMessage.info("Database initialized for crimes data");
    }

    if (fileName) {
      await parseCSVtoJSON(`../csv-data/${fileName}.csv`, `../dataJSON/${logMessage.savingFileName(fileName)}.json`, fileName, saveDB);
      await saveLogFile(logMessage.savingFileName(fileName), logMessage.getData());
    }

    await db.finalizeBatch();
  } catch (err) {
    logMessage.error("Error in main process:", err.message);
    process.exit(1);
  }
}

main();
