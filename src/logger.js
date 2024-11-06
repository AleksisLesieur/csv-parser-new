const fs = require("fs");
const path = require("path");

class Logger {
  constructor(...logData) {
    this.logData = logData;
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

  info(message) {
    this.logData.push(`${this.saveDate()}; ${this.saveHours()}; INFO; ${message}`);
  }

  warning(message) {
    this.saveDate();
    this.logData.push(`${this.saveDate()}; ${this.saveHours()}; WARNING; ${message}`);
  }

  error(message) {
    this.saveDate();
    this.logData.push(`${this.saveDate()}; ${this.saveHours()}; ERROR; ${message}`);
  }

  success(message) {
    this.saveDate();
    this.logData.push(`${this.saveDate()}; ${this.saveHours()}; SUCCESS; ${message}`);
  }

  getData() {
    return this.logData;
  }
}

module.exports = { Logger };
