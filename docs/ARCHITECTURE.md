# LIVE Platform — System Architecture & Technical Specifications

> **Tagline:** Everything happens live.

## 1. Executive Summary

**LIVE** is a high-performance, unified video streaming and real-time communication platform engineered for ultra-low latency broadcasting, one-to-one calls, and multi-peer video conferencing.

The platform deliberately emphasizes a **cinematic, human-designed aesthetic** (deep charcoal, dark graphite, subtle surface grays, and a refined coral accent `#e04f38`) avoiding generic AI-generated gradients or bloated widgets.

---

## 2. Architectural Diagram

```
+---------------------------------------------------------------------------------+
|                                 CLIENT TIER                                     |
|  React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion + Lucide React    |
|                                                                                 |
|  +--------------------+  +--------------------+  +---------------------------+  |
|  | Custom Video Player|  | WebRTC Meeting Room|  | Multilingual Comments & UI|  |
|  | - HTML5 Controls   |  | - Camera / Mic     |  | - Real-time Reactions     |  |
|  | - Theater / PiP    |  | - Screen Sharing   |  | - Language Translation    |  |
|  | - Watch Sync       |  | - Host Moderation  |  | - Admin Moderation Queue  |  |
|  +--------------------+  +--------------------+  +---------------------------+  |
+---------------------------------------------------------------------------------+
         | REST API (HTTP/JSON)                             | WebSockets (WSS)
         v                                                  v
+---------------------------------------------------------------------------------+
|                                 SERVER TIER                                     |
|  Node.js + Express + TypeScript + Socket.IO Signaling                           |
|                                                                                 |
|  +-------------------+  +-------------------+  +-----------------------------+  |
|  | Security & Auth   |  | Media Management  |  | Real-Time Signaling         |  |
|  | - JWT Access/Ref  |  | - Partial Stream  |  | - WebRTC P2P Mesh           |  |
|  | - Crypto OTP Hash |  | - Range Headers   |  | - Offer / Answer / ICE      |  |
|  | - Device Fingerpr |  | - Storage Service |  | - Host Remote Controls      |  |
|  | - IST Auto-Theme  |  | - Download Quota  |  | - In-Call Messaging / Chat |  |
|  +-------------------+  +-------------------+  +-----------------------------+  |
+---------------------------------------------------------------------------------+
         |
         | Prisma ORM (Typed Queries & Relational Integrity)
         v
+---------------------------------------------------------------------------------+
|                                DATABASE TIER                                    |
|  PostgreSQL / SQLite Storage Engine                                             |
|  - Users & Profiles                                                             |
|  - Videos & Categories                                                          |
|  - Video Progress (Resume Watch)                                                |
|  - Video Downloads (Server Quota & Audit Records)                               |
|  - Meetings, Participants & Messages                                            |
|  - Multilingual Comments, Reactions & Reports                                   |
|  - Trusted Devices, Active Sessions & Login Audit History                       |
+---------------------------------------------------------------------------------+
```

---

## 3. Technology Stack

### Frontend:
- **Framework:** React 18 with TypeScript and Vite
- **Styling:** Tailwind CSS with custom cinematic color system
- **Motion:** Framer Motion for controlled, natural transitions (2-3s opening intro, reduced motion compliant)
- **Icons:** Lucide React
- **Real-Time Client:** Socket.IO Client + WebRTC MediaStreams

### Backend:
- **Runtime:** Node.js (v20+) with TypeScript
- **HTTP Server:** Express.js with custom middleware (JWT, role guard, Multer, centralized error handling)
- **Real-Time Engine:** Socket.IO for WebSockets & WebRTC signaling
- **Database Layer:** Prisma ORM with unified schema for SQLite and PostgreSQL
- **Security:** Bcrypt (12 salt rounds), SHA-256 OTP hashing, timing-safe equality, JWT access + refresh rotation
- **Hardware/Geo Parser:** UAParser for browser/OS/device fingerprinting

---

## 4. Key Functional Subsystems

### A. Authentication & Device Security
1. **IST Login-Time Theme**:
   - Time calculations evaluate Indian Standard Time (UTC+5:30).
   - 5:00 AM to 12:00 PM IST selects Light theme automatically.
   - All other login hours select Dark theme automatically.
   - Manual override toggle persists in user preferences across sessions.
2. **Untrusted Device Verification**:
   - Deterministic device fingerprinting via user-agent characteristics.
   - Any login attempt from an unverified fingerprint triggers an automatic email OTP challenge before issuing session tokens.
   - Users can review and revoke active sessions or remove trusted devices.
3. **Login History Audit**:
   - Records IP, browser, version, operating system, device model, city, country, status, and failure reason.

### B. Custom Video Player
- Completely custom HTML5 controls (no browser default controls).
- Play/Pause, Volume slider, Mute toggle, 10s Backward/Forward, 30s seek shortcuts.
- Playback speeds: 0.5x, 1x, 1.25x, 1.5x, 2x.
- Theater Mode, Fullscreen, and Picture-in-Picture (PiP).
- Subtitle toggle, remaining playback time display, timeline hover preview timestamp.
- End-of-video autoplay countdown with instant cancellation.
- Periodic watch progress synchronization (resumes position and marks complete at 90%).

### C. WebRTC Real-Time Conferencing
- Unique room generation (`/meeting/:roomCode`).
- One-to-one and multi-peer group mesh calling.
- Camera and microphone controls with speaking indicators.
- High-definition screen sharing with automatic video track swapping.
- Floating emoji reactions and live in-call messaging drawer.
- Host controls: forced participant mute, kick participant, lock room, manage screen-share/chat permissions.

### D. Video Download Management
- Secure server-side authorization check before downloading.
- Configurable daily limit per user (default 10 downloads/day, customizable by Admin).
- Full audit log recording file size, date, status (Completed, Failed, Processing), IP, and device.
- Explicit exclusion of payment gateways or subscription tiers.

### E. Multilingual Commenting System
- Rich discussion threads with @username mentions and nested replies.
- Like and Dislike toggle reactions.
- Spam, duplicate comment, and malicious link heuristics.
- One-click **Translate** button utilizing a backend translation abstraction service for multi-language conversion (Spanish, Hindi, French, German, Japanese, English).
- Report modal with predefined reasons placed into the Administrator review queue.

### F. Administrator Dashboard
- Real-time platform metrics (users, active accounts, total video views, downloads, live rooms, pending reports).
- User directory with search, account deactivation, role adjustment, and download limit assignment.
- Broadcast video management and upload trigger.
- Moderation queue for review and deletion of reported comments.
- Download audit and security login logs.

