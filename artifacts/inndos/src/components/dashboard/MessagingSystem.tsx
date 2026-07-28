import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, MoreVertical, Phone, Video } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
    status: "online" | "offline";
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export function MessagingSystem() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.role || "user", // current user
      text: newMessage,
      timestamp: new Date(),
      isRead: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversationId) {
        return {
          ...c,
          messages: [...c.messages, message],
          lastMessage: message.text,
          lastMessageTime: message.timestamp
        };
      }
      return c;
    }));

    setNewMessage("");

    // Simulate Reply
    setTimeout(() => {
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        senderId: activeConversation?.participant.id || "other",
        text: "Thanks for your message! We'll get back to you shortly.",
        timestamp: new Date(),
        isRead: false
      };

      setConversations(prev => prev.map(c => {
        if (c.id === activeConversationId) {
          return {
            ...c,
            messages: [...c.messages, reply],
            lastMessage: reply.text,
            lastMessageTime: reply.timestamp
          };
        }
        return c;
      }));
    }, 2000);
  };

  return (
    <div className="h-[600px] grid grid-cols-1 md:grid-cols-3 border rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Sidebar List */}
      <div className="border-r flex flex-col">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
                <Search className="h-8 w-8 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Conversations with guests and support will appear here</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-gray-50 ${
                    activeConversationId === conv.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent"
                  }`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarImage src={conv.participant.avatar} />
                      <AvatarFallback>{conv.participant.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {conv.participant.status === 'online' && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold truncate">{conv.participant.name}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="col-span-2 flex flex-col h-full">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{activeConversation.participant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-sm">{activeConversation.participant.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{activeConversation.participant.role} • {activeConversation.participant.status}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gray-50/50">
              <div className="space-y-4">
                {activeConversation.messages.map((msg, idx) => {
                  const isMe = msg.senderId === (user?.role || "user");
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          isMe
                            ? "bg-primary text-white rounded-br-none"
                            : "bg-white border shadow-sm rounded-bl-none"
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input 
                  placeholder="Type a message..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" size="icon" className="bg-primary">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
