# SyncChat | Enterprise WhatsApp SaaS Platform

SyncChat is a production-ready Enterprise WhatsApp Communication, Shared Inbox, and Automation SaaS platform built on top of the official **Meta WhatsApp Cloud API**.

Built with **Next.js (JavaScript)**, **React**, **Tailwind CSS**, and **MongoDB (Mongoose)**, SyncChat features a multi-tenant architecture where every tenant workspace has isolated data.

---

## 🌟 Tech Stack

- **Framework**: Next.js 14 (JavaScript, React)
- **Styling**: Tailwind CSS (Dark Mode & Glassmorphism Design System)
- **Database**: MongoDB with Mongoose ORM
- **Authentication**: JWT Access & Refresh Tokens (HTTP-Only Cookies), Google OAuth & Facebook OAuth Strategy
- **WhatsApp Integration**: Official Meta WhatsApp Cloud API `v20.0`
- **Deployment**: Vercel Ready (Frontend & Unified API Routes)

---

## 🚀 Key Modules & System Features

### 1. Multi-Tenant Architecture & Security
- **Data Isolation**: All MongoDB collections (`User`, `Company`, `Contact`, `Conversation`, `Message`, `Template`, `Broadcast`, `BotFlow`, `AutomationRule`, `KnowledgeBase`, `Subscription`) feature an indexed `companyId` reference.
- **RBAC**: Dynamic Role & Permission system (`SUPER_ADMIN`, `COMPANY_ADMIN`, `MANAGER`, `AGENT`).
- **Security**: Rate Limiting, Helmet-style security headers, CORS origin protection, & System Audit Logging.

### 2. Official Meta WhatsApp Cloud API Integration
- Connect WABA: Phone Number ID, WABA ID, Permanent Access Token, Webhook Verify Token.
- Outbound Engine: Send Text, Image, Video, Document, Audio, and Pre-Approved Template messages.
- Webhook Engine: Inbound message handler, button replies, interactive list responses, & delivery/read statuses.
- Template Manager: Sync templates live from Meta Graph API & submit new templates.

### 3. Shared Inbox & Customer Communication
- Realtime customer chat threads with unread counts.
- Agent Assignment, Private Internal Team Notes, Pinned Chats, & Thread Statuses (`active`, `archived`, `closed`).
- Contacts Directory with bulk CSV Import & Export.
- Broadcast Campaign Engine with audience filters & delivery rate reports.

### 4. Automation Platform & AI Studio
- **Visual Chatbot Builder**: Node decision tree builder supporting Buttons, Lists, Conditions, Variables, & Webhooks.
- **Automation Rules**: Event triggers (Keywords, New Chat, Tag Added) with delay timers & agent routing.
- **AI Studio**: Knowledge Base context documents, System Prompt Manager, & AI suggested replies.

### 5. Analytics, Billing & Super Admin
- Realtime Message Traffic Charts, Agent Latency, & Delivery Rates.
- SaaS Subscriptions (`FREE`, `PRO`, `ENTERPRISE`), Message Quotas, & Invoices.
- Super Admin Panel for cross-tenant company suspension & global audit logs.

---

## 📂 Project Folder Structure

```
syncChat/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Card.jsx font
│   │       └── Modal.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── controllers/
│   │   ├── aiController.js
│   │   ├── analyticsController.js
│   │   ├── authController.js
│   │   ├── automationController.js
│   │   ├── billingController.js
│   │   ├── broadcastController.js
│   │   ├── chatbotController.js
│   │   ├── companyController.js
│   │   ├── contactController.js
│   │   ├── inboxController.js
│   │   ├── superadminController.js
│   │   ├── templateController.js
│   │   ├── userController.js
│   │   ├── webhookController.js
│   │   └── whatsappController.js
│   ├── lib/
│   │   ├── apiResponse.js
│   │   ├── authMiddleware.js
│   │   ├── db.js
│   │   ├── jwt.js
│   │   ├── metaWhatsAppService.js
│   │   ├── rbac.js
│   │   └── security.js
│   ├── models/
│   │   ├── AuditLog.js
│   │   ├── AutomationRule.js
│   │   ├── BotFlow.js
│   │   ├── Broadcast.js
│   │   ├── Company.js
│   │   ├── Contact.js
│   │   ├── ContactGroup.js
│   │   ├── Conversation.js
│   │   ├── Invoice.js
│   │   ├── KnowledgeBase.js
│   │   ├── Message.js
│   │   ├── Permission.js
│   │   ├── PromptManager.js
│   │   ├── RefreshToken.js
│   │   ├── Role.js
│   │   ├── Subscription.js
│   │   ├── User.js
│   │   ├── WebhookLog.js
│   │   └── WhatsAppTemplate.js
│   ├── pages/
│   │   ├── api/
│   │   ├── dashboard/
│   │   │   ├── ai.jsx
│   │   │   ├── analytics.jsx
│   │   │   ├── automations.jsx
│   │   │   ├── billing.jsx
│   │   │   ├── broadcasts.jsx
│   │   │   ├── chatbot.jsx
│   │   │   ├── company.jsx
│   │   │   ├── contacts.jsx
│   │   │   ├── inbox.jsx
│   │   │   ├── index.jsx
│   │   │   ├── superadmin.jsx
│   │   │   ├── users.jsx
│   │   │   └── whatsapp/
│   │   ├── _app.jsx
│   │   ├── index.jsx
│   │   ├── login.jsx
│   │   └── register.jsx
│   ├── services/
│   │   └── api.js
│   └── styles/
│       └── globals.css
├── .env.example
├── .env.local
├── jsconfig.json
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
└── README.md
```

---

## 🛠️ Environment Variables Setup

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://localhost:27017/syncchat

# JWT Authentication Config
JWT_SECRET=super_secret_jwt_key_syncchat_enterprise_2026
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=super_secret_refresh_key_syncchat_enterprise_2026
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret

# Meta WhatsApp Cloud API Config
META_API_VERSION=v20.0
META_WEBHOOK_VERIFY_TOKEN=syncchat_webhook_verify_token_secure_2026

# Application Domain
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ⚡ Getting Started & Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Start Production Build**:
   ```bash
   npm start
   ```

---

## 🌐 Production Deployment Guide (Vercel)

1. Push your repository to GitHub or GitLab.
2. Import the project into **Vercel**.
3. Configure the environment variables (`MONGODB_URI`, `JWT_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `NEXT_PUBLIC_APP_URL`) in Vercel Project Settings.
4. Deploy! Vercel automatically deploys the Next.js frontend pages and serverless API endpoints.
5. In Meta Developer Console > WhatsApp > Configuration, set your Webhook Callback URL to:
   `https://your-domain.vercel.app/api/webhooks/whatsapp`
