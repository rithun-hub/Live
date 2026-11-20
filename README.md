# LIVE — Complete Full-Stack Video Streaming & Real-Time Communication Platform

> **Everything happens live.**

LIVE is a production-oriented, full-stack video streaming and real-time communication platform. It combines high-fidelity broadcast streaming, WebRTC one-to-one and group video conferencing, authorized video downloads, multilingual comments with on-the-fly translation, personalized watch history, device security verification, and a comprehensive administrator dashboard.

---

## Key Features

1. **Brand Identity & Cinematic Opening Experience**:
   - Refined brand emblem and wordmark.
   - 2.5-second cinematic opening transition with smooth opacity and tagline reveal.
   - Reduced-motion accessibility and session-persistence.
2. **Custom HTML5 Video Player**:
   - Zero browser default controls.
   - Play/pause, volume slider, mute, 10s seek, 30s seek shortcuts.
   - Speeds (0.5x, 1x, 1.25x, 1.5x, 2x), Theater mode, Picture-in-Picture, Fullscreen, Subtitles.
   - Hover preview timeline timestamp, buffering/loading spinner, next video countdown.
   - Periodic watch history synchronization (resumes position, marks complete at 90%).
3. **WebRTC Real-Time Video Calling**:
   - Multi-peer conferencing via Socket.IO signaling and STUN/TURN traversal.
   - Camera & microphone toggles, front/rear switching on supported mobile devices.
   - High-definition screen sharing with automatic track replacement.
   - In-call chat drawer, hand raise, floating emoji reactions, and participant list.
   - Host controls: Mute participant, remove participant, lock/unlock room, permission switches.
4. **Video Download Management**:
   - Registered users can download full-quality broadcasts.
   - Server-side download authorization checking configurable daily download limits.
   - Download history table with file sizes, timestamps, status badges, and device details.
   - *Strictly excludes payment gateways, subscription plans, or paid tiers.*
5. **Authentication, Account Security & IST Login Theme**:
   - JWT authentication with secure password hashing and refresh token rotation.
   - **IST Login-Time Theme**: Automated evaluation of Indian Standard Time (UTC+5:30):
     - 5:00 AM – 12:00 PM: Light theme.
     - All other hours: Dark theme.
     - Persists manual user override across sessions.
   - **Untrusted Device Verification**: Any login detected from an unrecognized browser/device triggers an email OTP challenge.
   - Active session revocation and trusted device management.
   - Full login audit history (IP address, browser, OS, device, status).
6. **Multilingual Commenting System**:
   - Top-level comments and nested reply threads with @username mentions.
   - Like and dislike reactions.
   - Built-in spam, duplicate comment, and malicious link filtering.
   - One-click **Translate** button translating comments into user's language (Spanish, Hindi, French, German, Japanese, English).
   - Report comment modal with predefined reasons feeding the administrator moderation queue.
7. **Administrator Control Console**:
   - Real-time platform statistics (users, active accounts, video views, downloads, live rooms, reports).
   - User directory with account activation/deactivation and download limit adjustments.
   - Broadcast video management and upload tool.
   - Comment moderation queue for resolving or deleting reported comments.
   - Download audit and security login logs.

---

## Seed Accounts (Ready for Testing)

| Role | Email | Password | Daily Limit | Permissions |
|---|---|---|---|---|
| **Administrator** | `admin@live.tv` | `LiveAdmin123!` | 50 / day | Full platform management, uploads, moderation |
| **Creator** | `creator@live.tv` | `LiveCreator123!` | 25 / day | Broadcast uploads, studio management |
| **Standard User** | `user@live.tv` | `LiveUser123!` | 10 / day | Streaming, downloads, meetings, comments |

*Note: A quick-fill button for each demo account is available directly on the login screen.*

---

## Project Structure

```
live/
├── client/                     # Vite + React + TypeScript + Tailwind CSS Frontend
│   ├── src/
│   │   ├── components/         # Brand, Layout, Player, Comments, Modals, Video cards
│   │   ├── contexts/           # AuthContext & ThemeContext (IST auto-theme)
│   │   ├── pages/              # Home, Explore, Watch, Meetings, Room, Downloads, Admin...
│   │   ├── services/           # API fetch client & Socket.IO client
│   │   ├── types/              # TypeScript interfaces
│   │   ├── App.tsx             # Route definitions & protected routes
│   │   ├── index.css           # Tailwind base styles & theme variables
│   │   └── main.tsx            # App bootstrap
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Node.js + Express + TypeScript + Socket.IO Backend
│   ├── src/
│   │   ├── config/             # Environment & Prisma client instance
│   │   ├── controllers/        # Auth, Video, Comment, Meeting, Admin, User controllers
│   │   ├── middleware/         # JWT Auth, Role guards, Multer upload, Error handler
│   │   ├── routes/             # REST API routes
│   │   ├── services/           # Business logic & external service abstractions
│   │   ├── sockets/            # WebRTC Socket.IO signaling handler
│   │   ├── utils/              # Password, JWT, Crypto OTP, UAParser geo, Local storage
│   │   ├── validators/         # Zod request validation schemas
│   │   ├── tests/              # End-to-end integration test suite
│   │   └── app.ts              # Express + HTTP + Socket.IO server entry
│   ├── prisma/
│   │   ├── schema.prisma       # SQLite zero-setup database schema
│   │   ├── schema.postgresql.prisma # PostgreSQL compatible schema
│   │   └── seed.ts             # Rich production seed script
│   └── package.json
│
├── storage/                    # Local media storage abstraction
│   └── uploads/                # Videos, thumbnails, avatars, attachments
├── docs/                       # Architecture and API documentation
│   ├── ARCHITECTURE.md
│   └── API_DOCUMENTATION.md
├── .gitignore
├── README.md
└── package.json                # Workspace scripts
```
