"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIncidentDetail, useIncidentMessages, useUpdateIncidentStatus } from "../hooks/use-incidents";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ArrowLeft,
    Send,
    Shield,
    ShieldAlert,
    AlertTriangle,
    Info,
    MapPin,
    Phone,
    User,
    Check,
    CheckCheck,
    Clock,
    MoreVertical,
    Copy,
    ExternalLink,
    ChevronDown,
    Loader2,
    Sparkles,
    PanelRightClose,
    PanelRightOpen,
    Globe,
    MessageSquare,
    AlertCircle
} from "lucide-react";
import { io, Socket } from "socket.io-client";

const FALLBACK_ADMIN_USER_ID = '0282ddf2-e676-492d-a89c-89fd57ace2a9';
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

interface IncidentChatViewProps {
    id: string;
}

interface ChatMessage {
    id: string;
    incidentId: string;
    senderRole: 'ADMIN' | 'TOURIST' | 'SYSTEM' | string;
    senderId?: string;
    content: string;
    timestamp: string | Date;
    isPending?: boolean;
}

// Preset emergency dispatch canned responses for fast response
const CANNED_REPLIES = [
    { label: "Assistance En Route", text: "Emergency assistance has been dispatched to your current location. Please remain calm." },
    { label: "Stay in Safe Area", text: "Please find a well-lit, populated, or secure area and wait for response personnel." },
    { label: "Confirm Location", text: "Can you confirm your exact landmarks or current position for the dispatch team?" },
    { label: "Immediate Danger?", text: "Are you in immediate physical danger right now? If safe, please reply with any urgent details." },
];

function getInitials(name?: string | null): string {
    if (!name) return "T";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateSeparator(dateString: string | Date): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    }
    return date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined
    });
}

