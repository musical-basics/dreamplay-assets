"use client"

import { useState, useEffect } from "react"
import {
    Tags as TagsIcon,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    X,
    Check,
    Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    getAllTags,
    createTag,
    updateTag,
    deleteTag,
    getTagCounts,
    type TagItem,
} from "@/app/actions/tags"

const COLOR_OPTIONS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308",
    "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
    "#ec4899", "#f43f5e",
]

export default function TagsPage() {
    const [tags, setTags] = useState<TagItem[]>([])
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [editColor, setEditColor] = useState("")
    const [showEdit, setShowEdit] = useState(false)

    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")
    const [newColor, setNewColor] = useState(COLOR_OPTIONS[0])

    const fetchData = async () => {
        setLoading(true)
        const [t, c] = await Promise.all([getAllTags(), getTagCounts()])
        setTags(t)
        setTagCounts(c)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async () => {
        const name = newName.trim()
        if (!name) return
        const res = await createTag(name, newColor)
        if (res.success) {
            setNewName("")
            setNewColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)])
            setShowCreate(false)
            fetchData()
        }
    }

    const handleUpdate = async (id: string) => {
        const name = editName.trim()
        if (!name) return
        await updateTag(id, name, editColor)
        setEditingId(null)
        fetchData()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this tag? It will be removed from all assets.")) return
        await deleteTag(id)
        fetchData()
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <TagsIcon className="h-8 w-8 text-gold" />
                        Tags
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage color-coded tags for asset organization.
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-gold text-gold-foreground hover:bg-gold/90"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tag
                </Button>
            </div>

            {/* Create Row */}
            {showCreate && (
                <div className="bg-card border border-gold/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <Input
                            placeholder="Tag name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 bg-muted/20"
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            autoFocus
                        />
                        <Button size="sm" onClick={handleCreate} className="bg-gold text-gold-foreground hover:bg-gold/90">
                            <Check className="h-3.5 w-3.5 mr-1" /> Create
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName("") }}>
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                        {COLOR_OPTIONS.map((c) => (
                            <button
                                key={c}
                                onClick={() => setNewColor(c)}
                                className={cn(
                                    "w-6 h-6 rounded-full border-2 transition-all",
                                    newColor === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: newColor }}
                        >
                            {newName || "tag name"}
                        </span>
                    </div>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
            ) : tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <TagsIcon className="h-12 w-12 mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No tags yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tags.map((tag) => (
                        <div
                            key={tag.id}
                            className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-gold/15 transition-colors group"
                        >
                            {editingId === tag.id ? (
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 bg-muted/20 text-sm"
                                            onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                                            autoFocus
                                        />
                                        <Button size="sm" onClick={() => handleUpdate(tag.id)}>
                                            <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {COLOR_OPTIONS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setEditColor(c)}
                                                className={cn(
                                                    "w-5 h-5 rounded-full border-2 transition-all",
                                                    editColor === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                                )}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="w-4 h-4 rounded-full shrink-0"
                                        style={{ backgroundColor: tag.color }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{tag.name}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {tagCounts[tag.id] || 0} asset{(tagCounts[tag.id] || 0) !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color) }}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tag.id)}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
