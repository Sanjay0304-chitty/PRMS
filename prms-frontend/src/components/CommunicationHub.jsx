import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { communicationApi } from '../api';
import { bookingApi } from '../api/booking';
import { userApi } from '../api/user';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import {
  Send,
  MessageCircle,
  MessagesSquare,
  ChevronLeft,
  SquarePen,
  Pencil,
  Trash2,
} from 'lucide-react';
import './CommunicationHub.css';

// Matches the backend's EDIT_WINDOW_MS - messages can only be edited or
// unsent within 2 minutes of being sent.
const EDIT_WINDOW_MS = 2 * 60 * 1000;

function CommunicationHub() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [confirmUnsendId, setConfirmUnsendId] = useState(null);
  const [actionError, setActionError] = useState('');
  // Ticks once a second while a thread is open so the edit/unsend actions
  // disappear live once a message crosses the 2-minute window, instead of
  // only updating on the next 5s poll.
  const [nowTick, setNowTick] = useState(() => Date.now());
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Silent refresh of the conversation list itself - without this, a new
  // incoming message (or a brand-new conversation) only ever showed up
  // after a manual page reload, since loadConversations() above only ran
  // once on mount. loadConversations() doesn't touch `loading`, so this
  // never flashes the full-page loading state on later polls. Sorting by
  // lastAt already existed in loadConversations, so re-running it on a
  // timer is also what makes the most recent message float to the top.
  useEffect(() => {
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setEditingId(null);
    setConfirmUnsendId(null);
    setActionError('');
    if (selectedConv?.id) {
      loadMessages();
    } else if (selectedConv) {
      // Freshly-started conversation - nothing sent yet, nothing to fetch.
      setMessages([]);
    }
  }, [selectedConv]);

  // Poll while a thread is open so "Sent" flips to "Seen" once the other
  // side actually reads it, without needing a websocket.
  useEffect(() => {
    if (!selectedConv?.id) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  // Drives the 2-minute edit/unsend cutoff live instead of only on the
  // next 5s message poll.
  useEffect(() => {
    if (!selectedConv?.id) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  async function openCompose() {
    setComposing(true);
    setContactsLoading(true);
    try {
      const role = (user?.role || '').toLowerCase();
      const map = {};
      if (role === 'landlord') {
        const { data } = await bookingApi.landlordBookings();
        const items = data?.data || data || [];
        items.forEach((b) => {
          if (b.userId && b.userId !== user?.id && !map[b.userId]) {
            map[b.userId] = { id: b.userId, name: b.user?.full_name || 'Tenant' };
          }
        });
      } else if (role === 'tenant') {
        const { data } = await bookingApi.myBookings();
        const items = data?.data || data || [];
        items.forEach((b) => {
          const ownerId = b.property?.ownerId;
          if (ownerId && !map[ownerId]) {
            map[ownerId] = { id: ownerId, name: `Landlord — ${b.property?.title || 'Property'}` };
          }
        });
      } else if (role === 'agent') {
        const { data } = await bookingApi.assigned();
        const items = data?.data || data || [];
        items.forEach((b) => {
          if (b.userId && b.userId !== user?.id && !map[b.userId]) {
            map[b.userId] = { id: b.userId, name: b.user?.full_name || 'Tenant' };
          }
          const ownerId = b.property?.ownerId;
          if (ownerId && ownerId !== user?.id && !map[ownerId]) {
            map[ownerId] = { id: ownerId, name: `Landlord — ${b.property?.title || 'Property'}` };
          }
        });
      } else if (role === 'admin') {
        // Admin can message anyone in the system, not just people tied to a booking.
        const { data } = await userApi.list({ limit: 100 });
        const items = data?.data || data || [];
        items.forEach((u) => {
          if (u.id && u.id !== user?.id && !map[u.id]) {
            const userRole = u.UserRole?.[0]?.role?.name || u.role || 'User';
            map[u.id] = { id: u.id, name: `${u.full_name || 'User'} (${userRole})` };
          }
        });
      }
      setContacts(Object.values(map));
    } catch (e) {
      console.error(e);
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }

  function startConversation(contact) {
    setComposing(false);
    setSelectedConv({ id: null, partner: { id: contact.id, full_name: contact.name } });
  }

  // Arrives from "Message Owner" on a property page (or any other caller
  // that wants to deep-link straight into a thread) via navigate(..., {
  // state: { startConversationWith } }). Consumed once, then cleared from
  // history so it doesn't re-fire on a later back/forward navigation.
  useEffect(() => {
    const target = location.state?.startConversationWith;
    if (target?.id) {
      startConversation(target);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await communicationApi.list();
      const msgs = res.data?.data ?? [];
      // Group by conversationId
      const convMap = {};
      msgs.forEach((m) => {
        const cid = m.conversationId;
        const isMine = m.senderId === user?.id;
        const isUnreadForMe = !m.isRead && m.receiverId === user?.id;
        if (!convMap[cid]) {
          const other = isMine ? m.receiver : m.sender;
          convMap[cid] = {
            id: cid,
            partner: other || { full_name: 'User' },
            lastMessage: m.deleted ? 'This message was unsent' : m.content,
            lastAt: m.created_at,
            unread: isUnreadForMe ? 1 : 0,
          };
        } else {
          if (isUnreadForMe) {
            convMap[cid].unread += 1;
          }
        }
      });
      setConversations(Object.values(convMap).sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    try {
      const res = await communicationApi.getMessages(selectedConv.id);
      setMessages(res.data?.data ?? []);
      // Mark as read only the messages sent TO me - marking messages I sent
      // myself would flip them to "read" the instant I load my own thread,
      // before the other side has actually seen them.
      const unread = (res.data?.data ?? []).filter((m) => !m.isRead && m.receiverId === user?.id);
      await Promise.all(
        unread.map((m) => communicationApi.markMessageRead(m.id))
      );
      // Update unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConv.id ? { ...c, unread: 0 } : c))
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedConv) return;
    const isNewConversation = !selectedConv.id;
    try {
      await communicationApi.send({
        content: newMessage,
        // Omit conversationId for a brand-new thread - the backend derives
        // a deterministic `conv-<senderId>-<receiverId>` id when none is
        // sent, so reusing it later just means passing selectedConv.id.
        ...(isNewConversation ? {} : { conversationId: selectedConv.id }),
        receiverId: selectedConv.partner.id,
      });
      setNewMessage('');
      if (isNewConversation) {
        await loadConversations();
        setSelectedConv((prev) => ({ ...prev, id: `conv-${user?.id}-${prev.partner.id}` }));
      } else {
        loadMessages();
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function canModify(msg) {
    return msg.senderId === user?.id && !msg.deleted && (nowTick - new Date(msg.created_at).getTime()) < EDIT_WINDOW_MS;
  }

  function startEdit(msg) {
    setConfirmUnsendId(null);
    setActionError('');
    setEditingId(msg.id);
    setEditText(msg.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(msg) {
    if (!editText.trim()) return;
    try {
      await communicationApi.editMessage(msg.id, editText.trim());
      setEditingId(null);
      setEditText('');
      loadMessages();
    } catch (e) {
      setActionError(e.response?.data?.error?.message || 'Failed to edit message.');
    }
  }

  async function confirmUnsend(msg) {
    try {
      await communicationApi.unsendMessage(msg.id);
      setConfirmUnsendId(null);
      loadMessages();
    } catch (e) {
      setActionError(e.response?.data?.error?.message || 'Failed to unsend message.');
      setConfirmUnsendId(null);
    }
  }

  if (loading) return <div className="comm-loading">Loading messages...</div>;

  return (
    <div className={`communication-hub ${selectedConv ? 'has-selected' : ''}`}>
      {/* Conversation list — always visible on wide screens, hidden behind
          the thread on narrow ones once something is selected. */}
      <aside className="comm-sidebar">
        <div className="comm-sidebar-header">
          <h2 className="comm-title">Messages</h2>
          <button type="button" className="comm-new-btn" onClick={openCompose}>
            <SquarePen size={16} /> New
          </button>
        </div>

        <div className="comm-list">
          {conversations.length === 0 ? (
            <div className="comm-empty">
              <MessageCircle size={32} className="comm-empty-icon" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <motion.div
                key={conv.id}
                className={`comm-list-item ${selectedConv?.id === conv.id ? 'active' : ''}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="comm-avatar">{conv.partner?.full_name?.[0]?.toUpperCase() || '?'}</div>
                <div className="comm-list-content">
                  <div className="comm-list-header">
                    <span className="comm-list-name">{conv.partner?.full_name || 'User'}</span>
                    <span className="comm-list-time">{new Date(conv.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="comm-list-preview">{conv.lastMessage}</div>
                </div>
                {conv.unread > 0 && (
                  <span className="comm-unread-badge">{conv.unread}</span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <main className="comm-main">
        {selectedConv ? (
          <div className="comm-thread">
            <div className="comm-thread-header">
              <button className="comm-back-btn" onClick={() => setSelectedConv(null)}>
                <ChevronLeft size={18} />
              </button>
              <div className="comm-thread-avatar">{selectedConv.partner?.full_name?.[0]?.toUpperCase() || '?'}</div>
              <span className="comm-thread-name">{selectedConv.partner?.full_name || 'User'}</span>
            </div>

            <div className="comm-messages">
              {actionError && (
                <div className="comm-action-error">
                  {actionError}
                  <button type="button" onClick={() => setActionError('')}>✕</button>
                </div>
              )}
              <AnimatePresence>
                {messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const isEditing = editingId === msg.id;
                  const modifiable = isMe && canModify(msg);
                  return (
                    <motion.div
                      key={msg.id}
                      className={`comm-msg-bubble ${isMe ? 'comm-msg-mine' : 'comm-msg-theirs'}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {isEditing ? (
                        <div className="comm-msg-edit">
                          <input
                            type="text"
                            className="comm-msg-edit-input"
                            value={editText}
                            autoFocus
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit(msg);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <div className="comm-msg-edit-actions">
                            <button type="button" onClick={() => saveEdit(msg)}>Save</button>
                            <button type="button" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="comm-msg-text">
                          {msg.deleted ? <em>This message was unsent</em> : msg.content}
                        </div>
                      )}

                      <div className="comm-msg-time">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.edited && !msg.deleted && ' · Edited'}
                        {isMe && (
                          <span className={`comm-msg-status ${msg.isRead ? 'seen' : ''}`}>
                            {msg.isRead ? ' · Seen' : ' · Sent'}
                          </span>
                        )}
                      </div>

                      {modifiable && !isEditing && (
                        <div className="comm-msg-actions">
                          {confirmUnsendId === msg.id ? (
                            <>
                              <span>Unsend this message?</span>
                              <button type="button" onClick={() => confirmUnsend(msg)}>Yes</button>
                              <button type="button" onClick={() => setConfirmUnsendId(null)}>No</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(msg)} title="Edit"><Pencil size={12} /> Edit</button>
                              <button type="button" onClick={() => setConfirmUnsendId(msg.id)} title="Unsend"><Trash2 size={12} /> Unsend</button>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="comm-input-row">
              <input
                type="text"
                className="comm-input"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="comm-send-btn" onClick={handleSend}>
                <Send size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="comm-main-empty">
            <MessagesSquare size={44} />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </main>

      {/* New Message — small popup window instead of taking over the list */}
      <Modal isOpen={composing} onOpenChange={(open) => !open && setComposing(false)} title="New Message">
        {contactsLoading ? (
          <p className="comm-compose-hint">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="comm-compose-hint">
            {(user?.role || '').toLowerCase() === 'admin'
              ? 'No other users in the system yet.'
              : 'No contacts yet — messaging unlocks once you have a booking together.'}
          </p>
        ) : (
          <div className="comm-contact-list">
            {contacts.map((c) => (
              <div key={c.id} className="comm-list-item" onClick={() => startConversation(c)}>
                <div className="comm-avatar">{c.name?.[0]?.toUpperCase() || '?'}</div>
                <div className="comm-list-content">
                  <div className="comm-list-header">
                    <span className="comm-list-name">{c.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CommunicationHub;
