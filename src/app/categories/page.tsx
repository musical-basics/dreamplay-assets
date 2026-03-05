"use client"

import { useState, useEffect } from "react"
import {
    FolderOpen,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    X,
    Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryCounts,
    type AssetCategory,
} from "@/app/actions/categories"

function slugify(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<{ id: string; name: string; slug: string; count: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState("")

    const fetchData = async () => {
        setLoading(true)
        const counts = await getCategoryCounts()
        setCategories(counts)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCreate = async () => {
        const name = newName.trim()
        if (!name) return
        const slug = slugify(name)
        const res = await createCategory(name, slug)
        if (res.success) {
            setNewName("")
            setShowCreate(false)
            fetchData()
        }
    }

    const handleUpdate = async (id: string) => {
        const name = editName.trim()
        if (!name) return
        const slug = slugify(name)
        await updateCategory(id, name, slug)
        setEditingId(null)
        fetchData()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this category? Assets will become uncategorized.")) return
        await deleteCategory(id)
        fetchData()
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <FolderOpen className="h-8 w-8 text-gold" />
                        Categories
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Organize assets into categorical buckets.
                    </p>
                </div>
                <Button
                    onClick={() => setShowCreate(!showCreate)}
                    className="bg-gold text-gold-foreground hover:bg-gold/90"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {/* Create Row */}
            {showCreate && (
                <div className="bg-card border border-gold/20 rounded-xl p-4 flex items-center gap-3">
                    <Input
                        placeholder="Category name..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 bg-muted/20"
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                        autoFocus
                    />
                    <span className="text-xs text-muted-foreground font-mono">
                        → {slugify(newName || "slug")}
                    </span>
                    <Button size="sm" onClick={handleCreate} className="bg-gold text-gold-foreground hover:bg-gold/90">
                        <Check className="h-3.5 w-3.5 mr-1" /> Create
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCreate(false); setNewName("") }}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
            ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mb-3 text-muted-foreground/30" />
                    <p className="text-sm">No categories yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="bg-card border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gold/15 transition-colors group"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                                <FolderOpen className="h-5 w-5 text-gold" />
                            </div>

                            {editingId === cat.id ? (
                                <div className="flex-1 flex items-center gap-2">
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 bg-muted/20"
                                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(cat.id)}
                                        autoFocus
                                    />
                                    <Button size="sm" onClick={() => handleUpdate(cat.id)}>
                                        <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">{cat.name}</p>
                                        <p className="text-[11px] text-muted-foreground font-mono">{cat.slug}</p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {cat.count || 0} asset{(cat.count || 0) !== 1 ? "s" : ""}
                                    </span>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
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
