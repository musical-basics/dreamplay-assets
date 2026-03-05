import { Tags } from "lucide-react"

export default function TagsPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Tags className="h-8 w-8 text-gold" />
                    Tags
                </h1>
                <p className="text-muted-foreground mt-1">
                    Create and manage color-coded tags for asset organization and AI context.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                    <div className="text-center space-y-3">
                        <Tags className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p>Tag management will be built in Phase 4.</p>
                        <p className="text-xs text-muted-foreground/60">
                            CRUD for tags, bulk-assign, and see tag usage across the library.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
