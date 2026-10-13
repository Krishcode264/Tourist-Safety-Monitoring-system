"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { TopBar } from "@/components/layout/top-bar"
import React from "react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-background flex-col">
            <div className="flex flex-1 overflow-hidden">
                <Sidebar userRole="L2" />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TopBar />
                    <main className="flex-1 overflow-auto bg-background">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
