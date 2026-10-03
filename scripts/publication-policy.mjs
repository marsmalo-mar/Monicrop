export function publicationFindings(path, content) {
  const findings = [];
  const normalized = path.replaceAll("\\", "/");
  if (
    /^(?:legacy|node_modules|\.next|uploads|profile|pics|img|test-results|includes|assets)\//i.test(
      normalized,
    ) ||
    (/(?:^|\/)\.env(?:\.|$)/i.test(normalized) &&
      ![".env.example", ".env.demo.example"].includes(normalized)) ||
    /\.(?:pem|key|p12|pfx|bak|zip|php|tsbuildinfo|log)$/i.test(normalized) ||
    (/\.sql$/i.test(normalized) && normalized !== "database/schema.sql")
  )
    findings.push({
      reason: "Private or generated file must not be published",
    });
  const rules = [
    [
      "Private key material",
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    ],
    [
      "Provider credential pattern",
      /(?:ghp_|github_pat_|sk_live_|AKIA|xox[baprs]-|AIza)[A-Za-z0-9_-]{16,}/,
    ],
    [
      "Personal email address; use fictional example.test data",
      /[A-Za-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail)\.[A-Za-z]+/i,
    ],
    [
      "Package registry credential",
      /(?:^|:)_(?:authToken|password)\s*=\s*(?!\$\{)[^\s]{8,}/i,
    ],
  ];
  if ([".env.example", ".env.demo.example"].includes(normalized))
    rules.push([
      "Example environment files must leave credentials empty",
      /^[A-Z0-9_]*(?:PASSWORD|TOKEN|SECRET|PRIVATE_KEY)\s*=\s*.+$/i,
    ]);
  if (normalized.endsWith(".sql"))
    rules.push([
      "Data rows in SQL; publish definitions only",
      /\b(?:INSERT|REPLACE)\s+INTO\b/i,
    ]);
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    for (const [reason, pattern] of rules) {
      if (pattern.test(line)) findings.push({ reason, line: index + 1 });
    }
  }
  return findings;
}
