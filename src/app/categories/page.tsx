import { FolderOpen } from "lucide-react"

export default function CategoriesPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <FolderOpen className="h-8 w-8 text-gold" />
                    Categories
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage asset categories — Product Photos, 3D Renders, CEO Lionel, Marketing Videos, Product Videos.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                    <div className="text-center space-y-3">
                        <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p>Category management will be built in Phase 4.</p>
                        <p className="text-xs text-muted-foreground/60">
                            View asset counts by category, add/edit categories, and reassign assets.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
