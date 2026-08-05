import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  MessageCircle,
  Search,
  Pin,
  UserCheck,
  StickyNote,
  Send,
  CheckCheck,
  Check,
  Clock,
  Archive,
  CheckCircle,
  XCircle,
  MoreVertical,
  Paperclip,
  Smile,
  FileText,
  User,
  Phone,
  Tag,
  Plus,
  Image as ImageIcon,
  File as FileIcon,
  Video as VideoIcon,
  Music as AudioIcon,
} from 'lucide-react';

export default function SharedInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [teamAgents, setTeamAgents] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'closed' | 'all'

  // Input state
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');

  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get(`/inbox/conversations?status=${statusFilter}&search=${search}`);
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAgents = async () => {
    try {
      const res = await api.get('/users');
      if (res.success && res.data) {
        setTeamAgents(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadThread = async (conv) => {
    try {
      const res = await api.get(`/inbox/conversations/${conv._id}`);
      if (res.success && res.data) {
        setSelectedConversation(res.data.conversation);
        setMessages(res.data.messages);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchTeamAgents();
  }, [statusFilter, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedConversation) return;

    setSendingMsg(true);
    const body = inputText;
    setInputText('');

    try {
      const targetPhone = selectedConversation.waId || selectedConversation.customerPhone;
      const res = await api.post('/whatsapp/send', {
        to: targetPhone,
        type: 'text',
        body,
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data.message]);
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to send message via Meta Cloud API');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedConversation) return;
    try {
      const res = await api.put(`/inbox/conversations/${selectedConversation._id}/assign`, { agentId });
      if (res.success && res.data) {
        setSelectedConversation(res.data);
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to assign agent');
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedConversation) return;
    const newStatus = selectedConversation.status === 'closed' ? 'open' : 'closed';
    try {
      const res = await api.put(`/inbox/conversations/${selectedConversation._id}/status`, { status: newStatus });
      if (res.success && res.data) {
        setSelectedConversation(res.data);
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleTogglePin = async () => {
    if (!selectedConversation) return;
    try {
      const res = await api.put(`/inbox/conversations/${selectedConversation._id}/pin`);
      if (res.success) {
        setSelectedConversation((prev) => ({ ...prev, isPinned: res.data.isPinned }));
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle pin');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNoteText.trim() || !selectedConversation) return;

    try {
      const res = await api.post(`/inbox/conversations/${selectedConversation._id}/note`, {
        text: internalNoteText,
      });

      if (res.success && res.data) {
        setSelectedConversation((prev) => ({ ...prev, internalNotes: res.data }));
        setInternalNoteText('');
      }
    } catch (err) {
      alert(err.message || 'Failed to add internal note');
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] flex gap-4 overflow-hidden">
        {/* Module 4: Shared Inbox Conversation List */}
        <div className="w-80 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" /> Shared Inbox
              </h2>
              <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setStatusFilter('open')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    statusFilter === 'open' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setStatusFilter('closed')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    statusFilter === 'closed' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Closed
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, waId..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations Directory */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin">
            {conversations.map((conv) => {
              const isSelected = selectedConversation?._id === conv._id;
              const phoneDisplay = conv.waId || conv.customerPhone;
              return (
                <div
                  key={conv._id}
                  onClick={() => loadThread(conv)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    isSelected ? 'bg-emerald-500/10 border-l-2 border-emerald-500' : 'hover:bg-slate-850/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                    {conv.customerName ? conv.customerName[0].toUpperCase() : 'C'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-white truncate flex items-center gap-1">
                        {conv.customerName || phoneDisplay}
                        {conv.isPinned && <Pin className="w-3 h-3 text-emerald-400 fill-current" />}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 truncate">{conv.lastMessage || 'No messages yet'}</p>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-slate-500">{phoneDisplay}</span>
                      {(conv.assignedAgent?.name || conv.assignedAgentId?.name) && (
                        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {conv.assignedAgent?.name || conv.assignedAgentId?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 5: Chat Window Thread */}
        <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col overflow-hidden min-w-0">
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                    {selectedConversation.customerName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      {selectedConversation.customerName}
                      <span className="text-[10px] font-mono text-slate-400">
                        ({selectedConversation.waId || selectedConversation.customerPhone})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          selectedConversation.status === 'closed'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {selectedConversation.status || 'Open'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedConversation.status === 'closed' ? 'secondary' : 'danger'}
                    onClick={handleToggleStatus}
                    className="text-xs py-1 px-2.5"
                  >
                    {selectedConversation.status === 'closed' ? 'Reopen Chat' : 'Close Chat'}
                  </Button>

                  <select
                    value={selectedConversation.assignedAgent?._id || selectedConversation.assignedAgentId?._id || ''}
                    onChange={(e) => handleAssignAgent(e.target.value)}
                    className="bg-slate-950 text-slate-300 text-xs rounded-lg px-2 py-1 border border-slate-800 focus:outline-none"
                  >
                    <option value="">Unassigned Agent</option>
                    {teamAgents.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.role})
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleTogglePin}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      selectedConversation.isPinned
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                    title="Pin Conversation"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-wa-darkBg scrollbar-thin">
                {messages.map((msg) => {
                  const isOutbound = msg.direction === 'outbound' || msg.senderType === 'agent';
                  const mType = msg.messageType || msg.type || 'text';
                  const mBody = msg.messageBody || msg.body || '';
                  const mStatus = msg.deliveryStatus || msg.status || 'sent';

                  return (
                    <div key={msg._id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-md ${
                          isOutbound ? 'bg-wa-bubbleOut text-white rounded-tr-none' : 'bg-wa-bubbleIn text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {!isOutbound && (
                          <p className="font-bold text-[10px] text-emerald-400 mb-1">
                            {msg.sender?.name || selectedConversation.customerName || 'Customer'}
                          </p>
                        )}

                        {/* Media rendering for images, docs, video, audio */}
                        {mType === 'image' && msg.mediaUrl && (
                          <div className="mb-2">
                            <img src={msg.mediaUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover w-full" />
                          </div>
                        )}

                        {mType === 'document' && msg.mediaUrl && (
                          <a
                            href={msg.mediaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800 mb-2 hover:bg-slate-900"
                          >
                            <FileIcon className="w-4 h-4 text-emerald-400" />
                            <span className="underline truncate">{msg.filename || 'Document Attachment'}</span>
                          </a>
                        )}

                        {mType === 'audio' && msg.mediaUrl && (
                          <audio controls className="w-full mb-2">
                            <source src={msg.mediaUrl} />
                          </audio>
                        )}

                        {mType === 'video' && msg.mediaUrl && (
                          <video controls className="w-full rounded-lg max-h-48 mb-2">
                            <source src={msg.mediaUrl} />
                          </video>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">{mBody}</p>

                        <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                          <span>
                            {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOutbound && (
                            <span>
                              {mStatus === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-sky-400" />
                              ) : mStatus === 'delivered' ? (
                                <CheckCheck className="w-3 h-3 text-slate-400" />
                              ) : mStatus === 'failed' ? (
                                <XCircle className="w-3 h-3 text-rose-400" />
                              ) : (
                                <Check className="w-3 h-3 text-slate-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-950 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type WhatsApp message..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
                <Button type="submit" loading={sendingMsg} icon={Send} size="sm">
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <MessageCircle className="w-10 h-10 text-slate-700 mb-2" />
              Select a conversation from the left to open live WhatsApp chat.
            </div>
          )}
        </div>

        {/* Right Details Inspector */}
        {selectedConversation && (
          <div className="w-72 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col flex-shrink-0 space-y-4 overflow-y-auto scrollbar-thin">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-400" /> Customer Profile
              </h4>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-white">{selectedConversation.customerName}</p>
                <p className="text-slate-400 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" /> {selectedConversation.waId || selectedConversation.customerPhone}
                </p>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-400" /> Team Internal Notes
              </h4>

              <form onSubmit={handleAddNote} className="mb-3">
                <textarea
                  rows={2}
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Add note for team agents..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 mb-1"
                />
                <Button type="submit" size="sm" variant="secondary" className="w-full">
                  Post Note
                </Button>
              </form>

              <div className="space-y-2 overflow-y-auto max-h-60 scrollbar-thin">
                {(selectedConversation.internalNotes || []).map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <p className="text-amber-300 font-medium">{note.text}</p>
                    <p className="text-[10px] text-amber-400/60 text-right">
                      {note.authorName} • {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
