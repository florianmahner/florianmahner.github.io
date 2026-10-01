import fs from "node:fs/promises";
import path from "node:path";
import * as vega from "vega";
import { compile } from "vega-lite";

const COLORS = ["#332288", "#CC6677", "#44AA99", "#DDCC77"];

function chartConfig() {
  return {
    background: "white",
    config: {
      axis: {
        domainColor: "#222222",
        gridColor: "#E4E4E4",
        labelColor: "#222222",
        labelFont: "Arial",
        titleColor: "#222222",
        titleFont: "Arial"
      },
      legend: { labelFont: "Arial", titleFont: "Arial" },
      title: { anchor: "start", color: "#111111", font: "Arial", fontSize: 18 }
    }
  };
}

function linePanel(field, title, color, format, reverse = false) {
  return {
    width: 900,
    height: 210,
    mark: { type: "line", color, strokeWidth: 2 },
    encoding: {
      x: { field: "date", type: "temporal", title: "Date" },
      y: {
        field,
        type: "quantitative",
        title,
        axis: format ? { format } : undefined,
        scale: reverse ? { reverse: true, zero: false } : { zero: true }
      },
      tooltip: [
        { field: "date", type: "temporal", title: "Date" },
        { field, type: "quantitative", title, format }
      ]
    }
  };
}

async function writeChart(spec, outputPath) {
  const runtime = vega.parse(compile({ ...chartConfig(), ...spec }).spec);
  const view = new vega.View(runtime, { renderer: "none" });
  const svg = await view.toSVG();
  view.finalize();
  await fs.writeFile(outputPath, svg);
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function writeCsv(rows, outputPath) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const lines = [columns.join(",")];
  for (const row of rows) lines.push(columns.map(column => csvValue(row[column])).join(","));
  await fs.writeFile(outputPath, `${lines.join("\n")}\n`);
}

export async function generateReports(database, cacheDir, plotDir) {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.mkdir(plotDir, { recursive: true });

  const searchDaily = database.prepare(`
    SELECT date, clicks, impressions, ctr, position
    FROM search_daily ORDER BY date
  `).all();
  const topQueries = database.prepare(`
    SELECT query,
           SUM(clicks) AS clicks,
           SUM(impressions) AS impressions,
           SUM(clicks) / NULLIF(SUM(impressions), 0) AS ctr,
           SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS position
    FROM search_detail
    WHERE query <> ''
    GROUP BY query
    ORDER BY impressions DESC
    LIMIT 20
  `).all();
  const cloudflareDaily = database.prepare(`
    SELECT date, requests, visits, bytes
    FROM cloudflare_daily ORDER BY date
  `).all();

  await writeCsv(searchDaily, path.join(cacheDir, "search_daily.csv"));
  await writeCsv(topQueries, path.join(cacheDir, "search_queries.csv"));
  await writeCsv(cloudflareDaily, path.join(cacheDir, "cloudflare_daily.csv"));

  if (searchDaily.length) {
    await writeChart({
      title: "Search visibility",
      data: { values: searchDaily },
      vconcat: [
        linePanel("impressions", "Impressions", COLORS[0]),
        linePanel("clicks", "Clicks", COLORS[1])
      ]
    }, path.join(plotDir, "search_visibility.svg"));
    await writeChart({
      title: "Search performance",
      data: { values: searchDaily },
      vconcat: [
        linePanel("ctr", "Click-through rate", COLORS[2], ".1%"),
        linePanel("position", "Average position", COLORS[3], ".1f", true)
      ]
    }, path.join(plotDir, "search_performance.svg"));
  }

  if (topQueries.length) {
    await writeChart({
      title: "Top search queries",
      data: { values: topQueries },
      width: 850,
      height: 480,
      mark: { type: "bar", color: COLORS[0] },
      encoding: {
        y: {
          field: "query",
          type: "nominal",
          title: "Query",
          sort: "-x",
          axis: { labelLimit: 300 }
        },
        x: { field: "impressions", type: "quantitative", title: "Impressions" },
        tooltip: [
          { field: "query", type: "nominal", title: "Query" },
          { field: "impressions", type: "quantitative", title: "Impressions" },
          { field: "clicks", type: "quantitative", title: "Clicks" },
          { field: "ctr", type: "quantitative", title: "Click-through rate", format: ".1%" },
          { field: "position", type: "quantitative", title: "Average position", format: ".1f" }
        ]
      }
    }, path.join(plotDir, "top_queries.svg"));
  }

  if (cloudflareDaily.length) {
    await writeChart({
      title: "Website traffic",
      data: { values: cloudflareDaily },
      vconcat: [
        linePanel("visits", "Visits", COLORS[0]),
        linePanel("requests", "Requests", COLORS[1])
      ]
    }, path.join(plotDir, "website_traffic.svg"));
  }

  return {
    searchDays: searchDaily.length,
    searchQueries: topQueries.length,
    cloudflareDays: cloudflareDaily.length
  };
}
