# Persona AI

Persona AI is a full-stack chat application that lets users interact with AI personas such as Developer, Mentor, and Friend. The app combines a React frontend, an Express backend, Clerk authentication, MongoDB persistence, and streaming responses from Google Gemini through the OpenAI-compatible SDK.

## Features

- Chat with multiple AI personas
- Real-time streaming chat responses
- Clerk-based authentication and user sync
- MongoDB-backed user storage
- Responsive React UI with Vite

## Tech Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Authentication: Clerk
- Database: MongoDB + Mongoose
- AI: Google Gemini API via the OpenAI-compatible SDK

## Project Structure

- client/ - React frontend
- src/ - Express backend and app logic
- src/controllers/ - Request handlers
- src/routes/ - API routes
- src/models/ - Mongoose models
- src/services/ - Utility services

## Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB instance or MongoDB Atlas connection string

## Environment Variables

Create a .env file in the project root with the following variables:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

Create a .env file inside the client folder for the frontend Clerk key:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

## Installation

Install dependencies for both the backend and frontend:

```bash
npm install
cd client
npm install
cd ..
```

## Running the Application

Start the backend server:

```bash
npm run dev
```

Start the frontend development server:

```bash
cd client
npm run dev
```

The frontend will usually run on http://localhost:5173 and the backend on http://localhost:4000.

## Usage

1. Open the frontend in your browser.
2. Sign in with Clerk authentication.
3. Choose a persona and start chatting.

## Notes

- The app expects a valid Gemini API key to generate responses.
- Ensure your MongoDB URI is valid before starting the backend.
- If you want to change the backend port, update the PORT value in the root .env file.
