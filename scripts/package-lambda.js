const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "lambda-deploy.zip");

const output = fs.createWriteStream(OUTPUT);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`lambda-deploy.zip generado: ${mb} MB (${archive.pointer()} bytes)`);
});

archive.on("error", err => { throw err; });

archive.pipe(output);

// Archivos individuales en la raíz
archive.file(path.join(ROOT, "index.js"),      { name: "index.js" });
archive.file(path.join(ROOT, "package.json"),  { name: "package.json" });

// Carpetas completas
archive.directory(path.join(ROOT, "collectors"),   "collectors");
archive.directory(path.join(ROOT, "shared"),        "shared");
archive.directory(path.join(ROOT, "node_modules"),  "node_modules");

archive.finalize();
