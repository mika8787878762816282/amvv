# AMG Rénovation - Management System

Complete management ecosystem for a renovation business.

## Features

- **WhatsApp AI Agent**: Dashboard to monitor customer conversations.
- **Appointments Calendar**: Manage site visits and client meetings.
- **Quotes & Invoices**: Fast generation, tracking, and conversion from quote to invoice.
- **AlloVoisin & Facebook Leads**: Automated scraping and AI qualification of prospects.
- **AI Visualisation**: Transform project photos using Gemini (via N8N).
- **Automated Reviews**: Follow-up system for customer reviews with bulk request feature.
- **File Explorer**: Integrated document management with Supabase Storage.
- **Voice Commands**: Navigate the dashboard hands-free.
- **Debug Console**: Advanced log monitoring for developers.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Database, Auth, Storage)
- **Automation**: N8N (Workflows for PDF, AI, and Notifications)

## Setup Instructions

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_N8N_WEBHOOK_BASE=https://your-n8n-instance.com/webhook
   ```
4. **Run the development server**: `npm run dev`

## N8N Workflow Integration

Individual webhook paths can be configured in the **Settings** tab of the dashboard:
- `/generer-devis`
- `/visualisation-ia`
- `/demande-avis-client`
- ...

## Documentation & Walkthrough

Refer to the `brain` directory for the detailed implementation plan and feature walkthrough.
