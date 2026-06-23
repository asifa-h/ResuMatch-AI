# 🔍 ResuMatch AI

> AI-powered resume analysis platform that evaluates resumes against job descriptions, identifies skill gaps, calculates compatibility scores, and provides actionable recommendations for job seekers.

![License](https://img.shields.io/badge/license-Apache%202.0-blue)
![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React-green)
![Status](https://img.shields.io/badge/status-Active-brightgreen)

---

## 📌 Problem Statement

Job seekers often struggle to understand how well their resumes align with specific job descriptions. Many applicants submit resumes without identifying missing skills, ATS keyword gaps, formatting issues, or domain mismatches, leading to lower interview selection rates.

ResuMatch AI addresses this challenge by providing an AI-powered resume evaluation system that compares resumes against job descriptions, calculates match scores, identifies missing skills, highlights strengths, and generates professional recommendations to improve job application success.

---

## 🚀 Features

| Feature |	Description |
|---|---|
| 🤖 AI Resume Analysis | Analyzes resumes using Gemini AI |
| 📄 Resume Parsing	| Extracts text from uploaded resumes |
| 🎯 Job Description Matching	| Compares resume content with JD requirements |
| 📊 Match Score Calculation | Generates compatibility score and insights |
| 🧠 Skill Gap Detection | Identifies missing technical and soft skills |
| ⚠️ Domain Mismatch Detection | Flags major profile-job mismatches |
| 📑 PDF Report Generation | Exports detailed analysis reports |
| 💡 Improvement Suggestions| Provides actionable resume enhancements |
| ⚡ Real-Time Processing | Instant AI-powered evaluation |
| 🌐 Web-Based Interface | Accessible from any browser |

---

## 🏗️ Tech Stack

### Frontend

- ⚛️ React.js
- 🎨 CSS3
- ⚡ Vite
- 🧩 TypeScript

### Backend

- 🟢 Node.js
- 🚀 Express.js
- 🔐 Environment Variables (.env)

### AI Layer

- 🤖 Google Gemini 3.5 Flash
- 📦 Google GenAI SDK

### Deployment

- ☁️ Render
- 🐙 GitHub

---

## 📂 Project Structure

```
ResuMatch-AI/
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── server.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── metadata.json
├── .env.example
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js 18+
- Gemini API Key
- Git

### 1. Clone Repository

git clone https://github.com/asifa-h/ResuMatch-AI.git
cd ResuMatch-AI

### 2. Install Dependencies

npm install


### 3. Configure Environment Variables

Create a .env file:

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
APP_URL=http://localhost:3000

### 4. Run Development Server

npm run dev

Application runs at:
http://localhost:3000

### 5. Production Build

npm run build
npm start

---

## 🧠 How It Works

### Resume Analysis Flow
- 1. User uploads a resume
- 2. User pastes a job description
- 3. Resume text is extracted and processed
- 4. Resume and JD are sent securely to the backend
- 5. Gemini AI evaluates compatibility
- 6. AI identifies matching skills and missing requirements
- 7. Match score and recommendations are generated
- 8. Results are displayed and can be exported as PDF

### Skill Gap Detection Flow

- 1. AI extracts required skills from the JD
- 2. Resume skills are identified
- 3. Missing and matching skills are compared
- 4. Skill gaps are highlighted
- 5. Recommendations are generated for improvement

---

### Match Score Generation

- 1. Resume content is evaluated against JD requirements
- 2. Technical skills are compared
- 3. Experience relevance is analyzed
- 4. Domain compatibility is verified
- 5. AI calculates an overall match percentage
- 6. Detailed insights are returned to the user

---

## 📈 Scalability

- **Backend** can be containerized using Docker
- **Gemini Integration** can support high-volume resume evaluations
- **Cloud Deployment** supports concurrent users
- **Additional databases** can be integrated for user history
- **Authentication systems** can be added for personalized dashboards

---

## 💡 Feasibility

ResuMatch AI is built using widely adopted technologies including React, Node.js, Express, and Google Gemini AI. The system requires minimal infrastructure and can be deployed easily on platforms like Render, Railway, or Google Cloud Run. By leveraging Gemini's advanced language understanding capabilities, the platform delivers accurate resume evaluations without requiring custom ML model training.

---

## 🌟 Novelty

Unlike traditional ATS checkers that rely solely on keyword matching, ResuMatch AI uses generative AI to understand context, relevance, skill alignment, and domain suitability. The system not only identifies missing keywords but also explains why a resume may not align with a role and provides practical improvement suggestions.

---

## 🔧 Feature Depth

- **AI-powered Resume Evaluation** with contextual understanding
- **Advanced JD comparison** engine
- Skill gap **analysis and recommendations**
- **Domain mismatch**  detection
- Professional **report generation**
- **ATS-friendly optimization** insights
- Real-time **AI feedback**
- **Secure backend** API architecture

---

## ⚠️ Ethical Use & Disclaimer

ResuMatch AI is intended for **educational, career guidance, and resume optimization purposes only.**

The platform does **NOT** guarantee interview selection, job offers, or hiring outcomes. Users should independently verify recommendations and tailor their resumes according to individual circumstances.

All uploaded data should be handled responsibly and in accordance with applicable privacy regulations.

---

## 📜 License

Licensed under the MIT License.

---

## 🤝 Contributing

Contributions are welcome.

- 1. Fork the repository
- 2. Create a feature branch
- 3. git checkout -b feature-name
- 4. Commit changes
- 5. git commit -m "Add feature-name"
- 6. Push changes and open a Pull Request

---

## 🌐 Live Demo

Live Website:
https://resumatch-ai-zkmx.onrender.com

---

## 🧩 Author

Asifa H

📧 asifa.h.2024.aiml@rajalakshmi.edu.in

🔗 GitHub: https://github.com/asifa-h

🔗 LinkedIn: https://linkedin.com/in/asifa-h

---

