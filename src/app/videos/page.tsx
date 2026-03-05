"use client"

import { useState, useEffect } from "react"
import {
    Video,
    Search,
    Loader2,
    Star,
    ExternalLink,
    Trash2,
    Upload,
    Play,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { MasterUpload } from "@/components/master-upload"
import {
    getMasterAssets,
    deleteAsset,
    toggleAssetStar,
    type MediaAsset,
} from "@/app/actions/assets"
import { getAllCategories, type AssetCategory } from "@/app/actions/categories"

export default function VideosPage() {
    const [videos, setVideos] = useState<MediaAsset[]>([])
    const [categories, setCategories] = useState<AssetCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [showUpload, setShowUpload] = useState(false)
    const [selectedVideo, setSelectedVideo] = useState<MediaAsset | null>(null)

    const fetchVideos = async () => {
        setLoading(true)
        const [res, cats] = await Promise.all([
            getMasterAssets({ assetType: "video" }),
            getAllCategories(),
        ])
        setVideos(res.assets)
        setCategories(cats)
        setLoading(false)
    }

    useEffect(() => {
        fetchVideos()
    }, [])

    const filteredVideos = videos.filter((v) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
            v.filename.toLowerCase().includes(q) ||
            (v.description || "").toLowerCase().includes(q)
        )
    })

    const handleToggleStar = async (video: MediaAsset, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setVideos((prev) =>
            prev.map((v) =>
                v.id === video.id ? { ...v, is_starred: !v.is_starred } : v
            )
        )
        await toggleAssetStar(video.id, !video.is_starred)
    }

    const handleDelete = async (video: MediaAsset) => {
        if (!confirm("Delete this video asset?")) return
        await deleteAsset(video.id)
        setVideos((prev) => prev.filter((v) => v.id !== video.id))
        if (selectedVideo?.id === video.id) setSelectedVideo(null)
    }

    const getCategoryName = (catId: string | null) => {
        if (!catId) return "Uncategorized"
        return categories.find((c) => c.id === catId)?.name || "Unknown"
    }

    const formatSize = (bytes?: number) => {
        if (!bytes) return ""
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Video className="h-8 w-8 text-gold" />
                        Video Vault
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {filteredVideos.length} video asset{filteredVideos.length !== 1 ? "s" : ""} stored
                    </p>
                </div>
                <Button
                    onClick={() => setShowUpload(!showUpload)}
                    className="bg-gold text-gold-foreground hover:bg-gold/90"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Videos
                </Button>
            </div>

            {/* Upload Panel */}
            {showUpload && (
                <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg shadow-gold/5">
                    <MasterUpload
                        categories={categories}
                        onUploadComplete={() => {
                            setShowUpload(false)
                            fetchVideos()
                        }}
                    />
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search video assets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-muted/30"
                />
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
            ) : filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Video className="h-12 w-12 mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No video assets found.</p>
                    {search && (
                        <p className="text-xs mt-1">Try a different search term.</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredVideos.map((video) => (
                        <div
                            key={video.id}
                            onClick={() => setSelectedVideo(video)}
                            className={cn(
                                "group bg-card border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-gold/5 hover:border-gold/20",
                                video.is_starred ? "border-yellow-500/30" : "border-border"
                            )}
                        >
                            {/* Thumbnail */}
                            <div className="aspect-video bg-muted/20 flex items-center justify-center relative">
                                {video.public_url.match(/\.(mp4|webm|mov)$/i) ? (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                        <Play className="h-10 w-10 text-white/40 group-hover:text-gold/60 transition-colors" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                        <Video className="h-10 w-10 text-white/20" />
                                    </div>
                                )}

                                <button
                                    onClick={(e) => handleToggleStar(video, e)}
                                    className={cn(
                                        "absolute top-2 right-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100",
                                        video.is_starred
                                            ? "bg-yellow-500/20 text-yellow-400 opacity-100"
                                            : "bg-black/40 text-white/60 hover:text-white"
                                    )}
                                >
                                    <Star className={cn("w-3.5 h-3.5", video.is_starred && "fill-yellow-400")} />
                                </button>

                                <Badge className="absolute bottom-2 left-2 text-[10px] bg-black/50 text-white border-white/20">
                                    {getCategoryName(video.category_id)}
                                </Badge>
                            </div>

                            {/* Info */}
                            <div className="p-3 space-y-1">
                                <p className="text-xs font-mono text-muted-foreground truncate" title={video.filename}>
                                    {video.filename}
                                </p>
                                {video.description && (
                                    <p className="text-[11px] text-muted-foreground/80 truncate">
                                        {video.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                    <span>{formatSize(video.size)}</span>
                                    {video.usage_score > 0 && (
                                        <span className="text-gold">Score: {video.usage_score}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Video Detail Drawer */}
            <Sheet open={!!selectedVideo} onOpenChange={(open) => !open && setSelectedVideo(null)}>
                <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-card">
                    {selectedVideo && (
                        <div className="space-y-6 pt-2">
                            <SheetHeader>
                                <SheetTitle className="text-lg flex items-center gap-2">
                                    <Video className="h-5 w-5 text-gold" />
                                    Video Detail
                                </SheetTitle>
                            </SheetHeader>

                            {/* Preview */}
                            <div className="bg-muted/20 rounded-xl overflow-hidden">
                                {selectedVideo.public_url.match(/\.(mp4|webm|mov)$/i) ? (
                                    <video
                                        src={selectedVideo.public_url}
                                        controls
                                        className="w-full max-h-64 object-contain bg-black"
                                    />
                                ) : (
                                    <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-muted-foreground">
                                        <Video className="h-10 w-10" />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleStar(selectedVideo)}
                                    className={selectedVideo.is_starred ? "border-yellow-500/40 text-yellow-400" : ""}
                                >
                                    <Star className={cn("h-3.5 w-3.5 mr-1.5", selectedVideo.is_starred && "fill-yellow-400")} />
                                    {selectedVideo.is_starred ? "Starred" : "Star"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(selectedVideo.public_url, "_blank")}
                                >
                                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                    Open
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 ml-auto"
                                    onClick={() => handleDelete(selectedVideo)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    Delete
                                </Button>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Filename</label>
                                    <p className="text-sm font-mono">{selectedVideo.filename}</p>
                                </div>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>Category: <span className="text-foreground">{getCategoryName(selectedVideo.category_id)}</span></span>
                                    {selectedVideo.size && <span>Size: <span className="text-foreground">{formatSize(selectedVideo.size)}</span></span>}
                                    <span>Score: <span className="text-gold">{selectedVideo.usage_score}</span></span>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Public URL</label>
                                    <div
                                        className="text-[10px] font-mono text-muted-foreground bg-muted/20 rounded-lg p-2 cursor-pointer hover:text-foreground transition-colors break-all"
                                        onClick={() => navigator.clipboard.writeText(selectedVideo.public_url)}
                                        title="Click to copy"
                                    >
                                        {selectedVideo.public_url}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
