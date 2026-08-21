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
  AlertTriangle,
  LayoutTemplate,
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

  // Approved Template Selector Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [approvedTemplates, setApprovedTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateVars, setTemplateVars] = useState({});
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const fetchApprovedTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.get('/templates?status=APPROVED');
      if (res.success && res.data) {
        setApprovedTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to load approved templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const openTemplateModal = () => {
    setShowTemplateModal(true);
    fetchApprovedTemplates();
  };

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    const vars = {};
    if (tpl?.bodyText) {
      const matches = Array.from(tpl.bodyText.matchAll(/\{\{(\d+)\}\}/g));
      if (matches && matches.length > 0) {
        const varIndices = Array.from(new Set(matches.map((m) => parseInt(m[1], 10)))).sort((a, b) => a - b);
        varIndices.forEach((idx) => {
          vars[idx] = '';
        });
      }
    }
    setTemplateVars(vars);
  };

  const handleSendTemplateMsg = async (e) => {
    if (e) e.preventDefault();
    if (!selectedConversation || !selectedTemplate) return;

    setSendingTemplate(true);
    const targetPhone = selectedConversation.waId || selectedConversation.customerPhone;

    try {
      const components = [];
      const varKeys = Object.keys(templateVars);
      if (varKeys.length > 0) {
        const bodyParams = varKeys.map((k) => ({
          type: 'text',
          text: templateVars[k] || '',
        }));
        components.push({
          type: 'body',
          parameters: bodyParams,
        });
      }

      const res = await api.post('/whatsapp/send', {
        to: targetPhone,
        conversationId: selectedConversation._id,
        type: 'template',
        templateName: selectedTemplate.name,
        languageCode: selectedTemplate.language || 'en_US',
        components,
      });

      if (res.success && res.data) {
        setShowTemplateModal(false);
        setSelectedTemplate(null);
        setTemplateVars({});
        loadThread(selectedConversation);
      }
    } catch (err) {
      alert(err.message || 'Failed to send WhatsApp template message');
    } finally {
      setSendingTemplate(false);
    }
  };

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const [hasNewUnreadBelow, setHasNewUnreadBelow] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [retryingMsgId, setRetryingMsgId] = useState(null);

  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages || !messages.length || !selectedConversation) return;
    const firstMsg = messages[0];
    if (!firstMsg || !firstMsg._id) return;

    setLoadingOlder(true);
    const container = messagesContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    try {
      const res = await api.get(`/inbox/conversations/${selectedConversation._id}?before=${firstMsg._id}`);
      if (res.success && res.data && res.data.messages) {
        const olderMsgs = res.data.messages;
        if (olderMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const uniqueOlder = olderMsgs.filter((m) => !existingIds.has(m._id));
            return [...uniqueOlder, ...prev];
          });
          setHasMoreMessages(res.data.hasMore || false);

          requestAnimationFrame(() => {
            if (container) {
              container.scrollTop = container.scrollHeight - oldScrollHeight;
            }
          });
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleContainerScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    isNearBottomRef.current = isAtBottom;
    if (isAtBottom) {
      setHasNewUnreadBelow(false);
    }

    if (el.scrollTop === 0 && hasMoreMessages && !loadingOlder) {
      loadOlderMessages();
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      setHasNewUnreadBelow(false);
      isNearBottomRef.current = true;
    }
  };

  const fetchConversations = async () => {
    try {
      const filterParam = statusFilter === 'unread' ? 'all' : statusFilter;
      const res = await api.get(`/inbox/conversations?status=${filterParam}&search=${search}`);
      if (res.success && res.data) {
        let list = res.data.conversations || res.data;
        if (statusFilter === 'unread') {
          list = list.filter((c) => c.unreadCount > 0);
        }
        setConversations(list);
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
        setHasMoreMessages(res.data.hasMore || false);
        setHasNewUnreadBelow(false);
        isNearBottomRef.current = true;
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsUnread = async () => {
    if (!selectedConversation) return;
    try {
      const res = await api.put(`/inbox/conversations/${selectedConversation._id}/unread`);
      if (res.success) {
        setSelectedConversation(null);
        fetchConversations();
      }
    } catch (err) {
      alert(err.message || 'Failed to mark conversation as unread');
    }
  };

  const handleRetryMessage = async (msgId) => {
    setRetryingMsgId(msgId);
    try {
      const res = await api.post('/whatsapp/retry', { messageId: msgId });
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msgId ? { ...m, ...res.data.message, status: 'sent', deliveryStatus: 'sent' } : m))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to retry message');
    } finally {
      setRetryingMsgId(null);
    }
  };

  const selectedConvRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    fetchConversations();
    fetchTeamAgents();

    // ── Real-time SSE Gateway Stream ─────────────────────────────────────────
    let eventSource;
    try {
      eventSource = new EventSource('/api/inbox/stream');
      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'NEW_MESSAGE') {
            fetchConversations();
            if (selectedConvRef.current?._id === data.conversationId) {
              setMessages((prev) => {
                const exists = prev.some((m) => m._id === data.message?._id || (m.wamid && m.wamid === data.message?.wamid));
                if (exists) return prev;
                return [...prev, data.message];
              });
              if (!isNearBottomRef.current) {
                setHasNewUnreadBelow(true);
              }
            }
          } else if (data.type === 'STATUS_UPDATE') {
            fetchConversations();
            if (selectedConvRef.current?._id === data.conversationId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === data.messageId || m.wamid === data.updatedMsg?.wamid || m.metaMessageId === data.updatedMsg?.metaMessageId
                    ? { ...m, ...data.updatedMsg, deliveryStatus: data.status, status: data.status }
                    : m
                )
              );
            }
          }
        } catch (err) {
          console.error('SSE Message Parse Error:', err);
        }
      };
    } catch (err) {
      console.error('SSE Connection Error:', err);
    }

    // ── Polling Fallback (5 seconds) ──────────────────────────────────────────
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConvRef.current?._id) {
        api.get(`/inbox/conversations/${selectedConvRef.current._id}`).then((res) => {
          if (res.success && res.data) {
            setMessages(res.data.messages);
          }
        });
      }
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [statusFilter, search]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom(true);
    }
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
                  onClick={() => setStatusFilter('unread')}
                  className={`px-2 py-0.5 rounded font-bold transition-colors ${
                    statusFilter === 'unread' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unread
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

                  <button
                    onClick={handleMarkAsUnread}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1 shadow-xs"
                    title="Mark conversation as unread"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Mark Unread
                  </button>

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
              <div
                ref={messagesContainerRef}
                onScroll={handleContainerScroll}
                className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/70 scrollbar-thin relative"
              >
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

                          {mType === 'video' && msg.mediaUrl && (
                            <div className="mb-2">
                              <video src={msg.mediaUrl} controls className="rounded-lg max-h-48 object-cover w-full" />
                            </div>
                          )}

                          {mType === 'audio' && msg.mediaUrl && (
                            <div className="mb-2">
                              <audio src={msg.mediaUrl} controls className="w-full mt-1" />
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

                          <div className={`flex items-center justify-end gap-1.5 mt-1 text-[9px] ${isOutbound ? 'text-emerald-100' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isOutbound && (
                              <span className="flex items-center gap-1">
                                {mStatus === 'read' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" title="Read" />
                                ) : mStatus === 'delivered' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-200" title="Delivered" />
                                ) : mStatus === 'failed' ? (
                                  <span className="flex items-center gap-1">
                                    <span title={msg.errorDetails?.message || (typeof msg.errorDetails === 'string' ? msg.errorDetails : 'Delivery Failed')}>
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRetryMessage(msg._id)}
                                      disabled={retryingMsgId === msg._id}
                                      className="px-1.5 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-[9px] flex items-center gap-1 transition-colors shadow-xs"
                                      title="Retry sending failed message"
                                    >
                                      <RotateCcw className={`w-2.5 h-2.5 ${retryingMsgId === msg._id ? 'animate-spin' : ''}`} />
                                      Retry
                                    </button>
                                  </span>
                                ) : mStatus === 'sent' ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-200" title="Sent" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-emerald-200 animate-spin" title="Sending..." />
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

              {/* Floating New Messages Indicator Button */}
              {hasNewUnreadBelow && (
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-20 right-6 z-20 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full shadow-lg transition-all flex items-center gap-1.5 animate-bounce cursor-pointer"
                >
                  👇 New messages below
                </button>
              )}

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

              {/* 24-Hour Customer Service Window Protection Warning Banner */}
              {(() => {
                const lastInboundTime =
                  selectedConversation?.lastCustomerMessageAt ||
                  messages.filter((m) => m.direction === 'inbound' || m.senderType === 'customer' || m.sender?.type === 'customer').slice(-1)[0]?.createdAt ||
                  messages.filter((m) => m.direction === 'inbound' || m.senderType === 'customer' || m.sender?.type === 'customer').slice(-1)[0]?.timestamp;

                const is24hExpired = selectedConversation
                  ? !lastInboundTime || Date.now() - new Date(lastInboundTime).getTime() > 24 * 60 * 60 * 1000
                  : false;

                return (
                  <>
                    {is24hExpired && (
                      <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3 z-10">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-amber-900">24-Hour Customer Service Window Expired</p>
                            <p className="text-[11px] text-amber-700">
                              Meta policy blocks freeform replies. Send an Approved Meta Template to re-engage this customer.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={openTemplateModal}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-xs transition-colors flex items-center gap-1.5 text-xs flex-shrink-0"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" /> Send Template
                        </button>
                      </div>
                    )}

                    {/* Reply Input Bar */}
                    <form onSubmit={(e) => handleSendMessage(e, 'text')} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                      <button
                        type="button"
                        disabled={is24hExpired}
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        disabled={is24hExpired}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={is24hExpired ? "24h window expired. Use 'Send Template' button..." : "Type WhatsApp message..."}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      />

                      {is24hExpired ? (
                        <button
                          type="button"
                          onClick={openTemplateModal}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" /> Template
                        </button>
                      ) : (
                        <Button type="submit" loading={sendingMsg} icon={Send} size="sm">
                          Send
                        </Button>
                      )}
                    </form>
                  </>
                );
              })()}
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

      {/* Send Approved WhatsApp Template Modal */}
      {showTemplateModal && (
        <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title="Send Approved WhatsApp Template">
          <div className="space-y-4 text-xs">
            {loadingTemplates ? (
              <div className="p-6 text-center text-slate-400">Loading approved templates...</div>
            ) : approvedTemplates.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
                No approved WhatsApp templates found. Create & sync templates under Dashboard → Templates.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Select Approved Template *</label>
                  <select
                    value={selectedTemplate?._id || ''}
                    onChange={(e) => {
                      const found = approvedTemplates.find((t) => t._id === e.target.value);
                      if (found) handleSelectTemplate(found);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Choose Approved Template --</option>
                    {approvedTemplates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.category} - {t.language})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Template Name</p>
                      <p className="font-mono font-bold text-emerald-400">{selectedTemplate.name}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Message Body</p>
                      <div className="p-2.5 bg-slate-950 text-slate-200 rounded-lg text-xs leading-relaxed font-normal whitespace-pre-wrap mt-1 border border-slate-800">
                        {selectedTemplate.bodyText || '[No Body Text]'}
                      </div>
                    </div>

                    {Object.keys(templateVars).length > 0 && (
                      <div className="space-y-2 border-t border-slate-800 pt-2">
                        <p className="text-[11px] font-bold text-slate-300">Template Variable Values:</p>
                        {Object.keys(templateVars).map((varIdx) => (
                          <div key={varIdx} className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-emerald-400 w-12">{'{{' + varIdx + '}}'}:</span>
                            <input
                              type="text"
                              value={templateVars[varIdx]}
                              onChange={(e) => setTemplateVars({ ...templateVars, [varIdx]: e.target.value })}
                              placeholder={`Value for {{${varIdx}}}`}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <Button variant="secondary" type="button" onClick={() => setShowTemplateModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!selectedTemplate || sendingTemplate}
                    loading={sendingTemplate}
                    onClick={handleSendTemplateMsg}
                    icon={Send}
                  >
                    Send Template Message
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
