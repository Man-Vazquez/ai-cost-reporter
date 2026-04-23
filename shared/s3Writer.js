require("dotenv").config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// ==========================
// 🔹 BUILD S3 KEY
// ==========================
function buildS3Key(provider, date) {
  const [year, month, day] = date.split("-");
  return `data/provider=${provider}/year=${year}/month=${month}/day=${day}/report.jsonl`;
}

// ==========================
// 🔥 WRITE
// ==========================
async function write({ data, provider, date }) {
  const bucket = process.env.S3_BUCKET;
  const key = buildS3Key(provider, date);
  const body = data.map(row => JSON.stringify(row)).join("\n");

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "application/x-ndjson",
  }));

  const s3Path = `s3://${bucket}/${key}`;
  console.log(`Escrito en S3: ${s3Path}`);

  return s3Path;
}

module.exports = { write };
