# 🤖 AI Cost Collector

Serverless pipeline para recolección y normalización de costos diarios de APIs de IA.
Corre como Lambda en AWS, escribe JSONL particionado a S3 y expone los datos vía Athena.

---

## 🏗️ Arquitectura

```
EventBridge (cron 8:00 AM UTC)
        │
        ▼
  Lambda: ai-costs-collector
  ┌─────────────────────────────────┐
  │  index.js (dispatcher)          │
  │    ├── collectors/openai.js     │
  │    ├── collectors/vertex.js     │  ← pendiente
  │    ├── collectors/elevenlabs.js │  ← pendiente
  │    └── ...                      │
  │                                 │
  │  shared/s3Writer.js             │
  └─────────────────────────────────┘
        │
        ▼
  S3: ai-costs-lake
  data/provider={p}/year={Y}/month={M}/day={D}/report.jsonl
        │
        ▼
  Glue Crawler → Athena (openai_db)
        │
        ▼
  Power BI Dashboard  ← pendiente
        │
  DLQ + CloudWatch Alarm + SNS email (alertas de fallos)
```

---

## 📁 Estructura del proyecto

```
api-costs-v2/
├── index.js                  # Lambda handler / dispatcher
├── collectors/
│   └── openai.js             # Collector OpenAI
├── shared/
│   └── s3Writer.js           # Módulo compartido de escritura a S3
├── scripts/
│   └── package-lambda.js     # Empaquetador ZIP para Lambda
├── test/
│   ├── test-openai.js
│   └── test-handler.js
└── package.json
```

---

## 📄 Schema de salida (`ai_costs`)

Cada fila del JSONL sigue este schema común:

| Campo | Tipo | Descripción |
|---|---|---|
| `date` | string | Fecha del reporte `YYYY-MM-DD` |
| `project_id` | string | ID del proyecto en el proveedor |
| `user_name` | string | Nombre del usuario o service account |
| `model` | string | Modelo utilizado |
| `operation_type` | string | `input_text`, `input_cached`, `output_text`, `output_thinking` |
| `tier` | null | Reservado para planes/tiers futuros |
| `input_units` | int | Tokens de entrada (sin caché) |
| `output_units` | int | Tokens de salida |
| `cached_tokens` | int | Tokens servidos desde caché |
| `unit_type` | string | `"tokens"` (o `"characters"` para otros proveedores) |
| `requests` | int | Número de requests (asignado a `input_text` únicamente) |
| `total_usd` | float | Costo en USD |
| `total_mxn` | null | Reservado para conversión MXN |
| `fx_rate` | null | Reservado para tipo de cambio |
| `sku_raw` | string | `line_item` original de la API del proveedor |

> El campo `provider` va en la partición S3, no en el JSONL — Glue lo detecta automáticamente como columna virtual.

### Partición S3

```
data/provider={provider}/year={YYYY}/month={MM}/day={DD}/report.jsonl
```

---

## 🚀 Desarrollo local

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la raíz:

```env
OPENAI_ADMIN_KEY=sk-admin-...
S3_BUCKET=ai-costs-lake
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### 3. Scripts disponibles

```bash
# Prueba local del collector OpenAI (llama a la API y escribe en S3)
npm run test:openai

# Prueba local del dispatcher Lambda completo
npm run test:handler

# Genera lambda-deploy.zip listo para subir a AWS
npm run package
```

---

## 📦 Deploy

### 1. Generar el ZIP

```bash
npm run package
# → lambda-deploy.zip (~8 MB)
```

### 2. Subir a Lambda

```bash
aws lambda update-function-code \
  --function-name ai-costs-collector \
  --zip-file fileb://lambda-deploy.zip
```

### 3. Variables de entorno en Lambda

Las credenciales se configuran directamente en la consola de Lambda o vía CLI — **no se usa `.env` en producción**:

```bash
aws lambda update-function-configuration \
  --function-name ai-costs-collector \
  --environment "Variables={OPENAI_ADMIN_KEY=sk-admin-...,S3_BUCKET=ai-costs-lake}"
```

`AWS_REGION` es inyectada automáticamente por el runtime de Lambda.

### 4. Invocar manualmente

```bash
aws lambda invoke \
  --function-name ai-costs-collector \
  --payload '{"providers":["openai"]}' \
  response.json
```

---

## 🗺️ Roadmap

- [x] Collector OpenAI
- [x] Pipeline Lambda + S3 + Athena
- [x] Deploy automático con EventBridge (cron diario 8:00 AM UTC)
- [x] Alertas DLQ + CloudWatch + SNS email
- [ ] Collector Vertex AI
- [ ] Collector ElevenLabs
- [ ] Collector Deepgram
- [ ] Collector VAPI
- [ ] Vista Athena `v_ai_costs_enriched` + `service_mapping`
- [ ] Dashboard Power BI

---

## 🔒 Seguridad

- En local: las credenciales van en `.env` (excluido del repo vía `.gitignore`)
- En producción: las credenciales van en variables de entorno de Lambda — nunca en el código ni en el ZIP

---

## 👤 Autor

**Manuel Vazquez**
- GitHub: [@manvzzgt](https://github.com/manvzzgt)
- Email: manuel.vazquez@enginetsystems.com
