# 🎓 EduMentor AI – Intelligent Personalized Learning Assistant

> **Enterprise-grade AI-powered educational web application built with Python Flask, IBM watsonx.ai, and IBM Granite Foundation Models.**

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-green.svg)](https://flask.palletsprojects.com)
[![IBM watsonx.ai](https://img.shields.io/badge/IBM-watsonx.ai-0F62FE.svg)](https://www.ibm.com/products/watsonx-ai)
[![IBM Granite](https://img.shields.io/badge/IBM-Granite%20AI-8A3FFC.svg)](https://www.ibm.com/granite)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com)

---

## 📌 Overview

**EduMentor AI** is an intelligent AI tutoring web application that provides students with comprehensive, personalised learning assistance. Powered by IBM Granite Foundation Models via IBM watsonx.ai, it transforms any subject and topic into a complete structured learning experience — instantly.

---

## ✨ Core Features

| Feature | Description |
|---------|-------------|
| 📚 **Concept Explanation** | Clear, structured explanations tailored to the selected difficulty level |
| 📝 **Revision Notes** | Concise, exam-ready bullet-point revision notes |
| ⭐ **Key Points** | 5 critical points every student must know |
| ❓ **Auto Quiz** | 5 multiple-choice questions with correct answers highlighted |
| 💡 **Study Tips** | Personalised strategies based on difficulty level |
| ⚠️ **Common Mistakes** | Frequent pitfalls and how to avoid them |
| 🔗 **Related Topics** | Clickable related topics for further exploration |
| 📌 **Topic Summary** | A concise ≤150-word summary |
| 🌙 **Dark/Light Mode** | Persistent theme toggle with system preference detection |
| 📋 **Copy Response** | One-click clipboard copy of the full AI response |
| 📄 **PDF Download** | Print-ready PDF export of all learning content |
| 🕓 **Chat History** | Sidebar with full session history (persisted in localStorage) |
| 📱 **Responsive UI** | Fully mobile-responsive Bootstrap 5 design |

---

## 🏗️ Project Structure

```
EduMentor AI/
├── edumentor/
│   ├── __init__.py                # Package init
│   ├── app.py                     # Flask application factory
│   ├── watsonx_client.py          # IBM watsonx.ai integration + AGENT_INSTRUCTIONS
│   ├── blueprints/
│   │   ├── __init__.py
│   │   └── routes.py              # REST API and view routes
│   ├── templates/
│   │   └── index.html             # Main dashboard (full UI)
│   └── static/
│       ├── css/
│       │   └── style.css          # Custom stylesheet (dark/light, animations)
│       └── js/
│           └── main.js            # All client-side logic
├── run.py                         # Application entry point
├── requirements.txt               # Python dependencies
├── .env.example                   # Environment variable template
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone / Navigate to the Project
```bash
cd "EduMentor AI"
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
```bash
copy .env.example .env        # Windows
cp .env.example .env          # macOS / Linux
```

Edit `.env` and fill in your IBM credentials:
```dotenv
IBM_API_KEY=your_ibm_api_key_here
IBM_PROJECT_ID=your_ibm_project_id_here
IBM_URL=https://us-south.ml.cloud.ibm.com
MODEL_ID=ibm/granite-13b-chat-v2
FLASK_DEBUG=False
SECRET_KEY=your_super_secret_key
```

### 5. Run the Application
```bash
python run.py
```

Open your browser at **http://localhost:5000**

---

## 🔑 Obtaining IBM watsonx.ai Credentials

1. Sign up at [IBM Cloud](https://cloud.ibm.com)
2. Create an **IBM watsonx.ai** service instance
3. Navigate to **Projects** and create or open a project
4. Copy your **Project ID** from the project settings
5. Generate an **API Key** from IAM → [Manage access and users → API keys](https://cloud.ibm.com/iam/apikeys)
6. Set the region URL (default: `https://us-south.ml.cloud.ibm.com`)

---

## 🌐 REST API Reference

### `POST /api/learn`
Generate structured educational content from IBM Granite.

**Request:**
```json
{
  "subject":    "Mathematics",
  "topic":      "Quadratic Equations",
  "difficulty": "Beginner"
}
```

**Response:**
```json
{
  "success":    true,
  "subject":    "Mathematics",
  "topic":      "Quadratic Equations",
  "difficulty": "Beginner",
  "raw":        "<full model output>",
  "sections": {
    "explanation": "...",
    "notes":       "...",
    "key_points":  "...",
    "quiz":        "...",
    "study_tips":  "...",
    "mistakes":    "...",
    "related":     "...",
    "summary":     "..."
  }
}
```

### `GET /api/health`
```json
{ "status": "ok", "service": "EduMentor AI" }
```

---

## 🤖 AI Agent Behaviour

The `AGENT_INSTRUCTIONS` block in [`edumentor/watsonx_client.py`](edumentor/watsonx_client.py) defines the AI persona:

- Acts as an experienced, friendly, and motivating teacher
- Adjusts tone and depth for Beginner / Intermediate / Advanced
- Uses bullet points, headings, and real-life examples
- Focuses solely on educational content
- Politely declines inappropriate or off-topic requests

---

## 🎨 UI Highlights

| Feature | Implementation |
|---------|---------------|
| Dark/Light Mode | CSS custom properties (`data-theme`) + `localStorage` |
| Animations | CSS keyframes (`float`, `fadeInUp`, `spin`, `pulse-icon`) |
| Loading Steps | Cycling step pills during AI generation |
| Quiz Rendering | Auto-parses MCQ blocks and highlights correct answers |
| Related Topics | Clickable pills that auto-fill the form for next session |
| PDF Export | Print-to-PDF via browser's `window.print()` |

---

## 🏭 Production Deployment

### Using Gunicorn
```bash
gunicorn "edumentor.app:create_app()" --workers 4 --bind 0.0.0.0:8000
```

### Environment Variables for Production
```dotenv
FLASK_DEBUG=False
SECRET_KEY=<strong-random-value>
```

---

## 🔒 Security Best Practices

- ✅ Credentials stored exclusively in `.env` (never hard-coded)
- ✅ `.env` excluded from version control (add to `.gitignore`)
- ✅ Input validation on all API endpoints
- ✅ CSRF protection via Flask `SECRET_KEY`
- ✅ Proper error handling with no sensitive data in responses

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.9+, Flask 3.0, Blueprints |
| **AI Engine** | IBM watsonx.ai, IBM Granite 13B Chat v2 |
| **Frontend** | Bootstrap 5.3, Vanilla JS (ES2021), CSS3 |
| **Icons** | Bootstrap Icons 1.11 |
| **Fonts** | Inter (Google Fonts) |
| **PDF** | Browser Print API |
| **WSGI** | Gunicorn (production) |

---

## 📄 License

This project is for educational and demonstration purposes. IBM watsonx.ai usage is subject to [IBM's Terms of Service](https://www.ibm.com/legal).

---

<div align="center">
  <strong>Made with ❤️ using IBM watsonx.ai & IBM Granite Foundation Models</strong><br/>
  <em>EduMentor AI – Empowering students through intelligent, personalised learning</em>
</div>
