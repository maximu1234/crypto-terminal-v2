#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const localNodeModules = path.join(root, "node_modules");
const desktopNodeModules = path.join(root, "..", "desktop", "node_modules");

function existsDir(p){
  try{
    return fs.statSync(p).isDirectory();
  }catch{
    return false;
  }
}

if(existsDir(localNodeModules)){
  process.exit(0);
}

if(existsDir(desktopNodeModules)){
  try{
    fs.symlinkSync("../desktop/node_modules", localNodeModules, "dir");
    console.log("bot-app deps linked -> ../desktop/node_modules");
    process.exit(0);
  }catch(err){
    console.error("Failed to create bot-app/node_modules symlink:", err?.message || err);
    process.exit(1);
  }
}

console.log("No desktop/node_modules — installing bot-app deps locally");
const r = spawnSync("npm", ["install"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32"
});
process.exit(r.status || 0);
