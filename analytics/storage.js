import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function openDatabase(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS search_daily (
      date TEXT PRIMARY KEY,
      clicks REAL NOT NULL,
      impressions REAL NOT NULL,
      ctr REAL NOT NULL,
      position REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS search_detail (
      date TEXT NOT NULL,
      query TEXT NOT NULL,
      page TEXT NOT NULL,
      country TEXT NOT NULL,
      device TEXT NOT NULL,
      clicks REAL NOT NULL,
      impressions REAL NOT NULL,
      ctr REAL NOT NULL,
      position REAL NOT NULL,
      PRIMARY KEY (date, query, page, country, device)
    );
    CREATE TABLE IF NOT EXISTS cloudflare_daily (
      date TEXT PRIMARY KEY,
      requests INTEGER NOT NULL,
      visits INTEGER NOT NULL,
      bytes INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS collection_runs (
      id INTEGER PRIMARY KEY,
      source TEXT NOT NULL,
      collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      rows INTEGER NOT NULL
    );
  `);
  return database;
}

function transact(database, operation) {
  database.exec("BEGIN IMMEDIATE");
  try {
    operation();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function lastDate(database, table) {
  const allowedTables = new Set(["search_daily", "cloudflare_daily"]);
  if (!allowedTables.has(table)) throw new Error(`Unsupported table: ${table}`);
  return database.prepare(`SELECT MAX(date) AS date FROM ${table}`).get().date;
}

export function replaceSearchData(database, startDate, endDate, dailyRows, detailRows) {
  const deleteDaily = database.prepare("DELETE FROM search_daily WHERE date BETWEEN ? AND ?");
  const deleteDetail = database.prepare("DELETE FROM search_detail WHERE date BETWEEN ? AND ?");
  const insertDaily = database.prepare(`
    INSERT INTO search_daily (date, clicks, impressions, ctr, position)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertDetail = database.prepare(`
    INSERT INTO search_detail (date, query, page, country, device, clicks, impressions, ctr, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  transact(database, () => {
    deleteDaily.run(startDate, endDate);
    deleteDetail.run(startDate, endDate);
    for (const row of dailyRows) {
      insertDaily.run(row.date, row.clicks, row.impressions, row.ctr, row.position);
    }
    for (const row of detailRows) {
      insertDetail.run(
        row.date,
        row.query,
        row.page,
        row.country,
        row.device,
        row.clicks,
        row.impressions,
        row.ctr,
        row.position
      );
    }
  });
}

export function replaceCloudflareData(database, startDate, endDate, rows) {
  const remove = database.prepare("DELETE FROM cloudflare_daily WHERE date BETWEEN ? AND ?");
  const insert = database.prepare(`
    INSERT INTO cloudflare_daily (date, requests, visits, bytes)
    VALUES (?, ?, ?, ?)
  `);
  transact(database, () => {
    remove.run(startDate, endDate);
    for (const row of rows) insert.run(row.date, row.requests, row.visits, row.bytes);
  });
}

export function recordCollection(database, source, startDate, endDate, rows) {
  database.prepare(`
    INSERT INTO collection_runs (source, start_date, end_date, rows)
    VALUES (?, ?, ?, ?)
  `).run(source, startDate, endDate, rows);
}
