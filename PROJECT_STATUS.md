# Smart Tourist Safety Monitoring & Incident Response System 🛡️
## Comprehensive Project Overview & Feature Status Report

---

## 📌 Executive Summary

The **Smart Tourist Safety Monitoring & Incident Response System** is a multi-tier digital ecosystem designed to ensure visitor safety, rapid emergency response, and secure identity management—especially tailored for high-risk and remote tourist destinations like the Northeast and mountainous/forest regions of India.

The ecosystem comprises **three unified services**:
1. **Backend API Service (`/backend`)**: Express.js, TypeScript, PostgreSQL (Neon), Prisma ORM, Socket.IO, JWT Auth.
2. **Tourism & Police Command Dashboard (`/dashboard`)**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Recharts, Leaflet GIS Maps, TanStack Query, Jotai/Recoil State Management.
3. **Tourist Mobile Application (`/mobile`)**: React Native Expo (SDK 54), TypeScript, NativeWind (Tailwind CSS for React Native), Expo Location, TanStack Query, Jotai State Management.

---

## 🛠️ Tech Stack & Standards Across All 3 Services

To ensure maintainability, scalability, and code hygiene, all three services follow consistent engineering guidelines:

| Layer | Backend (`/backend`) | Web Dashboard (`/dashboard`) | Mobile App (`/mobile`) |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript (v5+) | TypeScript (v5+) | TypeScript (v5+) |
| **Framework** | Node.js + Express.js | Next.js 16 (App Router) | React Native Expo (SDK 54) |
| **Styling / UI** | N/A | Tailwind CSS + Radix / Shadcn UI | NativeWind (Tailwind CSS) |
| **State Management** | Node in-memory / Socket state | Jotai / Recoil Atoms | Jotai / Recoil Atoms |
| **Async & Data Fetching**| Async Controllers | TanStack Query (React Query v5) | TanStack Query (React Query v5) |
| **Database & ORM** | Neon DB (PostgreSQL) + Prisma ORM | API Requests to Backend | API Requests to Backend |
| **Real-time Engine** | Socket.IO Server | Socket.IO Client | Socket.IO Client |
| **Architecture** | Modular Feature-First (`/features/*`) | Feature-Driven Modular (`/features/*`) | Modular App Router (`/app`, `/atoms`, `/components`) |

---

## 📊 Feature Implementation Matrix (Problem Statement Mapping)

Below is the status breakdown of the project against every requirement outlined in the official problem statement:

| Module / Requirement | Problem Statement Scope | Current Status | Implemented Components | Gaps / Remaining Work |
| :--- | :--- | :--- | :--- | :--- |
| **1. Digital Tourist ID Platform** | Blockchain-backed digital ID, Aadhaar/Passport KYC, trip itinerary, QR code verification, visit duration validity. | 🟡 **PARTIAL** | Prisma `DigitalID` schema, QR display on mobile profile, verification dashboard page (`/id-verification`), mock API endpoint (`/api/tourist-id/:id`). | Real blockchain smart contract / cryptographic hash hashing on-chain, automated KYC verification API integration (Aadhaar/Passport OCR). |
| **2. Mobile App (Tourist)** | Safety score, geo-fencing alerts, panic button with location dispatch, opt-in tracking. | 🟢 **MOSTLY DONE** | React Native Expo app with tabs (`(tabs)/index`, `map`, `safety`, `alerts`, `incidents`, `profile`), Panic SOS UI, safety score calculation UI, geo-alert feed. | Real-time continuous background location service (Expo Location task manager), auto-call/SMS emergency contact trigger. |
| **3. AI-Based Anomaly Detection** | Detect location drop-offs, prolonged inactivity, route deviation, distress behavior. | 🟡 **PARTIAL** | Prisma schema for `AIAlert` & `SafetyScore`, severity models, risk factor definitions. | ML/AI anomaly detection engine (Python microservice / Node worker) to process raw telemetry streams for silent drop-offs & inactivity. |
| **4. Police & Tourism Dashboard** | Real-time tourist clusters, heat maps, incident command, alert history, E-FIR generation. | 🟢 **MOSTLY DONE** | Next.js 16 dashboard with Leaflet map, district GeoJSON boundaries, real-time incident lifecycle management, officer assignments, Recharts analytics, administrative hierarchy (L1-L4). | Automated E-FIR PDF generation engine, Leaflet WebGL real-time heat map overlay for tourist density. |
| **5. IoT Integration (Optional)** | Smart bands/tags for high-risk zones, continuous health/location signals, manual SOS. | 🟡 **PARTIAL** | Prisma schema models for `Device` and `DeviceTelemetry` (battery, signal, timestamp). | Hardware BLE / MQTT broker ingestion pipeline for streaming telemetry from physical smart bands. |
| **6. Multilingual & Accessibility** | 10+ Indian languages + English, voice/text emergency access for elderly/disabled. | 🔴 **PENDING** | UI framework ready for strings localization. | `react-i18next` integration across dashboard & mobile, voice command emergency trigger (Web Speech API / Speech-to-Text). |
| **7. Data Security & Privacy** | End-to-end encryption, data protection compliance, tamper-proof blockchain records. | 🟡 **PARTIAL** | Helmet security, bcrypt password hashing, JWT authorization, database audit logs. | E2EE encryption for sensitive biometric/KYC payloads, DPDP compliance privacy consent controls. |

