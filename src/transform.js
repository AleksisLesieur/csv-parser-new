const fs = require('fs');
const fsPromises = require('fs').promises;
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { performance } = require('perf_hooks');
const { Logger } = require('./logger');
const Database = require('./database');
const path = require('path');

console.log('🚀 CSV Parser starting...');

const logMessage = new Logger('Initial log entry');
const db = new Database();
const directLogs = ['Processing started'];

class DatabaseStream extends Transform {
  constructor(fileName) {
    super();
    this.fileName = fileName;
    this.jsonData = '';
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
    this.separators = [',', ';', '|', '\t'];
    this.selectedSeparator = '';
    this.buffer = '';

    // Progress tracking
    this.totalBytes = 0;
    this.processedBytes = 0;
    this.lastProgressUpdate = 0;

    console.log('📊 CSV Parser initialized');
    logMessage.info('CSV Parser initialized');
    directLogs.push(`CSV Parser initialized at ${new Date().toISOString()}`);
  }

  setTotalBytes(total) {
    this.totalBytes = total;
    console.log(`📏 File size: ${(total / 1024 / 1024).toFixed(2)} MB`);
  }

  updateProgress(chunkSize) {
    this.processedBytes += chunkSize;
    const progressPercent = Math.floor((this.processedBytes / this.totalBytes) * 100);

    // Update progress bar in real-time (every 1% or every chunk for smaller files)
    const processedMB = (this.processedBytes / 1024 / 1024).toFixed(2);
    const totalMB = (this.totalBytes / 1024 / 1024).toFixed(2);

    // Create progress bar
    const barLength = 30;
    const filledLength = Math.floor((progressPercent / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    // Clear line and print progress bar
    process.stdout.write(`\r🔄 Processing: [${bar}] ${progressPercent}% (${processedMB}/${totalMB} MB)`);

    // Print newline when complete and show header info
    if (progressPercent >= 100) {
      process.stdout.write('\n✅ Processing complete!\n');

      // Show header info after progress is done
      if (this.headerInfo) {
        console.log(`✅ Headers created with separator: "${this.headerInfo.separator}"`);
        console.log(`✅ Found ${this.headerInfo.count} columns`);
      }
    }
  }

  formatField(value) {
    if (!value) return '';

    let cleaned = value.trim();

    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    return cleaned;
  }

  createHeaders(values) {
    if (!values || typeof values !== 'string') {
      // Removed console.log to avoid interfering with progress bar
      logMessage.warning('No headers found or invalid header format');
      directLogs.push(`Warning: No headers found or invalid header format`);
      return;
    }

    for (const separator of this.separators) {
      if (values.includes(separator)) {
        this.selectedSeparator = separator;
        this.headers = values.split(separator).map((h) => h.trim());

        // Show headers info after progress bar completes
        // Store for later display
        this.headerInfo = {
          separator: this.selectedSeparator,
          count: this.headers.length,
          columns: this.headers.join(', '),
        };

        logMessage.info(`Headers created with separator: "${this.selectedSeparator}"`);
        logMessage.info(`Found ${this.headers.length} columns: ${this.headers.join(', ')}`);
        directLogs.push(`Headers created with separator: "${this.selectedSeparator}"`);
        directLogs.push(`Found ${this.headers.length} columns: ${this.headers.join(', ')}`);

        return this.headers;
      }
    }

    logMessage.warning('No valid separator found in headers');
    directLogs.push(`Warning: No valid separator found in headers`);

    this.headers = [];
    return this.headers;
  }

  createObjectString(headers, values) {
    const orderedPairs = [];
    for (let i = 0; i < headers.length; i++) {
      const formattedValue = this.formatField(values[i]);
      orderedPairs.push(`"${headers[i]}":"${formattedValue}"`);
    }

    const result = '{' + orderedPairs.join(',') + '}';
    return result;
  }

  _transform(chunk, encoding, done) {
    try {
      // Update progress
      this.updateProgress(chunk.length);

      const str = chunk.toString();
      const data = this.buffer + str;
      // Fixed: Use universal line endings instead of OS-specific EOL
      const lines = data.split(/\r?\n/);

      if (this.isFirstBatch) {
        // Removed console.log to avoid interfering with progress bar
        logMessage.info(`Processing first batch of data`);
        directLogs.push(`Processing first batch of data at ${new Date().toISOString()}`);
      }

      this.buffer = lines.pop();

      if (!this.isHeadersCreated && lines.length > 0) {
        const headerLine = lines.shift();
        this.createHeaders(headerLine);
        this.isHeadersCreated = true;
      }

      const validLines = lines.filter((line) => line.trim());

      if (validLines.length > 0) {
        const prefix = this.isFirstBatch ? '[' : ',';
        this.isFirstBatch = false;

        const jsonData = validLines
          .map((line) => {
            const values = line.split(this.selectedSeparator);

            if (values.length !== this.headers.length) {
              if (values.length > this.headers.length) {
                throw new Error('there are more values than headers!');
              }
              if (values.length < this.headers.length) {
                throw new Error('there are more headers than values!');
              }
            }

            return this.createObjectString(this.headers, values);
          })
          .join(',');

        if (jsonData) {
          this.push(prefix + jsonData);
        }
      }

      done();
    } catch (err) {
      console.error('❌ Error during transform:', err.message);
      directLogs.push(`Error during transform: ${err.message}`);
      this.emit('error', new Error(err));
      done(err);
    }
  }

  _flush(done) {
    try {
      if (this.buffer && this.buffer.trim()) {
        const prefix = this.isFirstBatch ? '[' : ',';
        const values = this.buffer.split(this.selectedSeparator);
        const jsonData = this.createObjectString(this.headers, values);
        this.push(prefix + jsonData);
      }

      this.push(']');
      done();
    } catch (error) {
      console.error('❌ Error during flush:', error.message);
      directLogs.push(`Error during flush: ${error.message}`);
      this.emit('error', error instanceof Error ? error : new Error(error));
      done(error);
    }
  }
}

async function parseCSVtoJSON(inputFile, outputFile, fileName, saveDB = false) {
  console.log(`🔄 Starting CSV to JSON conversion for file: ${fileName}`);
  directLogs.push(`Starting CSV to JSON conversion for file: ${fileName}`);

  try {
    // Fixed: Removed problematic path replacement, use paths as-is
    const fileStats = await fsPromises.stat(inputFile);
    const fileSize = fileStats.size;

    await fsPromises.access(inputFile);
    console.log(`✅ Input file found: ${inputFile}`);
    console.log(`📏 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    directLogs.push(`Input file found: ${inputFile}`);

    const outputDir = path.dirname(outputFile);
    try {
      await fsPromises.mkdir(outputDir, { recursive: true });
      console.log(`✅ Output directory ready: ${outputDir}`);
      directLogs.push(`Created output directory: ${outputDir}`);

      // Verify directory exists
      const dirExists = fs.existsSync(outputDir);
      console.log(`✅ Directory verification: ${dirExists ? 'EXISTS' : 'MISSING'}`);
      if (!dirExists) {
        throw new Error(`Failed to create directory: ${outputDir}`);
      }
    } catch (dirErr) {
      console.error(`❌ Error creating directory: ${dirErr.message}`);
      directLogs.push(`Error creating directory: ${dirErr.message}`);
      throw dirErr;
    }
  } catch (error) {
    console.error(`❌ File not found: ${inputFile}`);
    directLogs.push(`Error: File not found: ${inputFile}`);
    await logMessage.error(`Error: "${fileName}" does not exist in the csv-data folder. Please check the file name and try again.`);
    process.exit(1);
  }

  const startTime = performance.now();

  const readStream = fs.createReadStream(inputFile);
  const writeStream = fs.createWriteStream(outputFile);
  const parse = new ParseCSV();

  // Set total file size for progress tracking
  const fileStats = await fsPromises.stat(inputFile);
  parse.setTotalBytes(fileStats.size);

  readStream.on('error', async (error) => {
    console.error('❌ Read stream error:', error.message);
    directLogs.push(`Read stream error: ${error.message}`);
    if (error.code === 'ENOENT') {
      await logMessage.error(`Error: "${fileName}" does not exist in the csv-data folder. Please check the file name and try again.`);
      process.exit(1);
    } else {
      await logMessage.error(`Error reading file: ${error.message}`);
      process.exit(1);
    }
  });

  writeStream.on('error', async (error) => {
    console.error('❌ Write stream error:', error.message);
    directLogs.push(`Write stream error: ${error.message}`);
    await logMessage.error(`Error writing to file: ${error.message}`);
    process.exit(1);
  });

  try {
    console.log('🔄 Starting pipeline...');

    if (saveDB) {
      console.log('💾 Using DatabaseStream to save to database');
      directLogs.push(`Using DatabaseStream to save to database`);
      const dbStream = new DatabaseStream(fileName);
      await pipeline(readStream, parse, dbStream, writeStream);
    } else {
      console.log('📄 Processing without database save');
      directLogs.push(`Processing without database save`);
      await pipeline(readStream, parse, writeStream);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`✅ Processing completed in ${(duration / 1000).toFixed(2)} seconds`);
    directLogs.push(`Processing completed in ${(duration / 1000).toFixed(2)} seconds`);

    const message = saveDB ? 'Conversion completed and file saved to database!' : 'Conversion to JSON was completed successfully!';
    console.log(`🎉 ${message}`);
    await logMessage.success(message);
    await logMessage.success(`Time taken: ${(duration / 1000).toFixed(2)} seconds`);
  } catch (err) {
    console.error('❌ Conversion failed:', err.message);
    directLogs.push(`Conversion failed: ${err.message}`);
    await logMessage.error(`Conversion failed: ${err.message}`);
    throw err;
  }
}

async function createDirectLogFile(fileName, logs) {
  try {
    const logDir = path.resolve(process.cwd(), '..', 'dataLog');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = path.join(logDir, `${fileName}.log`);
    const logContent = [`Log created at: ${new Date().toISOString()}`, `Processing file: ${fileName}`, '----------------------------', ...logs].join('\n');

    await fsPromises.writeFile(logPath, logContent);
    console.log(`✅ Direct log file created: ${logPath}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to create direct log file: ${err.message}`);
    return false;
  }
}

async function saveLogFile(logFileName, saveFile) {
  console.log(`📝 Saving log file: ${logFileName}`);
  directLogs.push(`Attempting to save log file: ${logFileName}`);

  let logContent = '';

  if (saveFile && saveFile.length > 0) {
    logContent = saveFile.join('\n');
    directLogs.push(`Using ${saveFile.length} log entries from Logger`);
    console.log(`📝 Using ${saveFile.length} log entries from Logger`);
  } else {
    logContent = `Log file created for ${logFileName} at ${new Date().toISOString()}\nNo logs were collected using the Logger class`;
    directLogs.push(`No logs available from Logger, using default content`);
    console.log('📝 No logs available from Logger, using default content');
  }

  try {
    const logDir = path.resolve(process.cwd(), '..', 'dataLog');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      directLogs.push(`Created log directory: ${logDir}`);
      console.log(`✅ Created log directory: ${logDir}`);
    }

    const logPath = path.join(logDir, `${logFileName}.log`);
    directLogs.push(`Writing log to: ${logPath}`);

    await fsPromises.writeFile(logPath, logContent);
    directLogs.push(`Log file written successfully`);
    console.log(`✅ Log file written successfully: ${logPath}`);

    await logMessage.success('Log file has been saved successfully');
    return true;
  } catch (err) {
    console.error('❌ Error writing log file:', err.message);
    directLogs.push(`Error writing log file: ${err.message}`);
    await logMessage.error(`Error writing to log file: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 Main function started');

  let fileName = process.argv[2];
  console.log('📝 Processing file:', fileName);
  directLogs.push(`Starting processing for file: ${fileName}`);

  const saveDB = process.argv.includes('--saveDB');
  console.log('💾 Save to database:', saveDB);
  directLogs.push(`Save to database: ${saveDB}`);

  try {
    if (saveDB) {
      console.log('💾 Initializing database...');
      await db.initializeDatabase();
      await logMessage.info('Database initialized for crimes data');
      directLogs.push(`Database initialized for crimes data`);
      console.log('✅ Database initialized');
    }

    if (fileName) {
      if (fileName.endsWith('.csv')) {
        fileName = fileName.slice(0, -4);
        console.log('📁 Cleaned filename:', fileName);
        directLogs.push(`Removed .csv extension, filename is now: ${fileName}`);
      }

      const inputFile = path.resolve('..', 'csv-data', `${fileName}.csv`);

      // Fixed: Use simple filename without timestamp
      const savingFileName = fileName;

      console.log('📁 Output filename:', savingFileName);
      directLogs.push(`Using output filename: ${savingFileName}`);

      const outputFile = path.resolve('..', 'dataJSON', `${savingFileName}.json`);

      console.log('📂 Input file:', inputFile);
      console.log('📄 Output file:', outputFile);

      await parseCSVtoJSON(inputFile, outputFile, fileName, saveDB);
      console.log('✅ CSV processing completed');
      directLogs.push(`CSV processing completed`);

      console.log('📝 Handling log files...');
      try {
        const logData = logMessage.getData();
        directLogs.push(`Retrieved log data, entries: ${logData ? logData.length : 'none'}`);

        const success = await saveLogFile(savingFileName, logData);
        if (!success) {
          throw new Error('Failed to save log file using Logger');
        }
        console.log('✅ Log file saved successfully');
      } catch (logErr) {
        console.log('⚠️ Logger error, using direct logs:', logErr.message);
        directLogs.push(`Error with Logger logs: ${logErr.message}, using direct logs`);
        await createDirectLogFile(savingFileName, directLogs);
      }
    } else {
      console.error('❌ No filename provided');
      directLogs.push(`No filename provided`);
      process.exit(1);
    }

    console.log('🔄 Finalizing database...');
    await db.finalizeBatch();
    directLogs.push(`Database batch finalized`);
    console.log('✅ Database finalized');

    console.log('🎉 ALL OPERATIONS COMPLETED SUCCESSFULLY!');

    // Fixed: Explicit exit to prevent hanging
    process.exit(0);
  } catch (err) {
    console.error('❌ Error in main function:', err.message);
    console.error('Stack:', err.stack);
    directLogs.push(`Error in main function: ${err.message}`);

    if (fileName) {
      const errorLogFileName = `${fileName}_error_${Date.now()}`;
      console.log('📝 Creating error log file...');
      await createDirectLogFile(errorLogFileName, [`Error processing file ${fileName}`, `Error: ${err.message}`, `Stack: ${err.stack}`, ...directLogs]);
    }
    process.exit(1);
  }
}

// Fixed: Simplified error handling and explicit exit
console.log('🎬 Starting main execution...');
main().catch((err) => {
  console.error('❌ FATAL ERROR:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
