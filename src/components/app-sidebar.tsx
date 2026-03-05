"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Image,
    Video,
    FolderOpen,
    Tags,
    Settings,
    Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/gallery", label: "Master Gallery", icon: Image },
    { href: "/videos", label: "Video Vault", icon: Video },
    { href: "/categories", label: "Categories", icon: FolderOpen },
    { href: "/tags", label: "Tags", icon: Tags },
    { href: "/api-settings", label: "API Settings", icon: Settings },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-violet shadow-lg shadow-gold/20">
                    <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
                        DreamPlay
                    </h1>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-gold">
                        Asset Manager
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive =
                        href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(href)

                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-sidebar-accent text-gold shadow-sm"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "h-4 w-4 shrink-0 transition-colors",
                                    isActive
                                        ? "text-gold"
                                        : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                                )}
                            />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-sidebar-border px-4 py-3">
                <p className="text-[10px] text-muted-foreground text-center">
                    Headless DAM • v0.1
                </p>
            </div>
        </aside>
    )
}
