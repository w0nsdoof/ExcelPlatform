"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { useLanguage } from "@/contexts/language-context"
import { User, LogOut } from "lucide-react"

export function UserMenu() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()

  if (!user) return null

  const handleLogout = () => {
    logout()
    window.location.href = "/"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <User className="w-4 h-4" />
          {user.username}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          <User className="w-4 h-4 mr-2" />
          {user.username}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
