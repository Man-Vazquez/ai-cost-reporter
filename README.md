# 🤖 AI Cost Reporter

A Node.js tool to fetch and report daily usage costs from multiple AI providers (OpenAI, Vertex AI, and others). Generates detailed CSV reports broken down by user, project, model, and token consumption.

---

## 📋 Features

- 📊 Fetches **previous day's costs** automatically (UTC range)
- 👤 Groups usage by **user, project and model**
- 🔄 Handles **pagination** for large organizations
- 📁 Exports results to a **clean CSV file**
- ⚡ Supports both **completion and embedding models**
- 🧩 Easily extensible to other AI providers (Vertex AI, etc.)

---

## 🛠️ Tech Stack

- Node.js
- axios
- dotenv
- fs (built-in)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone git@github-personal:Man-Vazquez/ai-cost-reporter.git
cd ai-cost-reporter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root of the project:

```env
OPENAI_ADMIN_KEY=your_openai_admin_api_key_here
# VERTEX_KEY=your_vertex_key_here  (coming soon)
```

> ⚠️ Never commit your `.env` file. It is already included in `.gitignore`.

### 4. Run the report

```bash
node get_costs_openai.js
```

---

## 📄 Output

The script generates a CSV file named `openai_report_YYYY-MM-DD.csv` with the following columns:

| Column | Description |
|---|---|
| `date` | Report date |
| `name` | User or service account name |
| `user_id` | OpenAI user ID |
| `project_id` | Project ID |
| `model` | AI model used |
| `input_tokens` | Input tokens consumed |
| `output_tokens` | Output tokens generated |
| `cached_tokens` | Cached input tokens |
| `total_tokens` | Total tokens (input + output) |
| `requests` | Number of API requests |
| `total_usd` | Total cost in USD |

---

## 📁 Project Structure

```
ai-cost-reporter/
├── get_costs_openai.js   # OpenAI cost report script
├── get_costs_vertex.js   # Vertex AI cost report script (WIP)
├── server.js             # Entry point / server (if applicable)
├── .env                  # Environment variables (not committed)
├── .gitignore
└── README.md
```

---

## 🔒 Security

- API keys are loaded via environment variables using `dotenv`
- `.env` is excluded from version control via `.gitignore`
- Never hardcode credentials in source files

---

## 🗺️ Roadmap

- [x] OpenAI cost reporting
- [ ] Vertex AI cost reporting
- [ ] Unified multi-provider report
- [ ] Scheduled automatic daily execution
- [ ] Email/Slack report delivery

---

## 👤 Author

**Manuel Vazquez**
- GitHub: [@Man-Vazquez](https://github.com/Man-Vazquez)
- Email: jose.mtto94@gmail.com