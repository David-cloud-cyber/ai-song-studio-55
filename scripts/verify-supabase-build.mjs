import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const outputDir = resolve(".output/public");
const expectedProject = "caqqdegtohyynaqfzxuv";
const forbiddenProjects = ["myuontfwguypzfxomfjf"];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    else files.push(path);
  }
  return files;
}

const files = await collectFiles(outputDir);
let combined = "";
for (const file of files) combined += await readFile(file, "utf8");

if (!combined.includes(expectedProject)) {
  throw new Error(`Supabase build guard failed: expected project ${expectedProject} was not found.`);
}

const staleProject = forbiddenProjects.find((project) => combined.includes(project));
if (staleProject) {
  throw new Error(`Supabase build guard failed: stale project ${staleProject} is still bundled.`);
}

if (combined.includes("SUPABASE_SERVICE_ROLE_KEY") || combined.includes("FAPSHI_API_KEY")) {
  throw new Error("Supabase build guard failed: a server-only secret name is bundled for the browser.");
}

console.log(`Supabase browser build verified: ${expectedProject}`);
