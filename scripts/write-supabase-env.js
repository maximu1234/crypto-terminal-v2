#!/usr/bin/env node
/**
 * Генерирует js/supabase-env.js из переменных окружения (Vercel build).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "js", "supabase-env.js");

const url =
process.env.SUPABASE_URL ||
process.env.VITE_SUPABASE_URL ||
"";

const key =
process.env.SUPABASE_ANON_KEY ||
process.env.VITE_SUPABASE_ANON_KEY ||
"";

const workerUrl =
process.env.ALERT_WORKER_URL ||
process.env.VITE_ALERT_WORKER_URL ||
"";

if(!url || !key){

if(fs.existsSync(out)){
console.log(
"supabase-env.js: env vars missing — keeping existing file"
);
process.exit(0);
}

console.warn(
"supabase-env.js: env vars missing — writing empty stub (cloud sync off)"
);

}

const body = `/* Auto-generated at deploy — do not edit */
export const SUPABASE_URL = ${JSON.stringify(url)};
export const SUPABASE_ANON_KEY = ${JSON.stringify(key)};
export const ALERT_WORKER_URL = ${JSON.stringify(workerUrl)};
`;

fs.writeFileSync(out, body, "utf8");
console.log(
"supabase-env.js:",
url ? "configured" : "empty (cloud sync off)"
);
