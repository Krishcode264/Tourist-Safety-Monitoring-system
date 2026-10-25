import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";

import App from "./App";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
    throw new Error("Missing Clerk Publishable Key");
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ClerkProvider publishableKey={publishableKey}>
            <App />
        </ClerkProvider>
    </React.StrictMode>
);