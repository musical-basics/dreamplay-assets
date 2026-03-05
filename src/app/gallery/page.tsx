"use client"

import { useState, useEffect, useRef } from "react"
import {
    Image as ImageIcon,
    Search,
    Loader2,
    Star,
    Upload,
    Trash2,
    Filter,
    X,
    Check,
    MoreVertical,
    Eye,
    Crop,
    Tags,
    ChevronRight,
    FolderOpen,
    Plus,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { MasterUpload } from "@/components/master-upload"
import { ImageCropper } from "@/components/image-cropper"
import {
    getMasterAssets,
    getAllAssets,
    getDerivatives,
    deleteAsset,
    deleteMasterWithDerivatives,
    updateAssetDescription,
    toggleAssetStar,
    updateAssetCategory,
    uploadDerivative,
    type MediaAsset,
    type AssetType,
} from "@/app/actions/assets"
import {
    getAllCategories,
    type AssetCategory,
} from "@/app/actions/categories"
import {
    getAllTags,
    getAllAssetTagLinks,
    setAssetTags,
    createTag,
    type TagItem,
} from "@/app/actions/tags"

export default function GalleryPage() {
    // ─── State ─────────────────────────────────────────
    const [assets, setAssets] = useState<MediaAsset[]>([])
    const [categories, setCategories] = useState<AssetCategory[]>([])
    const [allTags, setAllTags] = useState<TagItem[]>([])
    const [assetTagMap, setAssetTagMap] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(true)

    // Filters
    const [search, setSearch] = useState("")
    const [filterCategory, setFilterCategory] = useState<string>("all")
    const [filterType, setFilterType] = useState<AssetType | "all">("all")
    const [showDerivatives, setShowDerivatives] = useState(false)
    const [starFilter, setStarFilter] = useState<"all" | "starred" | "unstarred">("all")
    const [includeTags, setIncludeTags] = useState<string[]>([])
    const [excludeTags, setExcludeTags] = useState<string[]>([])
    const [showIncludeMenu, setShowIncludeMenu] = useState(false)
    const [showExcludeMenu, setShowExcludeMenu] = useState(false)
    const includeRef = useRef<HTMLDivElement>(null)
    const excludeRef = useRef<HTMLDivElement>(null)

    // Upload
    const [showUpload, setShowUpload] = useState(false)

    // Detail drawer
    const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)
    const [derivatives, setDerivatives] = useState<MediaAsset[]>([])
    const [loadingDerivatives, setLoadingDerivatives] = useState(false)

    // Cropper
    const [croppingAsset, setCroppingAsset] = useState<MediaAsset | null>(null)

    // Tag picker on detail
    const [showDetailTagPicker, setShowDetailTagPicker] = useState(false)

    // ─── Data Fetching ─────────────────────────────────
    const fetchData = async () => {
        setLoading(true)
        const [assetResult, cats, tags, tagLinks] = await Promise.all([
            showDerivatives ? getAllAssets() : getMasterAssets(),
            getAllCategories(),
            getAllTags(),
            getAllAssetTagLinks(),
        ])

        const assetList = Array.isArray(assetResult)
            ? assetResult
            : assetResult.assets || []

        setAssets(assetList)
        setCategories(cats)
        setAllTags(tags)

        const map: Record<string, string[]> = {}
        for (const link of tagLinks) {
            if (!map[link.asset_id]) map[link.asset_id] = []
            map[link.asset_id].push(link.tag_id)
        }
        setAssetTagMap(map)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showDerivatives])

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (includeRef.current && !includeRef.current.contains(e.target as Node))
                setShowIncludeMenu(false)
            if (excludeRef.current && !excludeRef.current.contains(e.target as Node))
                setShowExcludeMenu(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    // Load derivatives when detail drawer opens
    useEffect(() => {
        if (selectedAsset && selectedAsset.role === "master") {
            setLoadingDerivatives(true)
            getDerivatives(selectedAsset.id).then((res) => {
                setDerivatives(res.assets)
                setLoadingDerivatives(false)
            })
        } else {
            setDerivatives([])
        }
    }, [selectedAsset])

    // ─── Filtered Assets ───────────────────────────────
    const filteredAssets = assets.filter((a) => {
        if (search) {
            const q = search.toLowerCase()
            const matchesSearch =
                a.filename.toLowerCase().includes(q) ||
                (a.description || "").toLowerCase().includes(q)
            if (!matchesSearch) return false
        }
        if (filterCategory !== "all" && a.category_id !== filterCategory) return false
        if (filterType !== "all" && a.asset_type !== filterType) return false
        if (starFilter === "starred" && !a.is_starred) return false
        if (starFilter === "unstarred" && a.is_starred) return false

        const assetTags = assetTagMap[a.id] || []
        if (includeTags.length > 0 && !assetTags.some((t) => includeTags.includes(t))) return false
        if (excludeTags.length > 0 && assetTags.some((t) => excludeTags.includes(t))) return false

        return true
    })

    // ─── Handlers ──────────────────────────────────────
    const handleToggleStar = async (asset: MediaAsset) => {
        setAssets((prev) =>
            prev.map((a) =>
                a.id === asset.id ? { ...a, is_starred: !a.is_starred } : a
            )
        )
        if (selectedAsset?.id === asset.id) {
            setSelectedAsset((prev) =>
                prev ? { ...prev, is_starred: !prev.is_starred } : prev
            )
        }
        await toggleAssetStar(asset.id, !asset.is_starred)
    }

    const handleDelete = async (asset: MediaAsset) => {
        if (!confirm("Delete this asset? The file stays in storage but is hidden.")) return
        if (asset.role === "master") {
            await deleteMasterWithDerivatives(asset.id)
        } else {
            await deleteAsset(asset.id)
        }
        setAssets((prev) => prev.filter((a) => a.id !== asset.id && a.parent_id !== asset.id))
        if (selectedAsset?.id === asset.id) setSelectedAsset(null)
    }

    const handleSaveDescription = async (assetId: string, description: string) => {
        await updateAssetDescription(assetId, description)
        setAssets((prev) =>
            prev.map((a) => (a.id === assetId ? { ...a, description } : a))
        )
    }

    const handleCategoryChange = async (assetId: string, categoryId: string) => {
        const catId = categoryId === "none" ? null : categoryId
        await updateAssetCategory(assetId, catId)
        setAssets((prev) =>
            prev.map((a) => (a.id === assetId ? { ...a, category_id: catId } : a))
        )
        if (selectedAsset?.id === assetId) {
            setSelectedAsset((prev) => (prev ? { ...prev, category_id: catId } : prev))
        }
    }

    const handleToggleTag = async (assetId: string, tagId: string) => {
        const current = assetTagMap[assetId] || []
        const updated = current.includes(tagId)
            ? current.filter((t) => t !== tagId)
            : [...current, tagId]
        setAssetTagMap((prev) => ({ ...prev, [assetId]: updated }))
        await setAssetTags(assetId, updated)
    }

    const handleCreateTag = async (name: string, assetId?: string) => {
        const colors = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#eab308"]
        const color = colors[Math.floor(Math.random() * colors.length)]
        const res = await createTag(name, color)
        if (res.success && res.tag) {
            setAllTags((prev) => [...prev, res.tag!].sort((a, b) => a.name.localeCompare(b.name)))
            if (assetId) {
                const current = assetTagMap[assetId] || []
                const updated = [...current, res.tag!.id]
                setAssetTagMap((prev) => ({ ...prev, [assetId]: updated }))
                await setAssetTags(assetId, updated)
            }
        }
    }

    const handleCropComplete = async (blob: Blob, parentAsset: MediaAsset) => {
        const file = new File([blob], `crop-${parentAsset.filename}`, { type: "image/jpeg" })
        const formData = new FormData()
        formData.set("file", file)
        await uploadDerivative(formData, parentAsset.id)
        setCroppingAsset(null)
        // Reload derivatives if the drawer is open
        if (selectedAsset?.id === parentAsset.id) {
            const res = await getDerivatives(parentAsset.id)
            setDerivatives(res.assets)
        }
    }

    const getCategoryName = (catId: string | null) => {
        if (!catId) return "Uncategorized"
        return categories.find((c) => c.id === catId)?.name || "Unknown"
    }

    const formatSize = (bytes?: number) => {
        if (!bytes) return ""
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const starredCount = assets.filter((a) => a.is_starred).length

    // ─── Render ────────────────────────────────────────
    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <ImageIcon className="h-8 w-8 text-gold" />
                        Master Gallery
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {showDerivatives ? "All assets (masters + derivatives)" : "Master-copy assets only"} •{" "}
                        {filteredAssets.length} shown
                    </p>
                </div>
                <Button
                    onClick={() => setShowUpload(!showUpload)}
                    className="bg-gold text-gold-foreground hover:bg-gold/90"
                >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Masters
                </Button>
            </div>

            {/* Upload Panel */}
            {showUpload && (
                <div className="bg-card border border-gold/20 rounded-xl p-6 shadow-lg shadow-gold/5">
                    <MasterUpload
                        categories={categories}
                        onUploadComplete={() => {
                            setShowUpload(false)
                            fetchData()
                        }}
                    />
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search filename or description..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-muted/30"
                        />
                    </div>

                    {/* Category filter */}
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[160px] bg-muted/30">
                            <FolderOpen className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Type filter */}
                    <Select value={filterType} onValueChange={(v) => setFilterType(v as AssetType | "all")}>
                        <SelectTrigger className="w-[130px] bg-muted/30">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="image">Images</SelectItem>
                            <SelectItem value="video">Videos</SelectItem>
                            <SelectItem value="document">Documents</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Include tags */}
                    <div ref={includeRef} className="relative">
                        <button
                            onClick={() => { setShowIncludeMenu((v) => !v); setShowExcludeMenu(false) }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                includeTags.length > 0
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Include{includeTags.length > 0 && ` (${includeTags.length})`}
                        </button>
                        {showIncludeMenu && (
                            <div className="absolute top-full left-0 mt-1 z-30 bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[200px] max-h-64 overflow-y-auto">
                                {allTags.map((tag) => {
                                    const isActive = includeTags.includes(tag.id)
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => setIncludeTags((prev) => isActive ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                                            className={cn(
                                                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                                                isActive ? "bg-emerald-500/15 text-emerald-300" : "text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                            <span className="flex-1">{tag.name}</span>
                                            {isActive && <Check className="w-3 h-3" />}
                                        </button>
                                    )
                                })}
                                {includeTags.length > 0 && (
                                    <>
                                        <div className="border-t border-border my-1" />
                                        <button onClick={() => setIncludeTags([])} className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-500/10">
                                            <X className="w-3 h-3" /> Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Exclude tags */}
                    <div ref={excludeRef} className="relative">
                        <button
                            onClick={() => { setShowExcludeMenu((v) => !v); setShowIncludeMenu(false) }}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                                excludeTags.length > 0
                                    ? "bg-red-500/15 border-red-500/40 text-red-400"
                                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Exclude{excludeTags.length > 0 && ` (${excludeTags.length})`}
                        </button>
                        {showExcludeMenu && (
                            <div className="absolute top-full left-0 mt-1 z-30 bg-popover border border-border rounded-lg shadow-xl p-1.5 min-w-[200px] max-h-64 overflow-y-auto">
                                {allTags.map((tag) => {
                                    const isActive = excludeTags.includes(tag.id)
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => setExcludeTags((prev) => isActive ? prev.filter((t) => t !== tag.id) : [...prev, tag.id])}
                                            className={cn(
                                                "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                                                isActive ? "bg-red-500/15 text-red-300" : "text-muted-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                            <span className="flex-1">{tag.name}</span>
                                            {isActive && <Check className="w-3 h-3" />}
                                        </button>
                                    )
                                })}
                                {excludeTags.length > 0 && (
                                    <>
                                        <div className="border-t border-border my-1" />
                                        <button onClick={() => setExcludeTags([])} className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs text-red-400 hover:bg-red-500/10">
                                            <X className="w-3 h-3" /> Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Show Derivatives toggle */}
                    <button
                        onClick={() => setShowDerivatives(!showDerivatives)}
                        className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                            showDerivatives
                                ? "bg-violet/15 border-violet/40 text-violet"
                                : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {showDerivatives ? "Showing All" : "Masters Only"}
                    </button>

                    {/* Star filter */}
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border">
                        {(["all", "starred", "unstarred"] as const).map((val) => (
                            <button
                                key={val}
                                onClick={() => setStarFilter(val)}
                                className={cn(
                                    "text-xs font-medium px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
                                    starFilter === val ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {val === "starred" && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />}
                                {val === "all" ? `All (${assets.length})` : val === "starred" ? `(${starredCount})` : `(${assets.length - starredCount})`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gallery Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No assets match your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredAssets.map((asset) => (
                        <div
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className={cn(
                                "group bg-card border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-gold/5 hover:border-gold/20",
                                asset.is_starred ? "border-yellow-500/30" : "border-border",
                                asset.role === "derivative" && "opacity-70 border-dashed"
                            )}
                        >
                            {/* Image */}
                            <div className="aspect-square bg-muted/20 flex items-center justify-center p-2 relative overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={asset.public_url}
                                    alt={asset.filename}
                                    className="max-h-full max-w-full object-contain rounded"
                                    loading="lazy"
                                />
                                {/* Star button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleStar(asset)
                                    }}
                                    className={cn(
                                        "absolute top-2 right-2 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100",
                                        asset.is_starred
                                            ? "bg-yellow-500/20 text-yellow-400 opacity-100"
                                            : "bg-black/40 text-white/60 hover:text-white"
                                    )}
                                >
                                    <Star className={cn("w-3.5 h-3.5", asset.is_starred && "fill-yellow-400")} />
                                </button>
                                {/* Role badge */}
                                {asset.role === "derivative" && (
                                    <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] bg-violet/20 text-violet border-violet/30">
                                        Derivative
                                    </Badge>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-3 space-y-1.5">
                                <p className="text-xs font-mono text-muted-foreground truncate" title={asset.filename}>
                                    {asset.filename}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {(assetTagMap[asset.id] || []).slice(0, 3).map((tagId) => {
                                        const tag = allTags.find((t) => t.id === tagId)
                                        if (!tag) return null
                                        return (
                                            <span
                                                key={tag.id}
                                                className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium text-white"
                                                style={{ backgroundColor: tag.color }}
                                            >
                                                {tag.name}
                                            </span>
                                        )
                                    })}
                                    {(assetTagMap[asset.id] || []).length > 3 && (
                                        <span className="text-[9px] text-muted-foreground">
                                            +{(assetTagMap[asset.id] || []).length - 3}
                                        </span>
                                    )}
                                </div>
                                {asset.usage_score > 0 && (
                                    <p className="text-[10px] text-gold font-medium">
                                        Score: {asset.usage_score}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Asset Detail Drawer ─────────────────────── */}
            <Sheet open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
                <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto bg-card">
                    {selectedAsset && (
                        <div className="space-y-6 pt-2">
                            <SheetHeader>
                                <SheetTitle className="text-lg flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5 text-gold" />
                                    Asset Detail
                                </SheetTitle>
                            </SheetHeader>

                            {/* Cropper mode */}
                            {croppingAsset ? (
                                <div className="h-[500px]">
                                    <ImageCropper
                                        src={croppingAsset.public_url}
                                        onCropComplete={(blob) => handleCropComplete(blob, croppingAsset)}
                                        onCancel={() => setCroppingAsset(null)}
                                        onSkip={() => setCroppingAsset(null)}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Preview */}
                                    <div className="bg-muted/20 rounded-xl p-4 flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={selectedAsset.public_url}
                                            alt={selectedAsset.filename}
                                            className="max-h-64 max-w-full object-contain rounded-lg"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleToggleStar(selectedAsset)}
                                            className={selectedAsset.is_starred ? "border-yellow-500/40 text-yellow-400" : ""}
                                        >
                                            <Star className={cn("h-3.5 w-3.5 mr-1.5", selectedAsset.is_starred && "fill-yellow-400")} />
                                            {selectedAsset.is_starred ? "Starred" : "Star"}
                                        </Button>
                                        {selectedAsset.role === "master" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setCroppingAsset(selectedAsset)}
                                            >
                                                <Crop className="h-3.5 w-3.5 mr-1.5" />
                                                Crop Derivative
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-400 border-red-500/30 hover:bg-red-500/10 ml-auto"
                                            onClick={() => handleDelete(selectedAsset)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                            Delete
                                        </Button>
                                    </div>

                                    {/* Metadata */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                Filename
                                            </label>
                                            <p className="text-sm font-mono">{selectedAsset.filename}</p>
                                        </div>

                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                            <span>Type: <span className="text-foreground">{selectedAsset.asset_type}</span></span>
                                            <span>Role: <span className={selectedAsset.role === "master" ? "text-gold" : "text-violet"}>{selectedAsset.role}</span></span>
                                            {selectedAsset.size && <span>Size: <span className="text-foreground">{formatSize(selectedAsset.size)}</span></span>}
                                            <span>Score: <span className="text-gold">{selectedAsset.usage_score}</span></span>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                AI Description
                                            </label>
                                            <Textarea
                                                defaultValue={selectedAsset.description || ""}
                                                placeholder="Describe for AI (e.g. 'Pianist hand stretching')..."
                                                className="text-xs resize-none h-20 bg-muted/20"
                                                onBlur={(e) => {
                                                    if (e.target.value !== (selectedAsset.description || "")) {
                                                        handleSaveDescription(selectedAsset.id, e.target.value)
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                Category
                                            </label>
                                            <Select
                                                value={selectedAsset.category_id || "none"}
                                                onValueChange={(v) => handleCategoryChange(selectedAsset.id, v)}
                                            >
                                                <SelectTrigger className="bg-muted/20">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Uncategorized</SelectItem>
                                                    {categories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Tags */}
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                                Tags
                                            </label>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {(assetTagMap[selectedAsset.id] || []).map((tagId) => {
                                                    const tag = allTags.find((t) => t.id === tagId)
                                                    if (!tag) return null
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            onClick={() => handleToggleTag(selectedAsset.id, tag.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white hover:opacity-80 transition-opacity"
                                                            style={{ backgroundColor: tag.color }}
                                                        >
                                                            {tag.name}
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )
                                                })}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowDetailTagPicker(!showDetailTagPicker)}
                                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                    {showDetailTagPicker && (
                                                        <div className="absolute bottom-full left-0 mb-1 z-20 bg-popover border border-border rounded-lg shadow-xl p-2 min-w-[200px] max-h-56 overflow-y-auto">
                                                            {allTags.map((tag) => {
                                                                const isActive = (assetTagMap[selectedAsset.id] || []).includes(tag.id)
                                                                return (
                                                                    <button
                                                                        key={tag.id}
                                                                        onClick={() => handleToggleTag(selectedAsset.id, tag.id)}
                                                                        className={cn(
                                                                            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                                                                            isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                                                                        )}
                                                                    >
                                                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                                                        <span className="flex-1">{tag.name}</span>
                                                                        {isActive && <Check className="w-3 h-3 text-gold" />}
                                                                    </button>
                                                                )
                                                            })}
                                                            <div className="border-t border-border my-1.5" />
                                                            <form
                                                                onSubmit={async (e) => {
                                                                    e.preventDefault()
                                                                    const input = (e.target as HTMLFormElement).elements.namedItem("newTag") as HTMLInputElement
                                                                    const name = input.value.trim()
                                                                    if (!name) return
                                                                    await handleCreateTag(name, selectedAsset.id)
                                                                    input.value = ""
                                                                }}
                                                                className="flex items-center gap-1.5 px-1"
                                                            >
                                                                <input
                                                                    name="newTag"
                                                                    type="text"
                                                                    placeholder="Create new tag..."
                                                                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none py-1.5 px-1"
                                                                    autoComplete="off"
                                                                />
                                                                <button type="submit" className="p-1 rounded text-muted-foreground hover:text-gold transition-colors">
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </form>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Derivatives sub-grid */}
                                        {selectedAsset.role === "master" && (
                                            <div>
                                                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                                    Derivatives ({derivatives.length})
                                                </label>
                                                {loadingDerivatives ? (
                                                    <div className="flex justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : derivatives.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
                                                        No derivatives yet. Use the Crop button above.
                                                    </p>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {derivatives.map((d) => (
                                                            <div
                                                                key={d.id}
                                                                className="bg-muted/20 border border-border rounded-lg p-1 group/deriv relative"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={d.public_url}
                                                                    alt={d.filename}
                                                                    className="w-full aspect-square object-cover rounded"
                                                                />
                                                                <button
                                                                    onClick={() => handleDelete(d)}
                                                                    className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover/deriv:opacity-100 transition-opacity"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* URL */}
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                Public URL
                                            </label>
                                            <div
                                                className="text-[10px] font-mono text-muted-foreground bg-muted/20 rounded-lg p-2 cursor-pointer hover:text-foreground transition-colors break-all"
                                                onClick={() => navigator.clipboard.writeText(selectedAsset.public_url)}
                                                title="Click to copy"
                                            >
                                                {selectedAsset.public_url}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    )
}
