# LIVE Platform — REST API & Socket Signaling Documentation

Base URL: `/api/v1`

---

## 1. Authentication Endpoints (`/auth`)

### `POST /auth/register`
Register a new user account.
- **Body:** `{ email, username, password, displayName }`
- **Response:** `{ success, userId, email, requiresVerification, message }`

### `POST /auth/login`
Authenticate with email/username and password.
- **Body:** `{ emailOrUsername, password }`
- **Response (Trusted Device):** `{ success, requiresOtp: false, accessToken, refreshToken, user }`
- **Response (New Device):** `{ success, requiresOtp: true, purpose: "LOGIN_NEW_DEVICE", email, devOtp }`

### `POST /auth/verify-otp`
Verify a 6-digit numeric OTP code.
- **Body:** `{ email, otp, purpose }`
- **Response:** `{ success, accessToken, refreshToken, user }`

### `POST /auth/resend-otp`
Request a new verification code.
- **Body:** `{ email, purpose }`

### `POST /auth/refresh`
Rotate refresh token and obtain fresh access token.
- **Body:** `{ refreshToken }`

### `POST /auth/logout`
Revoke active session refresh token.
- **Body:** `{ refreshToken }`

### `GET /auth/sessions` (Auth Required)
List all active devices and sessions for authenticated user.

### `DELETE /auth/sessions/:sessionId` (Auth Required)
Revoke a specific active session.

### `GET /auth/trusted-devices` (Auth Required)
List user's verified devices.

### `DELETE /auth/trusted-devices/:deviceId` (Auth Required)
Remove device from trusted list.

### `GET /auth/login-history` (Auth Required)
List recent login attempts with IP, browser, and outcome.

---

## 2. Video Endpoints (`/videos`)

### `GET /videos`
List published videos with filters and pagination.
- **Query Params:** `page`, `limit`, `search`, `categoryId`, `sortBy` (`newest`, `popular`, `duration`)

### `GET /videos/categories`
Retrieve all available video categories with count.

### `GET /videos/:idOrSlug`
Retrieve detailed video metadata and personal watch progress.

### `GET /videos/continue-watching` (Auth Required)
Retrieve partially watched videos for logged-in user.

### `POST /videos/progress` (Auth Required)
Sync playback timestamp.
- **Body:** `{ videoId, progressSeconds, durationSeconds }`

### `POST /videos/downloads/:id/authorize` (Auth Required)
Verify daily download limit and authorize file download.
- **Response:** `{ success, authorization: { downloadId, videoUrl, videoTitle, remainingToday } }`

### `PATCH /videos/downloads/:downloadId/complete` (Auth Required)
Mark download status as completed in audit records.

### `GET /videos/downloads/history` (Auth Required)
Retrieve user's personal download history.

### `POST /videos/upload` (Auth Required, Creator/Admin)
Upload new broadcast with multipart video file and thumbnail.

---

## 3. Comment Endpoints (`/comments`)

### `GET /comments/video/:videoId`
List discussion comments and nested replies.
- **Query Params:** `sortBy` (`newest`, `oldest`, `liked`)

### `POST /comments` (Auth Required)
Post a comment or reply to an existing comment.
- **Body:** `{ videoId, content, parentCommentId? }`

### `PUT /comments/:id` (Auth Required)
Edit existing comment (author only).

### `DELETE /comments/:id` (Auth Required)
Delete comment (author or admin only).

### `POST /comments/:id/react` (Auth Required)
Toggle like or dislike reaction.
- **Body:** `{ type: "LIKE" | "DISLIKE" }`

### `POST /comments/:id/translate`
Translate comment into user's target language.
- **Body:** `{ targetLanguage: "es" | "fr" | "hi" | "de" | "ja" | "en" }`

### `POST /comments/:id/report` (Auth Required)
Report inappropriate comment to administrator moderation queue.
- **Body:** `{ reason, details }`

---

## 4. Real-Time Meeting Endpoints (`/meetings`)

### `POST /meetings` (Auth Required)
Create a new video conferencing room.
- **Body:** `{ title, description?, maxParticipants, screenShareAllowed, chatAllowed }`
- **Response:** `{ success, meeting: { roomCode, ... }, webrtcConfig }`

### `GET /meetings/:roomCode`
Get meeting room details and STUN/TURN ICE server configuration.

### `POST /meetings/:id/end` (Host Only)
End active conference session.

---

## 5. Administrator Endpoints (`/admin` - Admin Role Required)

### `GET /admin/dashboard`
Overall statistics: registered users, active users, total videos, views, downloads, live rooms, reports.

### `GET /admin/users`
User directory with search and pagination.

### `PATCH /admin/users/:id/active`
Activate or deactivate a user account.

### `PATCH /admin/users/:id/download-limit`
Adjust user's daily download limit.

### `GET /admin/reports`
List pending flagged comments.

### `POST /admin/reports/:id/resolve`
Resolve report: action `DISMISS` or `DELETE_COMMENT`.

### `GET /admin/downloads`
Global download audit logs.

### `GET /admin/logins`
Global security login audit logs.

---

## 6. Socket.IO Real-Time Signaling Events

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join-room` | Client -> Server | `{ roomCode, userId, name, avatarUrl }` | Join meeting room |
| `room-joined` | Server -> Client | `{ roomCode, isHost, role, permissions, self, participants }` | Initial room state & peer list |
| `participant-joined` | Server -> Client | `{ participant }` | Notify peers of new member |
| `webrtc-offer` | Bidirectional | `{ targetSocketId, offer }` | WebRTC SDP offer |
| `webrtc-answer` | Bidirectional | `{ targetSocketId, answer }` | WebRTC SDP answer |
| `webrtc-ice-candidate`| Bidirectional | `{ targetSocketId, candidate }` | WebRTC ICE network candidate |
| `update-media-state` | Client -> Server | `{ isMuted, isVideoOff, isScreenSharing, isHandRaised }` | Local state changes |
| `send-meeting-message`| Client -> Server | `{ content, fileUrl, fileName }` | Send in-call chat message |
| `send-reaction` | Client -> Server | `{ emoji }` | Send floating live reaction |
| `host-mute-participant`| Client -> Server | `{ targetSocketId }` | Host forces peer mute |
| `host-kick-participant`| Client -> Server | `{ targetSocketId }` | Host removes peer from call |
| `leave-room` | Client -> Server | None | Gracefully exit meeting |
