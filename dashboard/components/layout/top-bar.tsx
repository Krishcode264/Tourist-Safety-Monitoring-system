"use client"

import { Bell, Search, User, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { LiveNotifications } from "./live-notifications"
import { useAuth } from "@/components/providers/auth-provider"

interface TopBarProps {
  userRole?: string
}

export function TopBar({ userRole }: TopBarProps = {}) {
  const { user, logout } = useAuth()

  return (
    <header className="h-16 border-b border-border bg-background px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative w-64 hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search incidents, officers..." className="pl-9 bg-muted/50 border-input" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2 hidden sm:flex">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span>System Operational</span>
        </div>

        <LiveNotifications />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 pl-2 pr-4">
              <User className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">{user?.fullName || user?.username || 'Loading...'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={logout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Avatar>
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>JO</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
