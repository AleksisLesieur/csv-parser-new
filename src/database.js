const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });
const fs = require("fs").promises;
const path = require("path");

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_DATABASE,
    });
  }

  async loadSqlFile(filename) {
    return await fs.readFile(path.join(__dirname, "queries", filename), "utf-8");
  }

  async initializeDatabase() {
    const client = await this.pool.connect();
    try {
      const initQuery = await this.loadSqlFile("init.sql");
      await client.query(initQuery);
    } finally {
      client.release();
    }
  }

  async saveToDatabase(fileName, data) {
    const client = await this.pool.connect();
    try {
      const insertQuery = await this.loadSqlFile("insert_crime.sql");
      await client.query(insertQuery, [fileName, data]);
    } finally {
      client.release();
    }
  }

  async saveLog(timestamp, level, message) {
    const client = await this.pool.connect();
    try {
      const insertLogQuery = await this.loadSqlFile("insert_log.sql");
      await client.query(insertLogQuery, [timestamp, level, message]);
    } finally {
      client.release();
    }
  }

  async finalizeBatch() {
    await this.pool.end();
  }
}

module.exports = Database;
