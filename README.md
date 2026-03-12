# EduMind — AI Study Assistant
## Complete Deployment Guide

---

## 📁 Project Structure

```
edumind/
├── backend/
│   └── app.py                  ← Flask API server (all endpoints)
├── frontend/
│   └── index.html              ← Single-page app (all UI)
├── data/                       ← Auto-created: JSON database
│   └── platform_data.json
├── uploads/                    ← Auto-created: user file uploads
├── study_db/                   ← Auto-created: ChromaDB vector indexes
├── requirements.txt            ← Python dependencies
├── .env.example                ← Environment variables template
├── .gitignore
├── Dockerfile                  ← Docker container config
├── docker-compose.yml          ← Docker Compose (recommended)
└── Procfile                    ← Heroku / Railway / Render deploy
```

---

## ⚡ Quick Start (Local — 5 minutes)

### Prerequisites
- Python 3.10 or higher
- pip
- An OpenAI API key (get one at https://platform.openai.com/api-keys)

### Step 1 — Clone / Extract the project

```bash
# If using git:
git clone https://github.com/your-org/edumind.git
cd edumind

# Or extract the zip:
unzip edumind.zip
cd edumind
```

### Step 2 — Create virtual environment

```bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Windows (Command Prompt)
python -m venv venv
venv\Scripts\activate.bat

# Windows (PowerShell)
python -m venv venv
venv\Scripts\Activate.ps1
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** First install may take 2–5 minutes (downloading LangChain + ChromaDB).

### Step 4 — Set your OpenAI API key

```bash
# macOS / Linux
cp .env.example .env
nano .env        # or open with any text editor

# Windows
copy .env.example .env
notepad .env
```

Edit `.env` and set:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### Step 5 — Run the server

```bash
python backend/app.py
```

You should see:
```
====================================================
  EduMind  →  http://localhost:5000
  LangChain: ✓
  OpenAI:    ✓
====================================================
```

### Step 6 — Open the app

Open your browser and go to: **http://localhost:5000**

### Demo login credentials (all password: `password`)

| Role    | Email                     |
|---------|---------------------------|
| Student | student@edumind.com       |
| Tutor   | tutor@edumind.com         |
| Admin   | admin@edumind.com         |

---

## 🐳 Docker Deployment (Recommended for Teams)

### Prerequisites
- Docker Desktop installed (https://www.docker.com/products/docker-desktop)

### Step 1 — Set up environment

```bash
cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

### Step 2 — Build and run

```bash
docker-compose up --build
```

Wait for:
```
edumind_app  | [INFO] EduMind → http://localhost:5000
```

### Step 3 — Access the app

Open **http://localhost:5000**

### Useful Docker commands

```bash
# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up --build
```

### Data persistence with Docker
Your data is stored in local folders mounted as volumes:
- `./data/` — JSON database (users, evaluations, settings)
- `./uploads/` — uploaded files
- `./study_db/` — AI vector database

These persist between container restarts.

---

## ☁️ Cloud Deployment

### Option A — Railway (Easiest, free tier available)

1. Go to **https://railway.app** and sign up
2. Click **New Project → Deploy from GitHub repo**
3. Connect your GitHub account and select your repo
   *(or use Railway CLI: `railway init` then `railway up`)*
4. In Railway dashboard → **Variables**, add:
   ```
   OPENAI_API_KEY = sk-your-key-here
   ```
5. Railway auto-detects the `Procfile` and deploys
6. Click the generated URL to access your app

### Option B — Render (Free tier available)

1. Go to **https://render.com** and sign up
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
6. Add environment variable: `OPENAI_API_KEY`
7. Click **Create Web Service**

### Option C — Heroku

```bash
# Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku login
heroku create your-app-name
heroku config:set OPENAI_API_KEY=sk-your-key-here
git push heroku main
heroku open
```

### Option D — VPS / Ubuntu Server (DigitalOcean, Linode, AWS EC2)

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Install Python
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip nginx -y

# 3. Clone the project
git clone https://github.com/your-org/edumind.git /var/www/edumind
cd /var/www/edumind

# 4. Set up virtual env
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Create .env
cp .env.example .env
nano .env  # Set OPENAI_API_KEY

# 6. Test the server
python backend/app.py  # Should start on port 5000

# 7. Set up systemd service (keep running after SSH logout)
sudo nano /etc/systemd/system/edumind.service
```

Paste this into the service file:
```ini
[Unit]
Description=EduMind AI Study Assistant
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/edumind
Environment="PATH=/var/www/edumind/venv/bin"
EnvironmentFile=/var/www/edumind/.env
ExecStart=/var/www/edumind/venv/bin/gunicorn --chdir backend app:app --bind 0.0.0.0:5000 --workers 2 --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# 8. Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable edumind
sudo systemctl start edumind

# 9. Check status
sudo systemctl status edumind
```

#### Set up Nginx reverse proxy (HTTPS):

```bash
sudo nano /etc/nginx/sites-available/edumind
```

Paste:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/edumind /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Optional: Add free SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🔌 API Reference

All API routes are prefixed with `/api`. Authenticated routes require:
```
Authorization: Bearer <token>
```

### Auth

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/login` | `{email, password}` | Sign in, returns token |
| POST | `/api/auth/signup` | `{name, email, password, role}` | Create account |
| POST | `/api/auth/logout` | — | Invalidate token |
| GET | `/api/auth/me` | — | Current user info |

### Documents

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/upload` | Upload file (multipart `file` field) |
| GET | `/api/docs` | List my documents |
| DELETE | `/api/docs/:id` | Delete a document |

### Chat

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/chat` | `{message, doc_id}` | AI chat against a document |

### Questions (Tutor/Admin)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/questions/generate` | `{doc_id, type, easy, medium, hard, marks_per_q, subject, chapters}` | Generate questions |
| GET | `/api/questions` | — | List all question sets |

### Evaluation (Tutor/Admin)

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| POST | `/api/evaluate/single` | multipart: `sheet` file + `student_name`, `roll`, `questions` | Evaluate one sheet |
| POST | `/api/evaluate/bulk` | multipart: `sheets[]` + `questions`, `student_names` | Evaluate multiple sheets |
| PATCH | `/api/evaluate/:id/finalise` | `{results}` | Tutor override + finalise |
| POST | `/api/evaluate/accuracy` | `{eval_ids}` | Check AI evaluation accuracy |
| GET | `/api/evaluate` | — | List evaluations |

### Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/users` | List all users (`?role=student`) |
| POST | `/api/admin/users` | Add user |
| PATCH | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/stats` | Platform stats |
| GET/PATCH | `/api/admin/settings` | Get/update settings |

---

## 🔧 Configuration

Edit `.env` to configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | *(required)* | Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | GPT model for chat & generation |
| `PORT` | `5000` | Server port |
| `FLASK_DEBUG` | `false` | Enable debug mode (dev only) |

Platform settings (configurable in Admin panel):

| Setting | Default | Description |
|---------|---------|-------------|
| `max_uploads_per_user` | 20 | File upload limit per user |
| `max_questions_per_syllabus` | 100 | Max questions per test |
| `student_self_register` | true | Allow student sign-ups |
| `tutor_approval_required` | false | Admin must approve tutors |
| `show_answer_explanations` | true | Show explanations to students |

---

## 🎓 Tutor Features — How to Use

### Generate Questions
1. Log in as Tutor → **AI Study Chat** → upload a PDF syllabus
2. Go to **Question Generator**
3. Select your syllabus, choose subject, select chapters
4. Set pattern: Easy / Medium / Hard question counts
5. Choose Question Types: MCQ only, Subjective only, or Both
6. Click **Generate Questions**

### Evaluation Workflow (6 steps)
Go to **Evaluation Centre**:

| Step | Action |
|------|--------|
| 1 | **Generate Answer Sheet** — print blank sheets for students to fill by hand |
| 2 | **Upload Written Sheet** — scan/photo a student's handwritten sheet and upload |
| 3 | **AI Evaluate** — AI reads the sheet and marks each answer; tutor can override |
| 4 | **Check Accuracy** — see how accurate the AI marking was vs expected |
| 5 | **Bulk Upload** — upload all students' sheets at once (separate files or one merged PDF) |
| 6 | **Class Report** — full class leaderboard with grades, export to PDF or CSV |

---

## 🚨 Troubleshooting

### "No module named flask"
```bash
# Make sure virtual environment is activated
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate.bat  # Windows

pip install -r requirements.txt
```

### "OPENAI_API_KEY not set" / AI not responding
```bash
# Check your .env file exists and has the key
cat .env

# Make sure python-dotenv loads it
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('OPENAI_API_KEY')[:8])"
```

### Port 5000 already in use
```bash
# Find and kill the process using port 5000
# macOS / Linux:
lsof -ti :5000 | xargs kill -9

# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or change port in .env:
PORT=5001
```

### File uploads fail
```bash
# Check uploads directory exists and is writable
ls -la uploads/
chmod 755 uploads/   # Linux/macOS
```

### ChromaDB / Vector DB errors
```bash
# Delete and recreate the vector database
rm -rf study_db/
# Then re-upload your documents
```

---

## 📋 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (single file, no build step) |
| Backend | Python 3.11 + Flask 3 |
| AI Chat | LangChain + OpenAI GPT-4o |
| Vector DB | ChromaDB (local) |
| Embeddings | OpenAI text-embedding-3-small |
| Vision Eval | OpenAI GPT-4o Vision |
| Transcription | OpenAI Whisper (audio/video) |
| Storage | JSON file (dev) → upgrade to PostgreSQL for prod |
| Auth | Token-based (in-memory) → upgrade to JWT + Redis for prod |
| Deployment | Gunicorn + Nginx / Docker / Railway |

---

## 🔒 Production Checklist

Before going live:

- [ ] Change `SECRET_KEY` in `.env` to a long random string
- [ ] Set `FLASK_DEBUG=false`
- [ ] Replace JSON storage with a real database (PostgreSQL + SQLAlchemy)
- [ ] Replace in-memory token store with Redis
- [ ] Enable HTTPS (SSL certificate via Let's Encrypt)
- [ ] Set up file storage (AWS S3 or Google Cloud Storage) for uploads
- [ ] Set up database backups
- [ ] Add rate limiting (Flask-Limiter)
- [ ] Review CORS settings (restrict origins in production)
- [ ] Set up logging and error monitoring (Sentry)

---

## 📞 Support

- Docs: See this README
- Issues: GitHub Issues
- Demo accounts always available with password `password`

---

*EduMind AI Study Assistant — Built with Flask + LangChain + OpenAI*
