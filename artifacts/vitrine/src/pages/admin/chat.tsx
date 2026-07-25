import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const API = (path: string) => path;

interface ChatMessage {
  id: number;
  userId: number;
  fromAdmin: boolean;
  content: string | null;
  type: string;
  fileUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ChatUser {
  user: { id: number; username: string; userId: string };
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

function AudioBubble({ url, fromAdmin }: { url: string; fromAdmin: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };
  return (
    <div className={`flex items-center gap-2 min-w-[140px] max-w-[180px] ${fromAdmin ? 'text-white' : 'text-[#1a2a5e]'}`}>
      <audio ref={audioRef} src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => { const a = audioRef.current; if (a?.duration) setProgress(a.currentTime / a.duration); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
      />
      <button onClick={toggle} className="shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
        {playing ? '⏸' : '▶'}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1 rounded-full overflow-hidden ${fromAdmin ? 'bg-white/30' : 'bg-[#1a2a5e]/20'}`}>
          <div className={`h-full rounded-full ${fromAdmin ? 'bg-white' : 'bg-[#1a2a5e]'}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] opacity-60">{duration ? `${Math.floor(duration)}s` : '—'}</p>
      </div>
    </div>
  );
}

export default function AdminChatPage() {
  const { token } = useAuth() as any;
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(API('/api/admin/chat/users'), { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { /* ignore */ }
  }, [token]);

  const fetchMessages = useCallback(async (uid: number) => {
    try {
      const res = await fetch(API(`/api/admin/chat/${uid}`), { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { fetchUsers(); const id = setInterval(fetchUsers, 5000); return () => clearInterval(id); }, [fetchUsers]);

  useEffect(() => {
    if (!selectedUid) return;
    fetchMessages(selectedUid);
    const id = setInterval(() => fetchMessages(selectedUid), 3000);
    return () => clearInterval(id);
  }, [selectedUid, fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !selectedUid || sending) return;
    setSending(true);
    try {
      const res = await fetch(API(`/api/admin/chat/${selectedUid}`), {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content: reply.trim() }),
      });
      if (!res.ok) { toast.error('Envoi échoué'); return; }
      setReply('');
      await fetchMessages(selectedUid);
      await fetchUsers();
    } catch { toast.error('Erreur réseau'); }
    finally { setSending(false); }
  };

  const selectedUser = users.find((u) => u.user.id === selectedUid);

  return (
    <div className="flex h-screen bg-[#F4F6FB]">
      {/* Sidebar */}
      <div className={`${selectedUid ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 bg-white border-r border-gray-100 shrink-0`}>
        <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-4 pt-10 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            </Link>
            <h1 className="text-white font-bold text-lg">Chat Support</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p>Aucune conversation</p>
            </div>
          )}
          {users.map(({ user, lastMessage, unreadCount }) => (
            <button
              key={user.id}
              onClick={() => setSelectedUid(user.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left ${selectedUid === user.id ? 'bg-blue-50' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-[#1a2a5e]/10 flex items-center justify-center shrink-0">
                <span className="text-[#1a2a5e] font-bold text-sm">{user.username[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm truncate">{user.username}</p>
                  {lastMessage && (
                    <p className="text-[10px] text-gray-400 shrink-0 ml-1">
                      {new Date(lastMessage.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {lastMessage?.type === 'audio' ? '🎤 Message vocal' :
                   lastMessage?.type === 'image' ? '📷 Image' :
                   lastMessage?.content ?? '—'}
                </p>
              </div>
              {unreadCount > 0 && (
                <span className="ml-1 shrink-0 min-w-[20px] h-5 rounded-full bg-[#1a2a5e] text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      {selectedUid ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat header */}
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
            <button onClick={() => setSelectedUid(null)} className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1a2a5e]/10 flex items-center justify-center">
              <span className="text-[#1a2a5e] font-bold text-sm">{selectedUser?.user.username[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{selectedUser?.user.username}</p>
              <p className="text-[11px] text-gray-400">{selectedUser?.user.userId}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.fromAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                  msg.fromAdmin
                    ? 'bg-[#1a2a5e] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'
                }`}>
                  {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  {msg.type === 'image' && msg.fileUrl && <img src={msg.fileUrl} alt="img" className="rounded-xl max-h-48 object-cover" />}
                  {msg.type === 'audio' && msg.fileUrl && <AudioBubble url={msg.fileUrl} fromAdmin={msg.fromAdmin} />}
                  <p className={`text-[10px] mt-1 ${msg.fromAdmin ? 'text-white/50 text-right' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Reply bar */}
          <div className="bg-white border-t border-gray-100 px-3 py-3 flex items-end gap-2 shrink-0">
            <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
              <textarea
                value={reply}
                onChange={(e) => { setReply(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Répondre…"
                rows={1}
                className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none leading-relaxed max-h-[120px] overflow-y-auto"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!reply.trim() || sending}
              className="p-2.5 rounded-full bg-[#1a2a5e] hover:bg-[#243a7a] transition-colors disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 flex-col gap-3">
          <MessageSquare className="w-12 h-12 opacity-30" />
          <p className="text-sm">Sélectionnez une conversation</p>
        </div>
      )}
    </div>
  );
}
