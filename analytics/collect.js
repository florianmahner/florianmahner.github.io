import fs from "node:fs/promises";
import { GoogleAuth } from "google-auth-library";

const SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SEARCH_ROW_LIMIT = 25_000;

export function addDays(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function currentDate(daysFromToday = 0) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysFromToday);
  return value.toISOString().slice(0, 10);
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function authorizeSearchConsole(serviceAccountPath) {
  if (!(await fileExists(serviceAccountPath))) {
    throw new Error(`Google service-account key not found at ${serviceAccountPath}`);
  }
  return new GoogleAuth({
    keyFile: serviceAccountPath,
    scopes: [SEARCH_SCOPE]
  }).getClient();
}

async function querySearchConsole(client, siteUrl, startDate, endDate, dimensions) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; ; startRow += SEARCH_ROW_LIMIT) {
    const response = await client.request({
      url,
      method: "POST",
      data: {
        startDate,
        endDate,
        dimensions,
        type: "web",
        dataState: "final",
        rowLimit: SEARCH_ROW_LIMIT,
        startRow
      }
    });
    const page = response.data.rows ?? [];
    rows.push(...page);
    if (page.length < SEARCH_ROW_LIMIT) break;
  }
  return rows;
}

export async function collectSearchConsole(client, siteUrl, startDate, endDate) {
  const [dailyResponse, detailResponse] = await Promise.all([
    querySearchConsole(client, siteUrl, startDate, endDate, ["date"]),
    querySearchConsole(client, siteUrl, startDate, endDate, ["date", "query", "page", "country", "device"])
  ]);
  const daily = dailyResponse.map(row => ({
    date: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position
  }));
  const detail = detailResponse.map(row => ({
    date: row.keys[0],
    query: row.keys[1] ?? "",
    page: row.keys[2] ?? "",
    country: row.keys[3] ?? "",
    device: row.keys[4] ?? "",
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: row.position
  }));
  return { daily, detail };
}

async function resolveCloudflareZone(token, hostname) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(hostname)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok || !body.success || !body.result?.length) {
    throw new Error(`Could not resolve Cloudflare zone: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.result[0].id;
}

async function queryCloudflareDay(token, zoneId, hostname, date) {
  const query = `
    query Traffic($zoneTag: string, $filter: filter) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          groups: httpRequestsAdaptiveGroups(limit: 100, filter: $filter) {
            count
            sum { visits edgeResponseBytes }
            dimensions { datetimeHour }
          }
        }
      }
    }
  `;
  const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query,
      variables: {
        zoneTag: zoneId,
        filter: {
          datetime_geq: `${date}T00:00:00Z`,
          datetime_lt: `${addDays(date, 1)}T00:00:00Z`,
          clientRequestHTTPHost: hostname,
          requestSource: "eyeball"
        }
      }
    })
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) {
    throw new Error(`Cloudflare Analytics query failed: ${JSON.stringify(body.errors ?? body)}`);
  }
  const groups = body.data?.viewer?.zones?.[0]?.groups ?? [];
  return {
    date,
    requests: groups.reduce((total, group) => total + (group.count ?? 0), 0),
    visits: groups.reduce((total, group) => total + (group.sum?.visits ?? 0), 0),
    bytes: groups.reduce((total, group) => total + (group.sum?.edgeResponseBytes ?? 0), 0)
  };
}

export async function collectCloudflare(token, configuredZoneId, hostname, startDate, endDate) {
  const zoneId = configuredZoneId || await resolveCloudflareZone(token, hostname);
  const rows = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    rows.push(await queryCloudflareDay(token, zoneId, hostname, date));
  }
  return rows;
}
