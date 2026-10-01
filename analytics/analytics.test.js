import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { addDays } from "./collect.js";
import { generateReports } from "./report.js";
import {
  lastDate,
  openDatabase,
  replaceCloudflareData,
  replaceSearchData
} from "./storage.js";

test("date arithmetic crosses month boundaries", () => {
  assert.equal(addDays("2026-08-31", 1), "2026-09-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("analytics persist and render as SVG", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "website-analytics-"));
  const cacheDir = path.join(directory, "cache");
  const plotDir = path.join(directory, "plot");
  const database = openDatabase(path.join(cacheDir, "analytics.sqlite3"));

  try {
    replaceSearchData(database, "2026-08-29", "2026-08-31", [
      { date: "2026-08-29", clicks: 2, impressions: 40, ctr: 0.05, position: 8.2 },
      { date: "2026-08-30", clicks: 3, impressions: 55, ctr: 3 / 55, position: 7.8 },
      { date: "2026-08-31", clicks: 5, impressions: 70, ctr: 5 / 70, position: 6.4 }
    ], [
      {
        date: "2026-08-31",
        query: "florian mahner",
        page: "https://florianmahner.com/",
        country: "deu",
        device: "desktop",
        clicks: 5,
        impressions: 20,
        ctr: 0.25,
        position: 1.2
      }
    ]);
    replaceCloudflareData(database, "2026-08-29", "2026-08-31", [
      { date: "2026-08-29", requests: 120, visits: 20, bytes: 42_000 },
      { date: "2026-08-30", requests: 150, visits: 24, bytes: 49_000 },
      { date: "2026-08-31", requests: 180, visits: 31, bytes: 57_000 }
    ]);

    assert.equal(lastDate(database, "search_daily"), "2026-08-31");
    const summary = await generateReports(database, cacheDir, plotDir);
    assert.deepEqual(summary, { searchDays: 3, searchQueries: 1, cloudflareDays: 3 });

    for (const filename of [
      "search_visibility.svg",
      "search_performance.svg",
      "top_queries.svg",
      "website_traffic.svg"
    ]) {
      assert.match(await fs.readFile(path.join(plotDir, filename), "utf8"), /^<svg/);
    }
  } finally {
    database.close();
    await fs.rm(directory, { recursive: true, force: true });
  }
});
