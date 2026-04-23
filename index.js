const { write } = require("./shared/s3Writer");

async function runProvider(provider) {
  const { collect } = require(`./collectors/${provider}`);
  const data = await collect();

  if (!data.length) {
    console.log(`[${provider}] Sin datos para ayer.`);
    return;
  }

  const s3Path = await write({ data, provider, date: data[0].date });
  console.log(`[${provider}] ${data.length} registros escritos en ${s3Path}`);
}

async function handler(event) {
  const providers = event?.providers ?? [];

  if (!providers.length) {
    console.warn("No se especificaron providers en el evento.");
    return;
  }

  const results = await Promise.allSettled(providers.map(runProvider));

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[${providers[i]}] Error:`, result.reason?.message ?? result.reason);
    }
  });
}

module.exports = { handler };
