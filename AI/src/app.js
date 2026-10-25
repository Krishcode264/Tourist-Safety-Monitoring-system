const express = require( "express" );
const { clerkMiddleware } = require( "@clerk/express" );
const cors = require( "cors" );

const chatRoutes = require( "./routes/chatRoutes.js" );
const authRoutes = require( "./routes/authRoutes.js" );

const app = express();

app.use(
    cors( {
        origin: [
            "http://localhost:5173",
            "https://persona-ai-chatbot-puce.vercel.app"
        ],
        credentials: true,
    } )
);

app.use( express.json() );
app.use( express.urlencoded( { extended: true } ) );

app.use( clerkMiddleware() );

//  Health Check
app.get( "/health", ( _req, res ) => {
    res.status( 200 ).json( { ok: true, message: "Persona AI server is running" } );
} );

//  Chat Routes
app.use( "/api/chat", chatRoutes );
app.use( "/api/auth", authRoutes );

//  Expose Clerk publishable key to the frontend
app.get( "/api/config", ( _req, res ) => {
    res.json( {
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    } );
} );

module.exports = app;
