const { Pool } = require("pg");
require("dotenv").config({ path: "../.env" });
const { Logger } = require("./logger");

const logMessage = new Logger();

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

  async initializeDatabase() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS crimes (
          id SERIAL PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          file_name VARCHAR(255),
          data JSON
        );
      `);
    } finally {
      client.release();
    }
  }

  async saveToDatabase(fileName, data) {
    const client = await this.pool.connect();
    try {
      await client.query("INSERT INTO crimes (file_name, data) VALUES ($1, $2::json)", [fileName, data]);
    } finally {
      client.release();
    }
  }
}

module.exports = Database;
