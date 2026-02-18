import { useState, useEffect, useRef } from "react";
import { Terminal, X, Trash2, ChevronUp, ChevronDown, Bug, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type LogEntry = {
    id: string;
    timestamp: Date;
    level: "info" | "warn" | "error" | "debug";
    module: string;
    message: string;
    data?: any;
};

export function DebugConsole() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Hook into console.log and other methods
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        const addLog = (level: LogEntry["level"], args: any[]) => {
            const entry: LogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                level,
                module: "System",
                message: args.map(arg => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" "),
                data: args.length > 1 ? args.slice(1) : undefined
            };
            setLogs(prev => [...prev, entry].slice(-100)); // Keep last 100 logs
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog("info", args);
        };
        console.warn = (...args) => {
            originalWarn(...args);
            addLog("warn", args);
        };
        console.error = (...args) => {
            originalError(...args);
            addLog("error", args);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs, isOpen]);

    const getLevelIcon = (level: LogEntry["level"]) => {
        switch (level) {
            case "info": return <Info className="w-3 h-3 text-blue-500" />;
            case "warn": return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
            case "error": return <AlertCircle className="w-3 h-3 text-red-500" />;
            default: return <Bug className="w-3 h-3 text-gray-500" />;
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="fixed bottom-4 right-4 z-50 rounded-full bg-background/80 backdrop-blur border-primary/20 shadow-lg hover:bg-primary/5 gap-2"
                onClick={() => setIsOpen(true)}
            >
                <Terminal className="w-4 h-4" /> Console
                {logs.filter(l => l.level === "error").length > 0 && (
                    <Badge variant="destructive" className="h-4 min-w-[1rem] p-0 flex items-center justify-center text-[10px]">
                        {logs.filter(l => l.level === "error").length}
                    </Badge>
                )}
            </Button>
        );
    }

    return (
        <div className={`fixed bottom-0 right-0 z-50 w-full md:w-[600px] transition-all duration-300 ${isExpanded ? 'h-full md:h-[600px]' : 'h-[300px]'} bg-zinc-950 text-zinc-300 border-t md:border-l border-zinc-800 shadow-2xl flex flex-col font-mono text-xs overflow-hidden`}>
            <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">AMG DEBUG CONSOLE</span>
                    <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500 bg-transparent">
                        {logs.length} entries
                    </Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setLogs([])}>
                        <Trash2 className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => setIsOpen(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-2 py-0.5 border-b border-zinc-900/50 hover:bg-zinc-900/40 rounded px-1 group transition-colors">
                            <span className="text-zinc-600 whitespace-nowrap">{format(log.timestamp, "HH:mm:ss")}</span>
                            <span className="flex items-center gap-1">
                                {getLevelIcon(log.level)}
                            </span>
                            <span className={`flex-1 break-all ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-zinc-300'}`}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <div className="p-1 px-3 bg-zinc-900/50 text-[9px] text-zinc-500 flex justify-between">
                <span>AMG Rénovation Management System v1.0.0</span>
                <span>Active Session: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
            </div>
        </div>
    );
}
