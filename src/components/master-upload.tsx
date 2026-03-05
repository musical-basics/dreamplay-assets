"use client"

import { useState, useRef, useCallback } from "react"
import {
    Upload,
    ImageIcon,
    Video,
    FileText,
    Loader2,
    X,
    CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import imageCompression from "browser-image-compression"
import type { AssetCategory } from "@/app/actions/categories"
import type { AssetType } from "@/app/actions/assets"

interface MasterUploadProps {
    categories: AssetCategory[]
    onUploadComplete: () => void
}

const COMPRESSION_THRESHOLD = 300 * 1024 // 300KB

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string; icon: typeof ImageIcon }[] = [
    { value: "image", label: "Image", icon: ImageIcon },
    { value: "video", label: "Video", icon: Video },
    { value: "document", label: "Document", icon: FileText },
]

export function MasterUpload({ categories, onUploadComplete }: MasterUploadProps) {
    const [isDragOver, setIsDragOver] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [assetType, setAssetType] = useState<AssetType>("image")
    const [categoryId, setCategoryId] = useState<string>("")
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({})
    const fileInputRef = useRef<HTMLInputElement>(null)

    const acceptMap: Record<AssetType, string> = {
        image: "image/*",
        video: "video/mp4,video/quicktime,video/webm",
        document: "application/pdf,image/svg+xml",
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragOver(false)
        const droppedFiles = Array.from(e.dataTransfer.files)
        setFiles((prev) => [...prev, ...droppedFiles])
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
        }
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const handleUpload = async () => {
        if (files.length === 0) return

        setUploading(true)
        const progress: Record<string, "pending" | "uploading" | "done" | "error"> = {}
        files.forEach((f, i) => (progress[i] = "pending"))
        setUploadProgress({ ...progress })

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            progress[i] = "uploading"
            setUploadProgress({ ...progress })

            try {
                let fileToUpload: File = file

                // Compress images over 300KB
                if (assetType === "image" && file.type.startsWith("image/") && file.size > COMPRESSION_THRESHOLD) {
                    const compressed = await imageCompression(file, {
                        maxSizeMB: 0.3,
                        maxWidthOrHeight: 2048,
                        useWebWorker: true,
                        fileType: file.type as string,
                    })
                    fileToUpload = new File([compressed], file.name, { type: compressed.type })
                }

                const formData = new FormData()
                formData.set("file", fileToUpload)

                const { uploadHashedAsset } = await import("@/app/actions/assets")
                const result = await uploadHashedAsset(formData, "", assetType, categoryId || undefined)

                if (result.success) {
                    progress[i] = "done"
                } else {
                    console.error("Upload failed:", result.error)
                    progress[i] = "error"
                }
            } catch (err) {
                console.error("Upload error:", err)
                progress[i] = "error"
            }

            setUploadProgress({ ...progress })
        }

        setUploading(false)

        // If all succeeded, clear files and notify parent
        const allDone = Object.values(progress).every((s) => s === "done")
        if (allDone) {
            setTimeout(() => {
                setFiles([])
                setUploadProgress({})
                onUploadComplete()
            }, 1000)
        }
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="space-y-5">
            {/* Asset Type & Category Selection */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Asset Type
                    </label>
                    <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                        <SelectTrigger className="bg-muted/30">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ASSET_TYPE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                        <opt.icon className="h-3.5 w-3.5" />
                                        {opt.label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Category
                    </label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                        <SelectTrigger className="bg-muted/30">
                            <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-300",
                    isDragOver
                        ? "border-gold bg-gold/5 scale-[1.01]"
                        : "border-border hover:border-gold/50 hover:bg-muted/20"
                )}
            >
                <div
                    className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full transition-all",
                        isDragOver ? "bg-gold/20" : "bg-muted/50"
                    )}
                >
                    <Upload
                        className={cn(
                            "h-6 w-6 transition-colors",
                            isDragOver ? "text-gold" : "text-muted-foreground"
                        )}
                    />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium">
                        {isDragOver ? "Drop files here" : "Drag & drop files, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        All uploads are tagged as <span className="text-gold font-medium">Master</span> copies
                    </p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptMap[assetType]}
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            {/* File Queue */}
            {files.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        {files.length} file{files.length > 1 ? "s" : ""} queued
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {files.map((file, i) => {
                            const status = uploadProgress[i]
                            return (
                                <div
                                    key={`${file.name}-${i}`}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                                        status === "done"
                                            ? "border-emerald-500/30 bg-emerald-500/5"
                                            : status === "error"
                                                ? "border-red-500/30 bg-red-500/5"
                                                : status === "uploading"
                                                    ? "border-gold/30 bg-gold/5"
                                                    : "border-border"
                                    )}
                                >
                                    {status === "uploading" ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-gold shrink-0" />
                                    ) : status === "done" ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                    ) : (
                                        <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="flex-1 truncate text-xs font-mono">
                                        {file.name}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                        {formatSize(file.size)}
                                    </span>
                                    {!uploading && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeFile(i)
                                            }}
                                            className="p-0.5 rounded text-muted-foreground hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <Button
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0}
                        className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload {files.length} File{files.length > 1 ? "s" : ""} as Master
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
