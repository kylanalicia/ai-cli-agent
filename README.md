# Zyra: AI Assistant CLI
A production-ready AI assistant CLI built with Node.js and Google Gemini. Chat, search, generate applications, run code, and authenticate with OAuth device flow. Stores history in PostgreSQL and acts as an autonomous coding agent.

![Login](https://github.com/kylanalicia/ai-cli-agent/blob/e0357c13a2480ff76b1573cdd13ce01d7b178402/Screenshot%20from%202025-11-30%2019-03-02.png)

![Tool](https://github.com/kylanalicia/ai-cli-agent/blob/e0357c13a2480ff76b1573cdd13ce01d7b178402/Screenshot%20from%202025-11-30%2019-06-10.png)

# Features
Conversational AI with Google Gemini integration
Application generation and code execution
OAuth device flow authentication
PostgreSQL history storage
Autonomous coding agent capabilities

# Installation
git clone git@github.com:kylanalicia/ai-cli-agent.git
cd zyra
npm install

# Frontend
cd client
npm run dev

# Backend
cd server
npm run dev

Create .env in the server directory:

# Google Gemini API (Get from aisdk.com)
GOOGLE_GENERATIVE_AI_API_KEY=<your_google_gemini_api_key>
ORBITAI_MODEL=gemini-2.5-flash

# Server Configuration
PORT=<your_port_number>
NODE_ENV=development

# Database
DATABASE_URL=<your_postgresql_database_url>

# Better Auth
BETTER_AUTH_SECRET=<your_better_auth_secret>
BETTER_AUTH_URL=<your_backend_url>

# GitHub OAuth
GITHUB_CLIENT_ID=<your_github_oauth_client_id>
GITHUB_CLIENT_SECRET=<your_github_oauth_client_secret>

# URL Configuration
FRONTEND_URL=<your_frontend_url>
BASE_URL=<your_backend_url>

 CLI Setup
Inside the server directory:

# Make CLI executable and create global symlink
npm run dev:link

# Test the CLI
zyra --version
Available Scripts (Backend)
Script	Purpose
npm start	Run main application
npm run dev	Run with auto-reload
npm run cli	Test CLI locally
npm run dev:link	Setup global CLI link

💻 Usage
After installation, you can use the zyra command globally:

zyra --help    # Show help
zyra --version # Show version
zyra login     # Login to your account
zyra wakeup    # Wake up the AI

