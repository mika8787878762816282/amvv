import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Download, Check } from "lucide-react";

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    width?: number;
    height?: number;
}

export const SignaturePad = ({ onSave, width = 500, height = 200 }: SignaturePadProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);

    const getContext = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        return ctx;
    }, []);

    useEffect(() => {
        const ctx = getContext();
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#1a1a2e";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }, [getContext, width, height]);

    const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ("touches" in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const ctx = getContext();
        if (!ctx) return;
        const { x, y } = getPosition(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const ctx = getContext();
        if (!ctx) return;
        const { x, y } = getPosition(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(false);
    };

    const clear = () => {
        const ctx = getContext();
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        setHasDrawn(false);
    };

    const save = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
    };

    const download = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) return;
        const link = document.createElement("a");
        link.download = `signature_${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    return (
        <div className="space-y-3">
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-1 bg-white inline-block">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="cursor-crosshair rounded touch-none w-full max-w-[500px]"
                    style={{ aspectRatio: `${width}/${height}` }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Dessinez votre signature ci-dessus avec la souris ou le doigt
            </p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clear}>
                    <Eraser className="w-4 h-4 mr-2" /> Effacer
                </Button>
                <Button variant="outline" size="sm" onClick={download} disabled={!hasDrawn}>
                    <Download className="w-4 h-4 mr-2" /> Exporter PNG
                </Button>
                <Button size="sm" onClick={save} disabled={!hasDrawn} className="bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" /> Valider la signature
                </Button>
            </div>
        </div>
    );
};
