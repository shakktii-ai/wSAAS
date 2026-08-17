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
  MapPin,
  Contact as ContactIcon,
  Copy,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  X,
  Upload,
} from 'lucide-react';

export default function SharedInbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [teamAgents, setTeamAgents] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'closed' | 'all'

  // Input & Attachment drawer state
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // Modals for attachments
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locName, setLocName] = useState('Central Office');
  const [locLat, setLocLat] = useState('18.5204');
  const [locLng, setLocLng] = useState('73.8567');

  const [showContactModal, setShowContactModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaCaptionInput, setMediaCaptionInput] = useState('');

  // Tags Editor
  const [newTagInput, setNewTagInput] = useState('');
  const [tagsList, setTagsList] = useState([]);

  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get(`/inbox/conversations?status=${statusFilter}&search=${search}`);
      if (res.success && res.data) {
        setConversations(res.data.conversations || res.data);
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
        setCustomerProfile(res.data.contact);
        setTagsList(res.data.conversation.tags || []);
        setMessages(res.data.messages);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectedConvRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();
    fetchTeamAgents();

    // SSE / Real-time Live Polling Engine (every 3 seconds)
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConvRef.current?._id) {
        api.get(`/inbox/conversations/${selectedConvRef.current._id}`).then((res) => {
          if (res.success && res.data) {
            setMessages(res.data.messages);
          }
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [statusFilter, search]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e, customType = 'text', customPayload = {}) => {
    if (e) e.preventDefault();
    if (!selectedConversation) return;

    setSendingMsg(true);
    const targetPhone = selectedConversation.waId || selectedConversation.customerPhone;

    try {
      const payload = {
        to: targetPhone,
        type: customType,
        body: customType === 'text' ? inputText : '',
        ...customPayload,
      };

      if (customType === 'text') setInputText('');

      const res = await api.post('/whatsapp/send', payload);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data.message]);
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to send message via Meta Cloud API');
    } finally {
      setSendingMsg(false);
      setShowAttachmentMenu(false);
    }
  };

  const handleSendLocation = async (e) => {
    e.preventDefault();
    await handleSendMessage(null, 'location', {
      location: {
        latitude: parseFloat(locLat),
        longitude: parseFloat(locLng),
        name: locName,
      },
    });
    setShowLocationModal(false);
  };

  const handleSendContactCard = async (e) => {
    e.preventDefault();
    await handleSendMessage(null, 'contacts', {
      contactCard: {
        name: cName,
        phone: cPhone,
      },
    });
    setShowContactModal(false);
  };

  const handleSendMedia = async (e) => {
    e.preventDefault();
    await handleSendMessage(null, mediaType, {
      mediaUrl: mediaUrlInput,
      mediaCaption: mediaCaptionInput,
    });
    setShowMediaModal(false);
    setMediaUrlInput('');
    setMediaCaptionInput('');
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

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    alert('Message copied to clipboard!');
  };

  // Helper for Date Separators
  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-6rem)] flex gap-4 overflow-hidden">
        {/* Module 4: Shared Inbox Sidebar */}
        <div className="w-80 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden flex-shrink-0 shadow-xs">
          <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" /> Shared Inbox
              </h2>
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 text-[11px]">
                <button
                  onClick={() => setStatusFilter('open')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    statusFilter === 'open' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setStatusFilter('closed')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    statusFilter === 'closed' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Closed
                </button>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    statusFilter === 'all' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, phone, waId..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Conversations Directory */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {conversations.map((conv) => {
              const isSelected = selectedConversation?._id === conv._id;
              const phoneDisplay = conv.waId || conv.customerPhone;
              return (
                <div
                  key={conv._id}
                  onClick={() => loadThread(conv)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    isSelected ? 'bg-emerald-50 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                    {conv.customerName ? conv.customerName[0].toUpperCase() : 'C'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        {conv.customerName || phoneDisplay}
                        {conv.isPinned && <Pin className="w-3 h-3 text-emerald-600 fill-current" />}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 truncate font-normal">{conv.lastMessage || 'No messages yet'}</p>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-slate-500">{phoneDisplay}</span>
                      {(conv.assignedAgent?.name || conv.assignedAgentId?.name) && (
                        <span className="text-[9px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                          {conv.assignedAgent?.name || conv.assignedAgentId?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {conv.unreadCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Module 5: Chat Window Thread */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden min-w-0 relative shadow-xs">
          {selectedConversation ? (
            <>
              {/* Thread Header */}
              <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {selectedConversation.customerName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      {selectedConversation.customerName}
                      <span className="text-[10px] font-mono text-slate-500">
                        ({selectedConversation.waId || selectedConversation.customerPhone})
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          selectedConversation.status === 'closed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
                    className="bg-white text-slate-800 text-xs rounded-lg px-2 py-1 border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
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
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                    title="Pin Conversation"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70 scrollbar-thin">
                {messages.map((msg, index) => {
                  const isOutbound = msg.direction === 'outbound' || msg.senderType === 'agent';
                  const mType = msg.messageType || msg.type || 'text';
                  const mBody = msg.messageBody || msg.body || '';
                  const mStatus = msg.deliveryStatus || msg.status || 'sent';

                  const prevMsg = messages[index - 1];
                  const showDateHeader =
                    !prevMsg ||
                    new Date(prevMsg.timestamp || prevMsg.createdAt).toDateString() !==
                      new Date(msg.timestamp || msg.createdAt).toDateString();

                  return (
                    <React.Fragment key={msg._id || index}>
                      {showDateHeader && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider shadow-xs">
                            {formatDateHeader(msg.timestamp || msg.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} group`}>
                        <div
                          className={`max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
                            isOutbound ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          {!isOutbound && (
                            <p className="font-bold text-[10px] text-emerald-700 mb-1">
                              {msg.sender?.name || selectedConversation.customerName || 'Customer'}
                            </p>
                          )}

                          {/* Render Media / Attachments */}
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
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 mb-2 hover:bg-slate-100"
                            >
                              <FileIcon className="w-4 h-4 text-emerald-600" />
                              <span className="underline truncate font-medium">{msg.filename || 'Document Attachment'}</span>
                            </a>
                          )}

                          {mType === 'location' && msg.location && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                              <p className="font-bold text-emerald-700 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> {msg.location.name}
                              </p>
                              <p className="text-[10px] text-slate-500">{msg.location.latitude}, {msg.location.longitude}</p>
                            </div>
                          )}

                          {mType === 'contacts' && msg.contactCard && (
                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 mb-2">
                              <p className="font-bold text-slate-900 flex items-center gap-1">
                                <ContactIcon className="w-3.5 h-3.5 text-teal-600" /> {msg.contactCard.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">{msg.contactCard.phone}</p>
                            </div>
                          )}

                          {mBody && <p className="whitespace-pre-wrap leading-relaxed font-normal">{mBody}</p>}

                          <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isOutbound ? 'text-emerald-100' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && (
                              <span>
                                {mStatus === 'read' ? (
                                  <CheckCheck className="w-3 h-3 text-white" />
                                ) : mStatus === 'delivered' ? (
                                  <CheckCheck className="w-3 h-3 text-emerald-200" />
                                ) : mStatus === 'failed' ? (
                                  <XCircle className="w-3 h-3 text-rose-300" />
                                ) : (
                                  <Check className="w-3 h-3 text-emerald-200" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Quick Message Actions */}
                          <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
                            <button onClick={() => handleCopyText(mBody)} className="p-1 text-slate-600 hover:text-emerald-600" title="Copy text">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Drawer Popover */}
              {showAttachmentMenu && (
                <div className="absolute bottom-16 left-4 bg-white border border-slate-200 rounded-2xl p-2 shadow-lg flex flex-col gap-1 z-20 w-48 text-xs">
                  <button
                    onClick={() => {
                      setMediaType('image');
                      setShowMediaModal(true);
                      setShowAttachmentMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-medium"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-600" /> Send Image
                  </button>
                  <button
                    onClick={() => {
                      setMediaType('document');
                      setShowMediaModal(true);
                      setShowAttachmentMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-medium"
                  >
                    <FileIcon className="w-4 h-4 text-sky-600" /> Send PDF / Document
                  </button>
                  <button
                    onClick={() => {
                      setShowLocationModal(true);
                      setShowAttachmentMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-medium"
                  >
                    <MapPin className="w-4 h-4 text-rose-600" /> Send Location
                  </button>
                  <button
                    onClick={() => {
                      setShowContactModal(true);
                      setShowAttachmentMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded-xl text-slate-700 font-medium"
                  >
                    <ContactIcon className="w-4 h-4 text-amber-600" /> Send Contact Card
                  </button>
                </div>
              )}

              {/* Reply Input Bar */}
              <form onSubmit={(e) => handleSendMessage(e, 'text')} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type WhatsApp message..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                />

                <Button type="submit" loading={sendingMsg} icon={Send} size="sm">
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
              <MessageCircle className="w-10 h-10 text-slate-400 mb-2" />
              Select a conversation from the left to open live WhatsApp chat.
            </div>
          )}
        </div>

        {/* Section 7: Customer Profile Inspector (Right Sidebar) */}
        {selectedConversation && (
          <div className="w-72 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col flex-shrink-0 space-y-4 overflow-y-auto scrollbar-thin shadow-xs">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" /> Customer Profile
              </h4>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <p className="font-bold text-slate-900">{selectedConversation.customerName}</p>
                <p className="text-slate-600 flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" /> {selectedConversation.waId || selectedConversation.customerPhone}
                </p>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div>
                    <span className="block font-bold text-slate-900">First Message</span>
                    {new Date(customerProfile?.firstMessageAt || selectedConversation.createdAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Last Seen</span>
                    {new Date(customerProfile?.lastSeen || selectedConversation.updatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Conversations</span>
                    {customerProfile?.conversationCount || 1}
                  </div>
                  <div>
                    <span className="block font-bold text-slate-900">Media Files</span>
                    {customerProfile?.mediaCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Internal Team Notes */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-600" /> Private Notes
              </h4>

              <form onSubmit={handleAddNote} className="mb-3">
                <textarea
                  rows={2}
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Add note for team agents..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 mb-1"
                />
                <Button type="submit" size="sm" variant="secondary" className="w-full">
                  Post Note
                </Button>
              </form>

              <div className="space-y-2 overflow-y-auto max-h-48 scrollbar-thin">
                {(selectedConversation.internalNotes || []).map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <p className="text-amber-900 font-medium">{note.text}</p>
                    <p className="text-[10px] text-amber-700 text-right font-medium">
                      {note.authorName} • {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Send Media Modal */}
      <Modal isOpen={showMediaModal} onClose={() => setShowMediaModal(false)} title={`Send ${mediaType.toUpperCase()} Attachment`}>
        <form onSubmit={handleSendMedia} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Media Direct URL *</label>
            <input
              type="url"
              required
              value={mediaUrlInput}
              onChange={(e) => setMediaUrlInput(e.target.value)}
              placeholder="https://example.com/file.png"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">Caption (Optional)</label>
            <input
              type="text"
              value={mediaCaptionInput}
              onChange={(e) => setMediaCaptionInput(e.target.value)}
              placeholder="Check this out!"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowMediaModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={sendingMsg}>
              Send Media
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Location Modal */}
      <Modal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} title="Send Location Pin">
        <form onSubmit={handleSendLocation} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Location Name</label>
            <input
              type="text"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Headquarters"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Latitude</label>
              <input
                type="text"
                value={locLat}
                onChange={(e) => setLocLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Longitude</label>
              <input
                type="text"
                value={locLng}
                onChange={(e) => setLocLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowLocationModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={sendingMsg}>
              Send Location Pin
            </Button>
          </div>
        </form>
      </Modal>

      {/* Send Contact Card Modal */}
      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Send Contact Card">
        <form onSubmit={handleSendContactCard} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Contact Name *</label>
            <input
              type="text"
              required
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Sarah Connor"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              placeholder="+1 555 019 2834"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowContactModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={sendingMsg}>
              Send Contact Card
            </Button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
