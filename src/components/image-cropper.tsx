"use client"

import React, { useState, useRef } from "react"
import ReactCrop, {
    type Crop,
    type PixelCrop,
    centerCrop,
    makeAspectCrop,
} from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X } from "lucide-react"

// ─── Helper: center an aspect-ratio crop ─────────────
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
) {
    return centerCrop(
        makeAspectCrop(
            { unit: "%", width: 90 },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    )
}

interface ImageCropperProps {
    src: string
    onCropComplete: (croppedBlob: Blob) => void
    onCancel: () => void
    onSkip?: () => void
    initialAspect?: number
}

export function ImageCropper({
    src,
    onCropComplete,
    onCancel,
    onSkip,
    initialAspect,
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>()
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
    const [aspect, setAspect] = useState<number | undefined>(initialAspect)
    const imgRef = useRef<HTMLImageElement>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget
        if (aspect) {
            setCrop(centerAspectCrop(width, height, aspect))
        } else {
            setCrop({ unit: "%", width: 100, height: 100, x: 0, y: 0 })
        }
    }

    const getCroppedImg = async (
        image: HTMLImageElement,
        pixelCrop: PixelCrop
    ): Promise<Blob> => {
        const canvas = document.createElement("canvas")
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        canvas.width = pixelCrop.width * scaleX
        canvas.height = pixelCrop.height * scaleY

        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("No 2d context")

        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(
            image,
            pixelCrop.x * scaleX,
            pixelCrop.y * scaleY,
            pixelCrop.width * scaleX,
            pixelCrop.height * scaleY,
            0,
            0,
            pixelCrop.width * scaleX,
            pixelCrop.height * scaleY
        )

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Canvas is empty"))
                        return
                    }
                    resolve(blob)
                },
                "image/jpeg",
                0.9
            )
        })
    }

    const handleSave = async () => {
        if (!completedCrop || !imgRef.current) return
        setIsProcessing(true)
        try {
            const blob = await getCroppedImg(imgRef.current, completedCrop)
            onCropComplete(blob)
        } catch (e) {
            console.error(e)
            setIsProcessing(false)
        }
    }

    const aspectPresets = [
        { label: "Free", value: undefined },
        { label: "Square", value: 1 },
        { label: "16:9", value: 16 / 9 },
        { label: "4:3", value: 4 / 3 },
        { label: "3:2", value: 3 / 2 },
    ]

    return (
        <div className="flex flex-col h-full bg-black/90 text-white rounded-xl overflow-hidden">
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto min-h-[300px]">
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-h-[60vh]"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        alt="Crop preview"
                        src={src}
                        onLoad={onImageLoad}
                        style={{ maxHeight: "60vh", objectFit: "contain" }}
                        crossOrigin="anonymous"
                    />
                </ReactCrop>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-zinc-900">
                <div className="flex gap-1.5">
                    {aspectPresets.map((preset) => (
                        <Button
                            key={preset.label}
                            variant="ghost"
                            size="sm"
                            onClick={() => setAspect(preset.value)}
                            className={
                                aspect === preset.value
                                    ? "bg-gold/20 text-gold"
                                    : "text-white/60 hover:text-white"
                            }
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    {onSkip && (
                        <Button
                            variant="secondary"
                            onClick={onSkip}
                            disabled={isProcessing}
                        >
                            Use as is
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isProcessing || !completedCrop?.width}
                        className="bg-gold text-gold-foreground hover:bg-gold/90"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Check className="w-4 h-4 mr-2" />
                        )}
                        Save Crop
                    </Button>
                </div>
            </div>
        </div>
    )
}
