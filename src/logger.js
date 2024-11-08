const fs = require("fs");
const path = require("path");
const Database = require("./database");

class Logger {
  constructor(...logData) {
    this.logData = logData;
    this.shouldSaveToDb = process.argv.includes("--saveDB");
    this.db = this.shouldSaveToDb ? new Database() : null;
  }

  async initialize() {
    if (this.shouldSaveToDb) {
      await this.db.initializeDatabase();
    }
  }

  savingFileName(filename) {
    const result = `${filename}_${this.saveDate()}_${this.saveHours()}`;
    this.logData.unshift(result);
    return result;
  }

  saveDate() {
    const now = new Date();
    return now.toDateString().replace(/\s+/g, "-");
  }

  saveHours() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return `${hours}h:${minutes}m:${seconds}s`;
  }

  getTimestamp() {
    return new Date();
  }

  async log(level, message) {
    const timestamp = this.getTimestamp();
    const logMessage = `${this.saveDate()}; ${this.saveHours()}; ${level}; ${message}`;
    this.logData.push(logMessage);

    if (this.shouldSaveToDb) {
      try {
        await this.db.saveLog(timestamp, level, message);
      } catch (error) {
        console.error("Failed to save log to database:", error);
      }
    }
  }

  async close() {
    if (this.shouldSaveToDb && this.db) {
      await this.db.finalizeBatch();
    }
  }

  async info(message) {
    await this.log("INFO", message);
  }

  async warning(message) {
    await this.log("WARNING", message);
  }

  async error(message) {
    await this.log("ERROR", message);
  }

  async success(message) {
    await this.log("SUCCESS", message);
  }

  getData() {
    return this.logData;
  }
}

module.exports = { Logger };
