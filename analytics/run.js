import fs from "node:fs/promises";
import path from "node:path";
import {
  addDays,
  authorizeSearchConsole,
  collectCloudflare,
  collectSearchConsole,
  currentDate,
  fileExists
} from "./collect.js";
import { generateReports } from "./report.js";
import {
  lastDate,
  openDatabase,
  recordCollection,
  replaceCloudflareData,
  replaceSearchData
} from "./storage.js";

function collectionStart(database, table, initialDays, refreshDays) {
  const latest = lastDate(database, table);
  return latest ? addDays(latest, -refreshDays) : currentDate(-initialDays);
}

async function collectGoogle(database, projectDir, hostname, explicit) {
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT
    ? path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT)
    : path.join(projectDir, "analytics", "credentials", "google-service-account.json");
  if (!(await fileExists(serviceAccountPath))) {
    if (explicit) throw new Error(`Add a Google service-account key at ${serviceAccountPath}`);
    console.log("Search Console: skipped (Google credentials not configured)");
    return;
  }

  const endDate = currentDate(-2);
  const startDate = collectionStart(database, "search_daily", 480, 7);
  const client = await authorizeSearchConsole(serviceAccountPath);
  const rows = await collectSearchConsole(client, `sc-domain:${hostname}`, startDate, endDate);
  replaceSearchData(database, startDate, endDate, rows.daily, rows.detail);
  recordCollection(database, "search_console", startDate, endDate, rows.daily.length + rows.detail.length);
  console.log(`Search Console: ${rows.daily.length} daily and ${rows.detail.length} detailed rows`);
}

async function collectCloudflareTraffic(database, hostname, explicit) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    if (explicit) throw new Error("Set CLOUDFLARE_API_TOKEN in .env.local");
    console.log("Cloudflare: skipped (API token not configured)");
    return;
  }

  const endDate = currentDate(-1);
  const startDate = collectionStart(database, "cloudflare_daily", 29, 2);
  const rows = await collectCloudflare(
    token,
    process.env.CLOUDFLARE_ZONE_ID,
    hostname,
    startDate,
    endDate
  );
  replaceCloudflareData(database, startDate, endDate, rows);
  recordCollection(database, "cloudflare", startDate, endDate, rows.length);
  console.log(`Cloudflare: ${rows.length} daily rows`);
}

async function main() {
  const commands = new Set(["all", "google", "cloudflare", "plot"]);
  const command = process.argv[2] ?? "all";
  if (!commands.has(command)) throw new Error(`Unknown command: ${command}`);

  const projectDir = process.cwd();
  const site = JSON.parse(await fs.readFile(path.join(projectDir, "_data", "site.json"), "utf8"));
  const hostname = new URL(site.url).hostname;
  const cacheDir = path.join(projectDir, "analytics", "cache");
  const plotDir = path.join(projectDir, "analytics", "plot");
  const database = openDatabase(path.join(cacheDir, "analytics.sqlite3"));

  try {
    if (command === "all" || command === "google") {
      await collectGoogle(database, projectDir, hostname, command === "google");
    }
    if (command === "all" || command === "cloudflare") {
      await collectCloudflareTraffic(database, hostname, command === "cloudflare");
    }
    const summary = await generateReports(database, cacheDir, plotDir);
    console.log(
      `Reports: ${summary.searchDays} search days, ${summary.searchQueries} top queries, ` +
      `${summary.cloudflareDays} traffic days`
    );
  } finally {
    database.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
