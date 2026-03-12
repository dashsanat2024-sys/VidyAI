---
description: how to run the EduMind application
---

Follow these steps to start the EduMind AI Study Assistant on your local machine.

### Prerequisites
- Python 3.10 or higher
- An OpenAI API key (already configured in `.env`)

### Steps to Run

1. **Navigate to the project directory:**
   ```bash
   cd /Users/sanat/Downloads/eduMind/synapseAI
   ```

2. **Run the start script:**
   // turbo
   ```bash
   bash start.sh
   ```

   *Note: This script automatically activates the virtual environment, installs any missing dependencies, and starts the Flask server.*

3. **Access the application:**
   Open your browser and go to: [http://localhost:5000](http://localhost:5000)

### Login Credentials
| Role    | Email                | Password   |
|---------|----------------------|------------|
| Student | student@edumind.com  | password   |
| Tutor   | tutor@edumind.com    | password   |
| Admin   | admin@edumind.com    | password   |

---
**Troubleshooting:**
- If port 5000 is in use, you can kill the process using: `lsof -ti :5000 | xargs kill -9`
- Ensure your `.env` file contains a valid `OPENAI_API_KEY`.
