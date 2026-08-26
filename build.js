const fs = require("fs");

const template = fs.readFileSync("index.html", "utf8");

const output = template
  .replace(/__SUPABASE_URL__/g, process.env.SUPABASE_URL || "")
  .replace(/__SUPABASE_ANON_KEY__/g, process.env.SUPABASE_ANON_KEY || "");

fs.mkdirSync("public", { recursive: true });
fs.writeFileSync("public/index.html", output);