function formatTime(dateString: string | Date): string {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function IncidentChatView({ id }: IncidentChatViewProps) {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const adminUserId = currentUser?.id || FALLBACK_ADMIN_USER_ID;
    const adminRole = currentUser?.roleName || 'L2';

    const { data: incident, isLoading: isIncidentLoading, error: incidentError } = useIncidentDetail(id);
    const { data: messageHistory, isLoading: isMessagesLoading, error: messagesError, refetch: refetchMessages } = useIncidentMessages(id);
    const updateStatusMutation = useUpdateIncidentStatus();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isTouristTyping, setIsTouristTyping] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const remoteTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Synchronize initial message history from API
    useEffect(() => {
        if (messageHistory) {
            setMessages(messageHistory);
        }
    }, [messageHistory]);

    // Setup Socket.IO connection and room subscriptions
    useEffect(() => {
        if (!id) return;

        const socket = io(BACKEND_URL, {
            auth: { userId: adminUserId, role: adminRole }
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('chat:join', id);
        });

        // Listen for incoming messages
        socket.on('chat:receive', (msg: ChatMessage) => {
            setIsTouristTyping(false);
            setMessages(prev => {
                // If message already exists or is replacing an optimistic message
                const exists = prev.find(m => m.id === msg.id || (m.isPending && m.content === msg.content && m.senderRole === msg.senderRole));
                if (exists) {
                    return prev.map(m => (m.isPending && m.content === msg.content) ? msg : m);
                }
                return [...prev, msg];
            });
        });

        // Listen for typing events from other participants (e.g. Tourist)
        socket.on('chat:typing', (data: { incidentId: string; isTyping: boolean; senderRole: string; senderName?: string }) => {
            if (data?.incidentId === id && data?.senderRole !== 'ADMIN') {
                setIsTouristTyping(!!data?.isTyping);
                if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                if (data?.isTyping) {
                    remoteTypingTimeoutRef.current = setTimeout(() => {
                        setIsTouristTyping(false);
                    }, 3500);
                }
            }
        });

        return () => {
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
            socket.disconnect();
        };
    }, [id, adminUserId, adminRole]);

    // Auto-scroll to bottom when messages update
    const scrollToBottom = useCallback((smooth = true) => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                top: scrollContainerRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }, []);

    useEffect(() => {
        scrollToBottom(false);
    }, [messages.length]);

    // Handle scroll position to toggle "scroll to bottom" button
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
        setShowScrollBottom(!isNearBottom);
    };

    // Emit typing indicator to socket
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInput(val);

        if (!socketRef.current) return;

        if (val.trim().length > 0) {
            socketRef.current.emit('chat:typing', {
                incidentId: id,
                isTyping: true,
                senderRole: 'ADMIN',
                senderName: currentUser?.fullName || 'Dispatch Officer'
            });

            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            typingDebounceRef.current = setTimeout(() => {
                socketRef.current?.emit('chat:typing', {
                    incidentId: id,
                    isTyping: false,
                    senderRole: 'ADMIN'
                });
            }, 2500);
        } else {
            if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
            socketRef.current.emit('chat:typing', {
                incidentId: id,
                isTyping: false,
                senderRole: 'ADMIN'
            });
        }
    };

    // Handle sending a message
    const handleSend = (textToSend?: string) => {
        const messageText = (textToSend || input).trim();
        if (!messageText || isSending) return;

        setIsSending(true);

        // Cancel typing indicator
        if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
        socketRef.current?.emit('chat:typing', {
            incidentId: id,
            isTyping: false,
            senderRole: 'ADMIN'
        });

        const optimisticMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            incidentId: id,
            content: messageText,
            senderRole: 'ADMIN',
            senderId: adminUserId,
            timestamp: new Date().toISOString(),
            isPending: true
        };

        setMessages(prev => [...prev, optimisticMessage]);
        setInput("");
        setIsSending(false);

        // Emit through socket
        socketRef.current?.emit('chat:send', {
            incidentId: id,
            content: messageText,
            senderRole: 'ADMIN',
            senderId: adminUserId
        });

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }
    };

    // Keydown handler: Enter to send, Shift+Enter for newline
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const copyIncidentId = () => {
        if (!incident?.id) return;
        navigator.clipboard.writeText(incident.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // Grouping consecutive messages
    const messageGroups = useMemo(() => {
        return messages.map((msg, index) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];

            const msgTime = new Date(msg.timestamp).getTime();
            const prevTime = prev ? new Date(prev.timestamp).getTime() : 0;
            const nextTime = next ? new Date(next.timestamp).getTime() : 0;

            const isSameSenderAsPrev = prev && prev.senderRole === msg.senderRole && (msgTime - prevTime < 120000);
            const isSameSenderAsNext = next && next.senderRole === msg.senderRole && (nextTime - msgTime < 120000);

            // Date separator check
            const showDateSeparator = !prev || (new Date(msg.timestamp).toDateString() !== new Date(prev.timestamp).toDateString());

            return {
                message: msg,
                isFirstInGroup: !isSameSenderAsPrev,
                isLastInGroup: !isSameSenderAsNext,
                showDateSeparator,
                dateSeparatorText: showDateSeparator ? formatDateSeparator(msg.timestamp) : null,
            };
        });
    }, [messages]);

    // Severity color styling
    const severityBadge = (severity?: string) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
                return 'bg-red-500/15 text-red-400 border-red-500/30';
            case 'WARNING':
                return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            default:
                return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
        }
    };

    // Status badge styling
    const statusBadge = (status?: string) => {
        switch (status?.toUpperCase()) {
            case 'RESOLVED':
                return {
                    label: 'Resolved',
                    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                    dot: 'bg-emerald-400'
                };
            case 'RESPONDING':
                return {
                    label: 'Responding',
                    color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
                    dot: 'bg-blue-400 animate-pulse'
                };
            default:
                return {
                    label: 'Open',
                    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    dot: 'bg-amber-400'
                };
        }
    };

    const touristName = incident?.tourist?.fullName || "Tourist";
    const touristInitials = getInitials(touristName);
    const incidentStatusInfo = statusBadge(incident?.status);

    // Loading State
    if (isIncidentLoading || isMessagesLoading) {
        return (
            <div className="p-4 md:p-6 h-[calc(100vh-80px)] max-w-5xl mx-auto flex flex-col justify-center items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    Connecting to incident dispatch room...
                </p>
            </div>
        );
    }

    // Error State
    if (incidentError || !incident) {
        return (
            <div className="p-6 h-[calc(100vh-80px)] max-w-lg mx-auto flex flex-col items-center justify-center text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-foreground">Incident not found</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Could not load conversation data for Incident #{id.slice(0, 8)}.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                    <Button onClick={() => refetchMessages()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-5 h-[calc(100vh-80px)] max-w-6xl mx-auto flex flex-col">
            {/* Top Navigation & Status Bar */}
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-xl px-4 py-3 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                {/* Left Header Group */}
                <div className="flex items-center gap-3 min-w-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg"
                        title="Back to incident list"
                        aria-label="Back to incidents list"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>

                    {/* Tourist Avatar with Online Badge */}
                    <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 border border-border/80 bg-secondary/80 ring-2 ring-primary/20">
                            <AvatarFallback className="font-semibold text-xs text-primary bg-primary/10">
                                {touristInitials}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                    </div>

                    {/* Details and Meta */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base font-semibold text-foreground truncate max-w-[180px] sm:max-w-[280px]">
                                {touristName}
                            </h1>

                            <Badge variant="outline" className="font-mono text-[11px] border-border text-muted-foreground bg-secondary/40 shrink-0">
                                #{incident.id.slice(0, 8).toUpperCase()}
                            </Badge>

                            <Badge className={`text-[11px] font-medium border shrink-0 ${severityBadge(incident.severity)}`}>
                                {incident.type.replace(/_/g, ' ')}
                            </Badge>

                            <Badge className={`text-[11px] font-medium border flex items-center gap-1.5 shrink-0 ${incidentStatusInfo.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${incidentStatusInfo.dot}`} />
                                {incidentStatusInfo.label}
                            </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                            {incident.tourist?.phoneNumber && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {incident.tourist.phoneNumber}
                                </span>
                            )}
                            {incident.tourist?.nationality && (
                                <span className="flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    {incident.tourist.nationality}
                                </span>
                            )}
                            {incident.region?.name && (
                                <span className="flex items-center gap-1 text-muted-foreground/80">
                                    <MapPin className="w-3 h-3" />
                                    {incident.region.name}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        variant={isDetailsOpen ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="h-8 text-xs gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
                        aria-label="Toggle incident details sidebar"
                    >
                        {isDetailsOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Incident Info</span>
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                            <DropdownMenuItem onClick={() => router.push(`/incidents/${id}`)} className="cursor-pointer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Full Incident File
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={copyIncidentId} className="cursor-pointer">
                                <Copy className="w-4 h-4 mr-2" />
                                {copiedId ? "Copied Incident ID!" : "Copy Incident ID"}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-border" />

                            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                                Incident Status
                            </div>

                            <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id, status: 'OPEN' })}
                                disabled={incident.status === 'OPEN'}
                                className="cursor-pointer text-amber-400"
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-400 mr-2" />
                                Mark as Open
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id, status: 'RESPONDING' })}
                                disabled={incident.status === 'RESPONDING'}
                                className="cursor-pointer text-blue-400"
                            >
                                <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                                Mark as Responding
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => updateStatusMutation.mutate({ id, status: 'RESOLVED' })}
                                disabled={incident.status === 'RESOLVED'}
                                className="cursor-pointer text-emerald-400"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                                Mark as Resolved
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Main Chat Layout Container (with collapsible side details) */}
            <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
                {/* Chat Panel */}
                <Card className="flex-1 flex flex-col bg-card border-border overflow-hidden shadow-xs relative">
                    {/* Messages Scroll Area */}
                    <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 chat-scroll"
                    >
                        {/* Channel Security Banner */}
                        <div className="flex items-center justify-center my-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/40 border border-border/60 text-[11px] text-muted-foreground">
                                <Shield className="w-3.5 h-3.5 text-primary" />
                                <span>Emergency Incident Channel. Direct live communication with tourist.</span>
                            </div>
                        </div>

                        {/* Message list with grouping */}
                        {messageGroups.map(({ message: msg, isFirstInGroup, isLastInGroup, showDateSeparator, dateSeparatorText }) => {
                            const isAdmin = msg.senderRole === 'ADMIN';
                            const isSystem = msg.senderRole === 'SYSTEM';

                            return (
                                <div key={msg.id} className="space-y-1.5">
                                    {/* Date separator pill */}
                                    {showDateSeparator && dateSeparatorText && (
                                        <div className="flex items-center justify-center my-4">
                                            <span className="text-[11px] font-medium text-muted-foreground bg-secondary/50 border border-border/60 px-3 py-0.5 rounded-full shadow-2xs">
                                                {dateSeparatorText}
                                            </span>
                                        </div>
                                    )}

                                    {/* System messages */}
                                    {isSystem ? (
                                        <div className="flex justify-center my-2">
                                            <div className="max-w-md bg-secondary/30 border border-border/50 text-muted-foreground text-xs px-3.5 py-2 rounded-lg text-center flex items-center gap-2">
                                                <Info className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                                                <span>{msg.content}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        /* User & Admin messages */
                                        <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                            {/* Sender identification label on group start */}
                                            {isFirstInGroup && (
                                                <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] font-medium text-muted-foreground ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                                    {!isAdmin && (
                                                        <span className="text-foreground">{touristName}</span>
                                                    )}
                                                    {isAdmin && (
                                                        <span className="text-primary font-semibold">Dispatch (You)</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Message Bubble */}
                                            <div
                                                className={`relative max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 shadow-2xs text-sm leading-relaxed ${
                                                    isAdmin
                                                        ? 'bg-primary text-primary-foreground ' +
                                                          (isFirstInGroup && isLastInGroup
                                                              ? 'rounded-2xl rounded-tr-xs'
                                                              : isFirstInGroup
                                                              ? 'rounded-2xl rounded-tr-xs rounded-br-md'
                                                              : isLastInGroup
                                                              ? 'rounded-2xl rounded-r-md rounded-br-xs'
                                                              : 'rounded-2xl rounded-r-md')
                                                        : 'bg-secondary/70 border border-border/70 text-foreground ' +
                                                          (isFirstInGroup && isLastInGroup
                                                              ? 'rounded-2xl rounded-tl-xs'
                                                              : isFirstInGroup
                                                              ? 'rounded-2xl rounded-tl-xs rounded-bl-md'
                                                              : isLastInGroup
                                                              ? 'rounded-2xl rounded-l-md rounded-bl-xs'
                                                              : 'rounded-2xl rounded-l-md')
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                                                {/* Timestamp and delivery receipts */}
                                                <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                                                    isAdmin ? 'text-primary-foreground/75' : 'text-muted-foreground'
                                                }`}>
                                                    <span>{formatTime(msg.timestamp)}</span>
                                                    {isAdmin && (
                                                        <span>
                                                            {msg.isPending ? (
                                                                <Clock className="w-3 h-3 text-primary-foreground/60 animate-pulse" />
                                                            ) : (
                                                                <CheckCheck className="w-3 h-3 text-primary-foreground/80" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Empty Conversation State */}
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground my-auto">
                                <div className="w-14 h-14 rounded-full bg-secondary/40 border border-border/60 flex items-center justify-center mb-3 text-primary">
                                    <MessageSquare className="w-7 h-7" />
                                </div>
                                <h3 className="font-semibold text-foreground text-sm">No messages yet</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    The dispatch session is active. Send a message to coordinate with {touristName}.
                                </p>
                            </div>
                        )}

                        {/* Tourist Typing Indicator */}
                        {isTouristTyping && (
                            <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-200">
                                <Avatar className="h-6 w-6 border border-border bg-secondary/80">
                                    <AvatarFallback className="text-[10px] text-muted-foreground">
                                        {touristInitials}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-secondary/40 border border-border/60 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{touristName} is typing</span>
                                    <span className="flex gap-1 items-center">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Floating Scroll to Bottom Button */}
                    {showScrollBottom && (
                        <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => scrollToBottom(true)}
                            className="absolute bottom-28 right-6 h-9 w-9 rounded-full shadow-md border border-border bg-secondary/90 hover:bg-secondary text-foreground z-10"
                            aria-label="Scroll to bottom"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Quick Canned Dispatch Responses */}
                    <div className="px-4 pt-2.5 pb-1 bg-card border-t border-border/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-primary" />
                            Quick Replies:
                        </span>
                        {CANNED_REPLIES.map((reply, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSend(reply.text)}
                                className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-secondary/50 hover:bg-secondary hover:text-foreground text-muted-foreground border border-border/50 transition-colors cursor-pointer"
                                title={reply.text}
                            >
                                {reply.label}
                            </button>
                        ))}
                    </div>

                    {/* Message Composer Footer */}
                    <div className="p-3 sm:p-4 bg-card border-t border-border">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend();
                            }}
                            className="flex items-end gap-2"
                        >
                            <div className="flex-1 bg-secondary/40 border border-border rounded-xl focus-within:border-primary/70 focus-within:ring-1 focus-within:ring-primary/30 transition-all p-1.5">
                                <textarea
                                    ref={textareaRef}
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    placeholder="Type a message to the tourist... (Enter to send, Shift+Enter for new line)"
                                    className="w-full bg-transparent resize-none border-0 px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none max-h-32 min-h-[36px]"
                                    aria-label="Message to tourist"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={!input.trim() || isSending}
                                size="icon"
                                className="h-11 w-11 rounded-xl shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground transition-all cursor-pointer disabled:opacity-50"
                                aria-label="Send message"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </form>
                    </div>
                </Card>

                {/* Collapsible Incident Details Sidebar */}
                {isDetailsOpen && (
                    <Card className="w-80 shrink-0 bg-card border-border flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary" />
                                Incident Summary
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDetailsOpen(false)}
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                                <PanelRightClose className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs chat-scroll">
                            {/* Incident Type & Severity */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Classification</label>
                                <div className="flex items-center gap-2">
                                    <Badge className={`border ${severityBadge(incident.severity)}`}>
                                        {incident.severity}
                                    </Badge>
                                    <Badge variant="outline" className="border-border">
                                        {incident.type.replace(/_/g, ' ')}
                                    </Badge>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Report Description</label>
                                <div className="p-2.5 rounded-lg bg-secondary/40 border border-border/60 text-foreground leading-relaxed">
                                    {incident.description || "No additional description provided."}
                                </div>
                            </div>

                            {/* Tourist Profile */}
                            <div className="space-y-2 pt-2 border-t border-border/60">
                                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Tourist Details</label>
                                <div className="space-y-1.5 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-primary" />
                                        <span className="font-medium text-foreground">{touristName}</span>
                                    </div>
                                    {incident.tourist?.phoneNumber && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-primary" />
                                            <span>{incident.tourist.phoneNumber}</span>
                                        </div>
                                    )}
                                    {incident.tourist?.nationality && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5 text-primary" />
                                            <span>Nationality: {incident.tourist.nationality}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Location Details */}
                            <div className="space-y-2 pt-2 border-t border-border/60">
                                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Location & Region</label>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2 text-foreground">
                                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                                        <span>{incident.region?.name || "General Surveillance Zone"}</span>
                                    </div>
                                    {incident.latitude && incident.longitude && (
                                        <div className="text-[11px] text-muted-foreground font-mono pl-5">
                                            {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Timing */}
                            <div className="space-y-1 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Filed at:</span>
                                    <span className="text-foreground">{new Date(incident.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Last update:</span>
                                    <span className="text-foreground">{new Date(incident.updatedAt).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 border-t border-border bg-secondary/20">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/incidents/${id}`)}
                                className="w-full text-xs border-border"
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Open Full Incident File
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
