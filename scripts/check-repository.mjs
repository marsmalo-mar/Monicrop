import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { publicationFindings } from "./publication-policy.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
let files;
try {
  const repository = resolve(git(["rev-parse", "--show-toplevel"]).trim());
  if (relative(repository, root))
    throw new Error("Initialize Git in the project root, not a parent folder.");
  files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean),
    ),
  ];
} catch (error) {
  console.error(
    "Repository check needs Git initialized in this project. Run git init -b main, then npm run repo:check.",
  );
  console.error(error.message);
  process.exit(1);
}
let failures = 0;
for (const path of files) {
  const bytes = await readFile(resolve(root, path));
  const content = bytes.includes(0) ? "" : bytes.toString("utf8");
  for (const finding of publicationFindings(path, content)) {
    console.error(
      `${path}${finding.line ? `:${finding.line}` : ""}: ${finding.reason}`,
    );
    failures++;
  }
}
if (failures) {
  console.error(
    `Repository check failed: ${failures} finding(s). No files were committed or pushed.`,
  );
  process.exit(1);
}
console.log(
  `Checked ${files.length} tracked/eligible files. No blocked private files or configured credential/PII patterns found.`,
);
console.log(
  "Review git diff --cached before committing. This check cannot detect every secret or inspect remote history.",
);
