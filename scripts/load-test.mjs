#!/usr/bin/env node

const HELP = `
Usage:
  npm run loadtest -- --url <endpoint> [options]

Options:
  --url <url>                 Target URL (required)
  --requests <number>         Total request count (default: 2000)
  --concurrency <number>      Parallel workers (default: 200)
  --method <verb>             HTTP method (default: GET)
  --header "Key: Value"       Header, can be repeated
  --body '<json>'             Request body (for POST/PATCH/PUT)
  --timeout <ms>              Per request timeout (default: 15000)
  --insecure                  Disable TLS certificate verification
  --help                      Show this message

Examples:
  npm run loadtest -- --url http://localhost:3000/api/dashboard --concurrency 200 --requests 4000 --header "Cookie: sms_auth=TOKEN"
  npm run loadtest -- --url https://your-app.vercel.app/api/stock --header "Authorization: Bearer TOKEN"
`;

function parseArgs(argv) {
  const options = {
    requests: 2000,
    concurrency: 200,
    method: "GET",
    headers: [],
    timeout: 15000,
    insecure: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--insecure") {
      options.insecure = true;
      continue;
    }
    if (arg === "--url") {
      options.url = argv[++i];
      continue;
    }
    if (arg === "--requests") {
      options.requests = Number(argv[++i]);
      continue;
    }
    if (arg === "--concurrency") {
      options.concurrency = Number(argv[++i]);
      continue;
    }
    if (arg === "--method") {
      options.method = String(argv[++i] ?? "GET").toUpperCase();
      continue;
    }
    if (arg === "--timeout") {
      options.timeout = Number(argv[++i]);
      continue;
    }
    if (arg === "--header") {
      options.headers.push(argv[++i]);
      continue;
    }
    if (arg === "--body") {
      options.body = argv[++i];
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function parseHeaders(headerArgs) {
  const headers = new Headers();
  for (const raw of headerArgs) {
    const separator = raw.indexOf(":");
    if (separator <= 0) {
      throw new Error(`Invalid header format: "${raw}". Use "Key: Value".`);
    }

    const key = raw.slice(0, separator).trim();
    const value = raw.slice(separator + 1).trim();
    headers.set(key, value);
  }

  return headers;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  if (!options.url) {
    console.error("Missing required option: --url");
    console.log(HELP.trim());
    process.exit(1);
  }

  if (!Number.isFinite(options.requests) || options.requests <= 0) {
    throw new Error("--requests must be a positive number");
  }
  if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) {
    throw new Error("--concurrency must be a positive number");
  }
  if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
    throw new Error("--timeout must be a positive number");
  }

  if (options.insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const headers = parseHeaders(options.headers);
  const method = options.method;
  const body = options.body;
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const totalRequests = Math.floor(options.requests);
  const concurrency = Math.floor(Math.min(totalRequests, options.concurrency));
  let sent = 0;

  const statusCounts = new Map();
  let networkErrors = 0;
  const latenciesMs = [];

  console.log(`Starting load test...`);
  console.log(`URL: ${options.url}`);
  console.log(`Method: ${method}`);
  console.log(`Requests: ${totalRequests}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log(`Timeout: ${options.timeout}ms`);

  const startedAt = performance.now();

  async function runWorker() {
    while (true) {
      const requestId = sent;
      if (requestId >= totalRequests) return;
      sent += 1;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);
      const requestStart = performance.now();

      try {
        const response = await fetch(options.url, {
          method,
          headers,
          body: body ?? undefined,
          signal: controller.signal,
        });

        const statusKey = String(response.status);
        statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);
      } catch {
        networkErrors += 1;
      } finally {
        clearTimeout(timeoutId);
        latenciesMs.push(performance.now() - requestStart);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runWorker()));

  const endedAt = performance.now();
  const elapsedMs = endedAt - startedAt;
  const elapsedSec = elapsedMs / 1000;
  const rps = totalRequests / Math.max(elapsedSec, 0.001);

  const successCount = Array.from(statusCounts.entries())
    .filter(([status]) => Number(status) >= 200 && Number(status) < 400)
    .reduce((sum, [, count]) => sum + count, 0);

  console.log("\nResults");
  console.log(`Elapsed: ${elapsedSec.toFixed(2)}s`);
  console.log(`Throughput: ${rps.toFixed(2)} req/s`);
  console.log(`Success (2xx/3xx): ${successCount}/${totalRequests}`);
  console.log(`Network Errors/Timeouts: ${networkErrors}`);
  console.log(`Latency p50: ${percentile(latenciesMs, 50).toFixed(2)}ms`);
  console.log(`Latency p95: ${percentile(latenciesMs, 95).toFixed(2)}ms`);
  console.log(`Latency p99: ${percentile(latenciesMs, 99).toFixed(2)}ms`);

  const statusSummary = Array.from(statusCounts.entries())
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ");

  console.log(`Status Counts: ${statusSummary || "none"}`);
}

main().catch((error) => {
  console.error("Load test failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