---

## 🏗️ Detailed Service Architecture & Codebase Status

### 1. Backend Service (`/backend`)
- **Location**: [`/backend`](file:///home/krishna/D/coding/turist-safety-monitering/backend)
- **Database Schema**: [`schema.prisma`](file:///home/krishna/D/coding/turist-safety-monitering/backend/prisma/schema.prisma) with 18 relational models (`User`, `Role`, `Region`, `Tourist`, `Trip`, `DigitalID`, `GeoFence`, `Zone`, `Incident`, `IncidentMessage`, `Device`, `AIAlert`, `SafetyScore`, etc.).
- **Implemented Controllers**:
  - Auth (`/api/auth`): Login, registration, profile fetch.
  - Incidents (`/api/incidents`): Incident creation, status updates (`OPEN` → `IN_PROGRESS` → `RESOLVED`), officer assignment, evidence logging.
  - Analytics (`/api/analytics`): Incident trends, category breakdown, district stats.
  - Users (`/api/users`): Administrative hierarchy management (L1 District to L4 National).
  - Geofences (`/api/geofences`): Geofence creation & boundary check.
  - Tourist ID (`/api/tourist-id`): Digital ID verification lookup.
  - Tourists (`/api/tourists`): Tourist trips & live location updates.
- **Real-Time Integration**: Socket.IO server configured in `src/shared/utils/socket.service.ts` for broadcasting live incidents & location updates.

### 2. Police & Tourism Dashboard (`/dashboard`)
- **Location**: [`/dashboard`](file:///home/krishna/D/coding/turist-safety-monitering/dashboard)
- **Tech Architecture**: Next.js 16 App Router, Tailwind CSS, TanStack Query, Leaflet GIS.
- **Key Modules**:
  - `Overview`: High-level KPI cards (Active Incidents, Monitored Tourists, Officers Online), quick incident feed.
  - `Map View`: Interactive map with district boundary overlays, tourist location markers, geofence zones, and filterable incident pins.
  - `Incidents`: Complete incident response hub with detail drawer, officer assignment selector, timeline updates, and messaging.
  - `ID Verification`: Search and verify Digital Tourist IDs, showing validity, KYC status, itinerary, and verification history logs.
  - `Analytics`: Recharts visualization for weekly incident trends, severity breakdown, and high-risk zone distribution.
  - `Users Management`: Hierarchical user control for L1 (District), L2 (Division), L3 (State), and L4 (National) officers.

### 3. Tourist Mobile Application (`/mobile`)
- **Location**: [`/mobile`](file:///home/krishna/D/coding/turist-safety-monitering/mobile)
- **Tech Architecture**: React Native Expo (SDK 54), NativeWind Tailwind styling, Expo Router, TanStack Query, Jotai state atoms.
- **Key Views**:
  - `Home / Dashboard`: Quick Panic SOS Button, active safety status banner, tourist safety score indicator.
  - `Live Map`: Real-time map displaying current user position, safe zones, and restricted geofences.
  - `Safety`: Safety score breakdown, risk factors, emergency contact list management, tracking toggles.
  - `Alerts`: Real-time geo-fence alerts and authority notification feed.
  - `Incidents`: Report active emergency with photo evidence attachment & description.
  - `Profile / Digital ID`: Digital Tourist ID display with downloadable QR code for checkpost validation.

---

## 🎯 Next Steps & Technical Roadmap

1. **Phase 1: Real-time Location Engine & Anomaly Detector**
   - Implement Expo background location task in `/mobile` to stream telemetry.
   - Build rule-based AI anomaly detector service in `/backend` to calculate drop-offs and inactivity.

2. **Phase 2: Automated E-FIR & Blockchain Hashing**
   - Integrate PDF generation library (`pdfkit` / `react-pdf`) in backend to export official E-FIR documents.
   - Implement cryptographic hash-chain or Ethereum/Polygon smart contract verification for Digital IDs.

3. **Phase 3: Multilingual & IoT Adapter**
   - Implement `i18next` across dashboard and mobile app for 10+ Indian languages (Hindi, Bengali, Marathi, Tamil, Telugu, etc.).
   - Create MQTT telemetry handler in backend for smart band hardware signals.
