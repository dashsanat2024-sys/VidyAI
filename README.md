# VidyAI — React Frontend

Migrated from Vanilla JS/HTML5/CSS3 to React 18 + Vite.

## Project Structure

```
src/
├── context/
│   ├── AuthContext.jsx       # JWT auth state (token, me, login, logout)
│   └── AppContext.jsx        # Global app state (syllabi, docs, activePanel)
├── utils/
│   └── api.js                # API helpers + speakText() speech synthesis
├── hooks/
│   └── useToast.js           # Toast notification hook
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx       # Role-based nav (student/teacher/tutor/parent/school_admin)
│   │   └── Topbar.jsx        # Page title + active syllabus pill
│   ├── auth/
│   │   └── AuthModal.jsx     # Login/Register with 3 role tabs
│   ├── shared/
│   │   └── Toast.jsx         # Toast notification component
│   └── panels/
│       ├── DashboardPanel.jsx          # 4 role-specific dashboards
│       ├── ChatPanel.jsx               # AI Study Chat with file upload
│       ├── QGenPanel.jsx               # Question paper generator + print
│       ├── EvalPanel.jsx               # Single & bulk evaluation
│       ├── InteractivePracticePanel.jsx # AI practice with instant feedback
│       ├── CurriculumPanel.jsx         # Indian board curriculum hub
│       ├── UKCurriculumPanel.jsx       # UK National Curriculum hub
│       └── OtherPanels.jsx             # QMaster, Institute, Analytics
├── pages/
│   ├── LandingPage.jsx       # Full marketing landing page
│   └── AppPage.jsx           # Authenticated app shell
├── App.jsx                   # Root: shows Landing or App based on auth
└── main.jsx                  # Entry point
```

## Quick Start

```bash
cd vidyai-react
npm install
npm run dev
```

Make sure your Flask backend is running on port 5000. Vite proxies `/api` → `http://localhost:5000`.

## Role-Based Dashboards

| Role         | Dashboard Shows                              | Nav Items                                        |
|-------------|----------------------------------------------|--------------------------------------------------|
| `student`    | Stats, quick cards to all learning tools     | Dashboard, Curriculum, UK Curriculum, Chat, Practice |
| `teacher`    | Stats, teacher-specific quick action cards   | + Question Master, Evaluation Central            |
| `tutor`      | Same as teacher                              | Same as teacher                                  |
| `parent`     | Child progress overview, report links        | Dashboard, Child Progress, Chat, Exam Reports    |
| `school_admin`| Institution stats, user counts, storage    | Dashboard, Institute Manager, Analytics, Eval     |

## What Changed vs Vanilla JS

| Before (Vanilla)                    | After (React)                            |
|------------------------------------|------------------------------------------|
| `let token = localStorage...`       | `AuthContext` with `useAuth()` hook      |
| `document.getElementById()`         | JSX + React state                        |
| `showPanel()` DOM toggle            | `activePanel` state in `AppContext`       |
| `renderSidebar()` innerHTML         | `<Sidebar>` component with role prop     |
| `updateDashUI()` innerHTML          | `<DashboardPanel>` conditional rendering  |
| Global `syllabi`, `docs` vars       | `AppContext` provider                    |
| All in one 6171-line HTML file      | ~20 focused component files              |

## Build for Production (Vercel)

```bash
npm run build
```

Output in `dist/` — deploy directly to Vercel. Set the `VITE_API_BASE` env var if your API is on a different domain:

```env
VITE_API_BASE=https://your-backend.vercel.app/api
```

Then update `src/utils/api.js`:
```js
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'
```

## Backend (Flask — unchanged)

Your `app.py` and `study_assistant.py` require **zero changes**. The React frontend calls the same `/api/...` endpoints as before. Only the `static_folder` reference in `app.py` needs updating to point to React's `dist/`:

```python
app = Flask(__name__, static_folder="../vidyai-react/dist", static_url_path="")
```
