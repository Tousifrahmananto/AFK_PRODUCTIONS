<div align="center">

# 🎮 AFK Productions

### *Stay AFK — We Handle the Rest*

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

A full-stack esports tournament management platform built for teams, players, sponsors and admins — with real-time notifications, bracket generation, media galleries and ad campaign tracking all in one place.

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Roles and Permissions](#-roles-and-permissions)
- [Real-Time System](#-real-time-system)
- [Bracket Engine](#-bracket-engine)
- [File Uploads](#-file-uploads)
- [Data Models](#-data-models)
- [Frontend Pages](#-frontend-pages)
- [Contributing](#-contributing)

---

## 🌐 Overview

AFK Productions is a production-grade competitive gaming platform that handles the full lifecycle of an esports tournament. From creating events and managing team rosters to running automated brackets and tracking per-match player statistics — everything is handled inside one cohesive system.

Sponsors and partners can run targeted ad campaigns, admins can moderate users and publish media galleries and players always stay in the loop through live socket-powered notifications.

---

## ✨ Features

### 🏆 Tournament Management
- Create, edit and delete tournaments with custom rules, prize pools and entry fees
- Supports **Single Elimination**, **Double Elimination** and **Round Robin** brackets
- Configurable registration deadlines, player limits and team limits
- Tournament status lifecycle: `Upcoming → Live → Completed`
- Solo player and team-based registration flows

### 🧩 Bracket Engine
- Automated bracket generation with Fisher-Yates shuffle (run 3× for true randomness)
- Power-of-two padding with automatic bye promotion
- Match result recording by admins that auto-advances winners
- Bracket visibility gated until registration closes or slots fill

### 👥 Team System
- Team creation and management for the `TeamManager` role
- Captain-only tournament registration on behalf of the team
- Team profiles with logo, bio, region, socials and game tags
- Configurable visibility (`public` or `private`) and max roster size

### 📊 Leaderboard and Stats
- Per-match player stats: kills, deaths, assists and score
- Aggregated leaderboard with KD ratio and KDA across all tournaments
- Admin stats entry panel per match and per round

### 📸 Media Gallery
- Upload images and videos tied to specific tournaments and matches
- Category tagging, game filtering and text search on title and description
- Visibility controls: `Public`, `Unlisted` and `Private`
- Admin media management page and per-match media panel
- Static file serving from `backend/uploads/`

### 📢 Ad Campaigns
- Sponsors and partners create targeted campaigns per game or tournament
- Placement categories: `Homepage`, `Tournament`, `Gallery`, `Sidebar` and `Header`
- Impression and click tracking built-in
- Campaign statuses: `Draft → Active → Paused → Ended`
- `AdSlot` component auto-fetches relevant active ads per page context

### 🔔 Real-Time Notifications
- Socket.IO-powered live notifications pushed to individual users
- Unread badge counter in the Navbar updates without page refresh
- Full notifications page with mark-read controls

### 🔐 Auth and Roles
- JWT-based authentication with tokens stored in `localStorage`
- Role-based access control enforced on both backend middleware and frontend route guards
- Admin-only moderation: ban/unban users and manage role assignments

---

## 🛠 Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime environment |
| Express | 5.1.0 | HTTP server and routing |
| Mongoose | 8.17.0 | MongoDB ODM |
| MongoDB driver | 6.21.0 | Low-level DB access |
| Socket.IO | 4.8.1 | Real-time WebSocket server |
| Multer | 2.0.2 | Multipart file upload handling |
| jsonwebtoken | ^9.0.2 | JWT signing and verification |
| bcryptjs | ^3.0.2 | Password hashing |
| cors | 2.8.5 | Cross-origin request handling |
| dotenv | 17.2.1 | Environment variable loading |
| nodemon | 3.1.10 | Dev auto-reload |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 19.1.1 | UI component framework |
| React Router DOM | 7.7.1 | Client-side routing |
| Axios | 1.11.0 | HTTP client for API calls |
| Socket.IO Client | 4.8.1 | Real-time WebSocket client |
| Tailwind CSS | 4.1.11 | Utility-first CSS framework |
| PostCSS and Autoprefixer | — | CSS build pipeline |
| react-scripts | ^5.0.1 | CRA build tooling |
| Testing Library | — | Unit and integration testing |

---

## 📁 Project Structure

```
AFK_PRODUCTIONS/
│
├── backend/
│   ├── server.js                  # Express + Socket.IO entry point
│   ├── config/
│   │   └── db.js                  # Mongoose connection utility
│   ├── controllers/               # Route logic (8 controllers)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── tournamentController.js
│   │   ├── teamController.js
│   │   ├── notificationController.js
│   │   ├── mediaController.js
│   │   ├── adController.js
│   │   └── leaderboardController.js
│   ├── models/                    # Mongoose schemas (6 models)
│   │   ├── User.js
│   │   ├── Tournament.js
│   │   ├── Team.js
│   │   ├── PlayerStat.js
│   │   ├── Media.js
│   │   └── AdCampaign.js
│   ├── routes/                    # Express route definitions (8 files)
│   ├── middlewares/
│   │   ├── authMiddleware.js      # JWT protect + requireRole
│   │   └── adminMiddleware.js     # Admin-only gate
│   ├── utils/
│   │   └── uploader.js            # Multer disk storage config
│   └── uploads/                   # Stored media files
│       ├── images/
│       └── videos/
│
└── frontend/
    ├── public/
    │   └── index.html             # SPA shell
    └── src/
        ├── index.js               # React root and AuthProvider
        ├── App.js                 # React Router with all routes
        ├── socket.js              # Socket.IO client factory
        ├── context/
        │   └── AuthContext.js     # JWT + user session state
        ├── components/            # Reusable components (8)
        │   ├── Navbar.js
        │   ├── Dashboard.js
        │   ├── AdSlot.js
        │   ├── ProfileCard.js
        │   ├── ProtectedRoute.js
        │   ├── ToastHost.js
        │   └── TournamentCard.js
        ├── pages/                 # Route-level pages (19)
        └── services/              # Axios API service modules (8)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local instance or MongoDB Atlas)
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Tousifrahmananto/AFK_PRODUCTIONS.git
cd AFK_PRODUCTIONS
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with the required variables (see [Environment Variables](#-environment-variables)).
You can copy `backend/.env.example` as a starting point. A working MongoDB connection is required before the API listens.

```bash
npm run dev
```

The API server starts on `http://localhost:5000` by default.

### 3. Set up the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

The React app starts on `http://localhost:3000`.
For a different API address, copy `frontend/.env.example` to `frontend/.env.local` and set `REACT_APP_API_URL` (with or without the `/api` suffix). Restart the frontend after changing environment variables.

---

## 🔑 Environment Variables

Create `backend/.env` with the following:

```env
MONGO_URI=mongodb://localhost:27017/afk_productions
JWT_SECRET=your_super_secret_key
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
```

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key used to sign and verify JWTs |
| `PORT` | Port the Express server listens on (default `5000`) |
| `CLIENT_ORIGIN` | Frontend origin for CORS (default `http://localhost:3000`) |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive a JWT |

### Users
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/:id` | Get user profile |
| `PUT` | `/api/users/:id` | Update user profile |

### Tournaments
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/tournaments` | List all tournaments | Public |
| `POST` | `/api/tournaments/create` | Create a tournament | Admin |
| `PUT` | `/api/tournaments/:id` | Update tournament | Admin |
| `DELETE` | `/api/tournaments/:id` | Delete tournament | Admin |
| `POST` | `/api/tournaments/:id/generate-bracket` | Generate bracket | Admin |
| `GET` | `/api/tournaments/:id/bracket` | View bracket | Protected |
| `POST` | `/api/tournaments/:id/bracket/match-result` | Set match winner | Admin |
| `POST` | `/api/tournaments/:id/register-solo` | Register as solo player | Player |
| `POST` | `/api/tournaments/:id/register-team` | Register team | TeamManager |
| `DELETE` | `/api/tournaments/:id/unregister-solo` | Unregister solo | Player |
| `DELETE` | `/api/tournaments/:id/unregister-team` | Unregister team | TeamManager |

### Teams
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/teams` | List teams | Public |
| `POST` | `/api/teams` | Create a team | TeamManager |
| `PUT` | `/api/teams/:id` | Update team | Captain |
| `DELETE` | `/api/teams/:id` | Delete team | Captain/Admin |

### Match Stats and Media
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/tournaments/:id/matches/:r/:m/player-stats` | Get match stats | Protected |
| `POST` | `/api/tournaments/:id/matches/:r/:m/player-stats` | Submit match stats | Admin |
| `GET` | `/api/tournaments/:id/matches/:r/:m/media` | Get match media | Protected |
| `POST` | `/api/tournaments/:id/matches/:r/:m/media` | Upload match media | Admin |

### Media Gallery
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/media` | Public media gallery | Public |
| `POST` | `/api/media` | Upload media | Admin |
| `DELETE` | `/api/media/:id` | Delete media | Admin |

### Ads
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/ads` | Fetch active ads for placement | Public |
| `POST` | `/api/ads` | Create ad campaign | Sponsor/Partner/Admin |
| `PUT` | `/api/ads/:id` | Update ad campaign | Owner/Admin |
| `DELETE` | `/api/ads/:id` | Delete ad campaign | Owner/Admin |
| `POST` | `/api/ads/:id/click` | Track ad click | Public |

### Leaderboard and Notifications
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/leaderboard/players` | Aggregated player leaderboard | Public |
| `GET` | `/api/notifications` | List user notifications | Protected |
| `POST` | `/api/notifications/read-all` | Mark all notifications read | Protected |
| `POST` | `/api/notifications/:id/read` | Mark one notification read | Protected |

---

## 🔐 Roles and Permissions

| Role | Access |
|---|---|
| **Admin** | Full access to all features including tournament management, bracket generation, match results, user moderation and media admin |
| **Player** | Browse and register in tournaments solo, view brackets and leaderboard |
| **TeamManager** | All player access plus team creation and captain-level tournament registration |
| **Sponsor / Partner** | Create and manage their own ad campaigns with impression and click analytics |

Roles are enforced at the API level via `requireRole` middleware and on the frontend via `ProtectedRoute` components.

---

## ⚡ Real-Time System

AFK Productions uses **Socket.IO** for live in-app notifications.

**Flow:**
1. After login the frontend establishes a socket connection using the `makeSocket(userId)` factory in `socket.js`
2. The client emits `identify: { userId }` so the server places the socket in a dedicated `user:<id>` room
3. When a notification event is triggered (e.g. match result posted or tournament registration confirmed) the backend pushes a `notify` event to that user's room
4. The `Navbar` component listens for `notify` events and increments the unread badge counter instantly without any page refresh

---

## 🎲 Bracket Engine

The bracket system is built inside `tournamentController.js` and supports:

- **Fisher-Yates shuffle** applied 3 times for seeding fairness
- **Power-of-two padding** with byes to fill incomplete brackets
- **Bye promotion** — solo entrants who receive a bye automatically advance one round
- **Admin match result recording** via `setMatchResult` which writes the winner into the next round's slot and handles the final round winner
- **Bracket visibility rules** — non-admins cannot view the bracket until registration is closed, the deadline has passed or all slots are filled

---

## 📤 File Uploads

Uploads are handled by Multer configured in `backend/utils/uploader.js`.

| Setting | Value |
|---|---|
| Image directory | `backend/uploads/images/` |
| Video directory | `backend/uploads/videos/` |
| Max file size | 200 MB |
| Allowed image types | PNG, JPEG, WEBP, GIF |
| Allowed video types | MP4, WebM, OGG, QuickTime |
| Filename format | `{timestamp}_{sanitizedOriginalName}{ext}` |

Uploaded files are served statically from the `/uploads` route on the Express server.

---

## 🗄 Data Models

### User
```
username      String (unique)
email         String (unique)
password      String (hashed with bcrypt)
role          Enum: Admin | Player | TeamManager | Sponsor | Partner
team          Ref: Team
banned        Boolean
bannedReason  String
bannedAt      Date
```

### Tournament
```
title                String
game                 String
bracket              Enum: Single Elimination | Double Elimination | Round Robin
startDate            Date
endDate              Date
registrationDeadline Date
playerLimit          Number
teamLimit            Number
status               Enum: Upcoming | Live | Completed
registrationOpen     Boolean
soloPlayers[]        Ref: User
teams[]              Ref: Team
bracketData          Object (generated bracket structure)
prizePool            String
entryFee             Number
```

### Team
```
teamName      String
captain       Ref: User
members[]     Ref: User
game          String
logoUrl       String
bio           String (max 600 chars)
region        String
socials       { website, discord, twitter, youtube }
maxMembers    Number (1–20)
visibility    Enum: public | private
status        Enum: active | disbanded
```

### PlayerStat
```
tournament    Ref: Tournament
user          Ref: User
roundIndex    Number
matchIndex    Number
kills         Number
deaths        Number
assists       Number
score         Number
```

### Media
```
tournament    Ref: Tournament
matchId       String (e.g. "r=0&m=1")
kind          Enum: video | image
title         String
description   String
filePath      String
externalUrl   String
thumbnailUrl  String
category      String
game          String
tags[]        String
visibility    Enum: Public | Unlisted | Private
uploadedBy    Ref: User
```

### AdCampaign
```
owner         Ref: User
category      Enum: Homepage | Tournament | Gallery | Sidebar | Header
gameFilter    String
tournament    Ref: Tournament (optional targeting)
title         String
imageUrl      String
linkUrl       String
startDate     Date
endDate       Date
status        Enum: Draft | Active | Paused | Ended
impressions   Number
clicks        Number
```

---

## 🖥 Frontend Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Landing page with animated tagline and auth links |
| Login | `/login` | Login form |
| Register | `/register` | Registration form |
| Tournaments | `/tournaments` | Browse and register for tournaments |
| Tournament Browse | `/tournaments/browse` | Alternate tournament listing view |
| Bracket | `/tournaments/:id/bracket` | Visual tournament bracket |
| Create Tournament | `/tournaments/create` | Admin form to create a tournament |
| Create Team | `/teams/create` | TeamManager team creation form |
| My Team | `/teams/mine` | TeamManager team management panel |
| Profile | `/profile/:id` | User profile view |
| Media Gallery | `/gallery` | Public media gallery |
| Admin Media | `/admin/media` | Admin media upload and management |
| Admin Match Media | `/admin/matches/:id/media` | Per-match media panel |
| Admin Match Stats | `/admin/matches/:id/stats` | Per-match player stats entry |
| Admin Moderation | `/admin/users` | Ban/unban users and manage roles |
| Leaderboard | `/leaderboard` | Aggregated KD and KDA rankings |
| My Ads | `/ads/mine` | Sponsor and partner ad campaign manager |
| Notifications | `/notifications` | Full notifications list |
| Player List | `/players` | Browse all registered players |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "add your-feature-name"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a pull request against `main`

Please keep commits scoped and write clear PR descriptions. Run `npm test` in the frontend before submitting.

---

<div align="center">

Made with ❤️ by the AFK Productions team

</div>
