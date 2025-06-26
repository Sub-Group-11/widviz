# 🧠 WidViz – AI-Powered YouTube Summarizer & Study Toolkit

WidViz is a full-stack desktop application that helps users summarize YouTube videos, generate quizzes, take notes, and track goals — all in one place.

It combines the power of OpenAI's Whisper for speech-to-text, Mistral 7B (running locally via Ollama) for summarization, and a modern desktop interface built with Electron.

---

## ✨ What Can It Do?

- 🎥 Summarize any YouTube video using AI
- 🧠 Generate quizzes based on video content
- 📝 Take notes and export them as PDFs
- 📅 Set and track goals using a calendar
- 🔐 Log in securely and reset passwords
- 📡 Share across your local Wi-Fi network (LAN)

---

## 🛠️ Tech Stack Overview

**Frontend:** Electron (Node.js + HTML/CSS/JS)  
**Backend:** Python (Flask)  
**AI Models:** Mistral 7B via [Ollama](https://ollama.ai), Whisper (local)  
**Database:** MySQL  
**Other Tools:** yt-dlp, ffmpeg, Gmail API (OAuth2 for email features)

---

## 📦 Folder Structure

widviz/  
├── backend/              → Flask backend code  
│   └── widviz_backend.py  
├── frontend/             → Electron frontend  
│   ├── index.html  
│   ├── js/, css/  
├── database/             → MySQL schema  
│   └── schema.sql  
├── assets/               → Logos and icons  
├── .env.example          → Template for environment config  
├── requirements.txt      → Python packages  
├── .gitignore  
└── README.md

---

## 📋 Prerequisites

Before installing, make sure you have these installed on your machine:

- Python 3.8+  
- Node.js v14+  
- MySQL Server  
- ffmpeg  
- yt-dlp  
- Ollama (https://ollama.ai)

---

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/YourOrgName/widviz.git
cd widviz
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```
Edit .env and fill in:
- SECRET_KEY (Flask session secret)
- MySQL credentials
- YouTube API key
- OLLAMA_URL (default: http://localhost:11434)

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Install Node.js Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Set Up MySQL Database

Ensure MySQL is running, then run:

```bash
mysql -u root -p < database/schema.sql
```
This will create the required tables: users, notes, goals.

### 6. Whisper, Ollama & Tool Setup
- Install ffmpeg and yt-dlp
- Install Ollama
- Pull the model:

```bash
ollama pull mistral
```
- Start the server:

```bash
ollama serve
```
Whisper is installed through requirements.txt and runs locally.

---

▶️ **Running the App**

**Start Flask Backend**
```bash
cd backend
python widviz_backend.py
```

**Start Electron Frontend**
```bash
cd frontend
npm start
```
You should now see the WidViz desktop app open!

---

🌐 **LAN Access (Optional)**
- To access from other devices on your Wi-Fi:
  - Run the Flask app on 0.0.0.0
  - Find your IP (ipconfig or ifconfig)
  - Use http://<your-ip>:<port> on another device

---

## 📄 .env Example

```dotenv
SECRET_KEY=your_flask_secret
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=widviz
MYSQL_CURSORCLASS=DictCursor
YOUTUBE_API_KEY=your_youtube_api_key
OLLAMA_URL=http://localhost:11434
```

---

🔒 **Security Best Practices**
- Do not commit .env, token.json, or credentials.json
- These are excluded using .gitignore
- Place Gmail OAuth files inside /backend/ manually

---

👥 **Project Contributors**
- Aditya Kale – Backend, Youtube summarizer, Quiz → https://github.com/adityakale838

- Devansh Kadu – Frontend & UI→ https://github.com/devanshkadu2005

- Pragya Richa – Testing,Notes,Daily goals calender,Login, Dataset Management → https://github.com/PragyaRicha11

---

📃 **License**
This project is licensed under the MIT License.
Feel free to use, fork, modify, and contribute.

---

❓ **Need Help?**
- Check open Issues on the GitHub repo
- Submit a bug report or pull request
- Or feel free to reach out directly if you're stuck

Happy building! 🚀


