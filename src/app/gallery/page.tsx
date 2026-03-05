import { Image } from "lucide-react"

export default function GalleryPage() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Image className="h-8 w-8 text-gold" />
                    Master Gallery
                </h1>
                <p className="text-muted-foreground mt-1">
                    Browse and manage all master-copy image assets. Derivatives are hidden by default.
                </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
                    <div className="text-center space-y-3">
                        <Image className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p>Master gallery will be built in Phase 4.</p>
                        <p className="text-xs text-muted-foreground/60">
                            Upload, search, filter by category/tags, and manage master images here.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
