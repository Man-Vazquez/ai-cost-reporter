require("dotenv").config();
const axios = require("axios");
const fs = require("fs");

const ADMIN_KEY = process.env.OPENAI_ADMIN_KEY;

const headers = {
  Authorization: `Bearer ${ADMIN_KEY}`,
};

// ==========================
// 🔹 RANGO UTC DIA ANTERIOR
// ==========================
function getYesterdayRange() {
  const now = new Date();

  const todayStartUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  const yesterdayStartUTC = new Date(todayStartUTC);
  yesterdayStartUTC.setUTCDate(yesterdayStartUTC.getUTCDate() - 1);

  return {
    start_time: Math.floor(yesterdayStartUTC.getTime() / 1000),
    end_time: Math.floor(todayStartUTC.getTime() / 1000),
  };
}

// ==========================
// 🔹 PAGINACION
// ==========================
async function fetchAllPages(url, params) {
  let results = [];
  let page = null;

  do {
    const response = await axios.get(url, {
      headers,
      params: page ? { ...params, page } : params,
    });

    results.push(...response.data.data);
    page = response.data.has_more ? response.data.next_page : null;

  } while (page);

  return results;
}

// ==========================
// 🔥 MAIN
// ==========================
async function generateReport() {
  try {
    const { start_time, end_time } = getYesterdayRange();
    const date = new Date(start_time * 1000).toISOString().split("T")[0];

    console.log("Consultando rango:", start_time, end_time);

    // ==========================
    // 1️⃣ TRAER COSTS (para saber qué modelos existen ese día)
    // ==========================
    const costBuckets = await fetchAllPages(
      "https://api.openai.com/v1/organization/costs",
      {
        start_time,
        end_time,
        bucket_width: "1d",
        group_by: ["user_id"],
        limit: 31,
      }
    );

    const usageMap = {};
    const modelsSet = new Set();

    costBuckets.forEach(bucket => {
      bucket.results.forEach(item => {
        const userId = item.user_id;
        const projectId = item.project_id || "";
        const amount = parseFloat(item.amount?.value || 0);

        const model = item.line_item
          ? item.line_item.split(",")[0].trim()
          : "";

        modelsSet.add(model);

        const key = `${userId}_${model}_${projectId}`;

        if (!usageMap[key]) {
          usageMap[key] = {
            date,
            user_id: userId,
            project_id: projectId,
            model,
            input_tokens: 0,
            output_tokens: 0,
            cached_tokens: 0,
            requests: 0,
            total_usd: 0,
          };
        }

        usageMap[key].total_usd += amount;
      });
    });

    // ==========================
    // 2️⃣ TRAER USAGE POR CADA MODELO
    // ==========================
    const models = Array.from(modelsSet);

    const completionModels = [];
    const embeddingModels = [];

    for (const model of models) {
      if (model.includes("embedding")) {
        embeddingModels.push(model);
      } else {
        completionModels.push(model);
      }
    }

    const fetchCompletionUsage = async (model) => {
      const usageBuckets = await fetchAllPages(
        "https://api.openai.com/v1/organization/usage/completions",
        {
          start_time,
          end_time,
          bucket_width: "1d",
          group_by: ["user_id"],
          models: [model],
          limit: 31,
        }
      );

      usageBuckets.forEach(bucket => {
        bucket.results.forEach(item => {
          const keyPrefix = `${item.user_id}_${model}_`;
          Object.keys(usageMap)
            .filter(k => k.startsWith(keyPrefix))
            .forEach(k => {
              usageMap[k].input_tokens = item.input_tokens || 0;
              usageMap[k].output_tokens = item.output_tokens || 0;
              usageMap[k].cached_tokens = item.input_cached_tokens || 0;
              usageMap[k].requests = item.num_model_requests || 0;
            });
        });
      });
    };

    const fetchEmbeddingUsage = async (model) => {
      const usageBuckets = await fetchAllPages(
        "https://api.openai.com/v1/organization/usage/embeddings",
        {
          start_time,
          end_time,
          bucket_width: "1d",
          group_by: ["user_id"],
          models: [model],
          limit: 31,
        }
      );

      usageBuckets.forEach(bucket => {
        bucket.results.forEach(item => {
          const keyPrefix = `${item.user_id}_${model}_`;
          Object.keys(usageMap)
            .filter(k => k.startsWith(keyPrefix))
            .forEach(k => {
              usageMap[k].input_tokens = item.input_tokens || 0;
              usageMap[k].output_tokens = 0;
              usageMap[k].cached_tokens = 0;
              usageMap[k].requests = item.num_model_requests || 0;
            });
        });
      });
    };

    await Promise.all([
      ...completionModels.map(fetchCompletionUsage),
      ...embeddingModels.map(fetchEmbeddingUsage),
    ]);

    // ==========================
    // 3️⃣ TRAER TODOS LOS PROYECTOS + USERS
    // ==========================
    const projects = await fetchAllPages(
      "https://api.openai.com/v1/organization/projects",
      { limit: 100 }
    );

    const userMap = {};

    for (const project of projects) {
      const serviceAccounts = await fetchAllPages(
        `https://api.openai.com/v1/organization/projects/${project.id}/service_accounts`,
        { limit: 100 }
      );

      serviceAccounts.forEach(account => {
        userMap[account.id] = account.name;
      });
    }

    const orgUsers = await fetchAllPages(
      "https://api.openai.com/v1/organization/users",
      { limit: 100 }
    );

    orgUsers.forEach(user => {
      userMap[user.id] = user.name || user.email;
    });

    // ==========================
    // 4️⃣ FORMATEAR RESULTADO FINAL
    // ==========================
    const finalResults = Object.values(usageMap).map(item => {

      const total_tokens = item.input_tokens + item.output_tokens;

      return {
        date: item.date,
        name: userMap[item.user_id] || "Unknown",
        user_id: item.user_id,
        project_id: item.project_id,
        model: item.model,
        input_tokens: item.input_tokens,
        output_tokens: item.output_tokens,
        cached_tokens: item.cached_tokens,
        total_tokens,
        requests: item.requests,
        total_usd: Number(item.total_usd.toFixed(6)),
      };
    });

    finalResults.sort((a, b) => b.total_usd - a.total_usd);

    if (!finalResults.length) {
      console.log("Sin datos para ayer.");
      return;
    }

    console.table(finalResults);

    // ==========================
    // 5️⃣ CSV LIMPIO
    // ==========================
    const csvHeaders = Object.keys(finalResults[0]).join(",");

    const rows = finalResults.map(obj =>
      Object.values(obj)
        .map(val => `"${String(val).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [csvHeaders, ...rows].join("\n");

    const fileName = `openai_report_${date}.csv`;

    fs.writeFileSync(fileName, csv);

    console.log(`\n✅ CSV generado correctamente: ${fileName}`);

  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

generateReport();