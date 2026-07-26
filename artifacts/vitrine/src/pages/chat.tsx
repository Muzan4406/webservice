import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MicOff, ImagePlus, Play, Pause, Loader2, Trash2, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';

const BASE_URL = import.meta.env.BASE_URL;

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

/* ─── Reusable audio player ─── */
function AudioBubble({ url, fromAdmin }: { url: string; fromAdmin: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? (a.pause(), setPlaying(false)) : (a.play(), setPlaying(true));
  };

  return (
    <div className={`flex items-center gap-2.5 min-w-[170px] max-w-[210px] ${fromAdmin ? 'text-white' : 'text-[#1a2a5e]'}`}>
      <audio ref={audioRef} src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => { const a = audioRef.current; if (a?.duration) setProgress(a.currentTime / a.duration); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
      />
      <button onClick={toggle}
        className="shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors active:scale-95">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1.5 rounded-full overflow-hidden ${fromAdmin ? 'bg-white/25' : 'bg-[#1a2a5e]/15'}`}>
          <div className="h-full rounded-full transition-all duration-100 bg-yellow-400"
            style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] opacity-55 font-medium">
          {duration ? `${Math.floor(duration)}s` : '…'}
        </p>
      </div>
    </div>
  );
}

/* ─── Voice preview bar (before send) ─── */
function VoicePreview({
  blob, mimeType, onSend, onCancel, sending,
}: {
  blob: Blob; mimeType: string; onSend: () => void; onCancel: () => void; sending: boolean;
}) {
  const url = useRef(URL.createObjectURL(blob)).current;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? (a.pause(), setPlaying(false)) : (a.play(), setPlaying(true));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 bg-[#1a2a5e]/8 rounded-2xl px-3 py-3"
    >
      <audio ref={audioRef} src={url}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={() => { const a = audioRef.current; if (a?.duration) setProgress(a.currentTime / a.duration); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
      />
      {/* Play/pause */}
      <button onClick={toggle} className="shrink-0 w-9 h-9 rounded-full bg-[#1a2a5e] flex items-center justify-center hover:bg-[#243a7a] active:scale-95">
        {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
      </button>
      {/* Progress + duration */}
      <div className="flex-1 space-y-1 min-w-0">
        <div className="h-1.5 rounded-full overflow-hidden bg-[#1a2a5e]/15">
          <div className="h-full rounded-full bg-yellow-400 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="text-[10px] text-[#1a2a5e]/60 font-medium">{duration ? `${Math.floor(duration)}s` : '…'}</p>
      </div>
      {/* Cancel */}
      <button onClick={onCancel} disabled={sending}
        className="shrink-0 w-9 h-9 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors disabled:opacity-40">
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
      {/* Send */}
      <button onClick={onSend} disabled={sending}
        className="shrink-0 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center hover:bg-emerald-600 transition-colors disabled:opacity-40 active:scale-95">
        {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <CheckCircle className="w-4 h-4 text-white" />}
      </button>
    </motion.div>
  );
}

/* ─── Single message bubble ─── */
function MessageBubble({ msg, onDelete }: { msg: ChatMessage; onDelete: (messageId: number) => void }) {
  const mine = !msg.fromAdmin;
  const canDelete = mine && (msg.type === 'audio' || msg.type === 'image');
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
        mine
          ? 'bg-[#1a2a5e] text-white rounded-br-sm shadow-md'
          : 'bg-[#e8f5e9] text-gray-900 rounded-bl-sm shadow-md border border-green-200'
      }`}>
        {canDelete && (
          <button
            type="button"
            title="Supprimer"
            aria-label="Supprimer ce message"
            onClick={() => onDelete(msg.id)}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        )}
        {msg.type === 'text' && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
        {msg.type === 'image' && msg.fileUrl && (
          <img src={msg.fileUrl} alt="Image" className="rounded-xl max-w-full object-contain" />
        )}
        {msg.type === 'audio' && msg.fileUrl && (
          <AudioBubble url={msg.fileUrl} fromAdmin={msg.fromAdmin} />
        )}
        <p className={`text-[10px] mt-1 ${mine ? 'text-white/50 text-right' : 'text-green-800/60'}`}>
          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          {mine && <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>}
        </p>
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const { token } = useAuth() as any;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Preview state (after recording stops, before sending)
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; mimeType: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat', { headers: authHeaders });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 3000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function uploadFile(blob: Blob, mimeType: string): Promise<string | null> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, mimeType }),
    });
    if (!res.ok) return null;
    return (await res.json()).url ?? null;
  }

  async function sendMsg(type: 'text' | 'audio' | 'image', payload: { content?: string; fileUrl?: string }) {
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? 'Envoi échoué'); return; }
      setText('');
      await fetchMessages();
    } catch { toast.error('Erreur réseau'); }
    finally { setSending(false); }
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      const res = await fetch(`/api/chat/${messageId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) {
        toast.error((await res.json()).error ?? 'Suppression échouée');
        return;
      }
      setMessages((current) => current.filter((message) => message.id !== messageId));
      toast.success('Message supprimé');
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleSendText = async () => {
    if (!text.trim() || sending) return;
    await sendMsg('text', { content: text.trim() });
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    try {
      const url = await uploadFile(file, file.type);
      if (!url) { toast.error('Upload échoué'); return; }
      await sendMsg('image', { fileUrl: url });
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    if (voicePreview) return; // must discard preview first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setVoicePreview({ blob, mimeType }); // show preview instead of sending immediately
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch { toast.error('Accès au microphone refusé'); }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    setRecordingSeconds(0);
  };

  const handleSendVoice = async () => {
    if (!voicePreview) return;
    const { blob, mimeType } = voicePreview;
    setSending(true);
    try {
      const url = await uploadFile(blob, mimeType);
      if (!url) { toast.error('Upload audio échoué'); return; }
      await sendMsg('audio', { fileUrl: url });
      setVoicePreview(null);
    } finally { setSending(false); }
  };

  const handleCancelVoice = () => { setVoicePreview(null); };

  return (
    <div className="flex flex-col h-screen bg-[#F4F6FB]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1a2a5e] to-[#0f1a3e] px-4 pt-10 pb-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors active:scale-95">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          </Link>
          <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 overflow-hidden flex items-center justify-center shrink-0">
            <img src={`${BASE_URL}logo.png`} alt="logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Support Muzan Service</p>
            <p className="text-white/50 text-xs font-medium">En ligne</p>
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-repeat"
        style={{ backgroundImage: `url(${BASE_URL}chat-background.jpg)`, backgroundSize: '320px auto', backgroundColor: '#f0f0f0' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-gray-400 space-y-2">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <span className="text-3xl">💬</span>
            </div>
            <p className="font-semibold text-gray-500">Démarrez la conversation</p>
            <p className="text-sm leading-relaxed">Notre équipe vous répondra dans les plus brefs délais.</p>
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} onDelete={handleDeleteMessage} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-3 space-y-2">
        <AnimatePresence mode="wait">
          {/* ── Recording in progress ── */}
          {recording && (
            <motion.div key="rec" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-3 bg-red-50 rounded-2xl px-4 py-3">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <p className="flex-1 text-red-600 font-semibold text-sm">Enregistrement… {recordingSeconds}s</p>
              <button onClick={stopRecording}
                className="p-2 rounded-full bg-red-500 hover:bg-red-600 transition-colors active:scale-95">
                <MicOff className="w-4 h-4 text-white" />
              </button>
            </motion.div>
          )}

          {/* ── Voice preview (réécouter avant d'envoyer) ── */}
          {!recording && voicePreview && (
            <VoicePreview key="preview"
              blob={voicePreview.blob}
              mimeType={voicePreview.mimeType}
              onSend={handleSendVoice}
              onCancel={handleCancelVoice}
              sending={sending}
            />
          )}

          {/* ── Normal input row ── */}
          {!recording && !voicePreview && (
            <motion.div key="input" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              <button onClick={() => fileInputRef.current?.click()} disabled={sending}
                className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0 disabled:opacity-40 active:scale-95">
                <ImagePlus className="w-5 h-5 text-gray-500" />
              </button>
              <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                  placeholder="Message…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 resize-none outline-none leading-relaxed max-h-[120px] overflow-y-auto"
                />
              </div>
              {text.trim() ? (
                <button onClick={handleSendText} disabled={sending}
                  className="p-2.5 rounded-full bg-[#1a2a5e] hover:bg-[#243a7a] transition-colors shrink-0 disabled:opacity-40 active:scale-95">
                  {sending ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-5 h-5 text-white" />}
                </button>
              ) : (
                <button onClick={startRecording} disabled={sending}
                  className="p-2.5 rounded-full bg-[#1a2a5e] hover:bg-[#243a7a] transition-colors shrink-0 disabled:opacity-40 active:scale-95">
                  <Mic className="w-5 h-5 text-white" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
