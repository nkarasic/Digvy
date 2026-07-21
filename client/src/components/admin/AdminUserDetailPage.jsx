import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mail, Package, ClipboardList, CheckCircle2, XCircle, Send, Eye, KeyRound, Bell, BellOff, Ban, ShieldCheck, Trash2 } from 'lucide-react';
import TopBar from '../layout/TopBar.jsx';
import PageShell from '../layout/PageShell.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import Modal from '../common/Modal.jsx';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAdminRole } from './AdminGate.jsx';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
const money = (v) => (v != null ? `$${Number(v).toFixed(2)}` : '');

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 text-right break-all">{value}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();
  const { user: authUser } = useAuth();
  const role = useAdminRole();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState(null);
  const [logs, setLogs] = useState(null);
  const [tab, setTab] = useState('items');
  const [busy, setBusy] = useState(null); // which action is running
  const [preview, setPreview] = useState(null); // dry-run digest result
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const isSelf = authUser?.id === id;
  const suspended = user?.banned_until && new Date(user.banned_until) > new Date();

  const loadUser = () => api.admin.user(id).then(setUser).catch(() => setUser(false));

  useEffect(() => {
    loadUser();
    api.admin.userItems(id).then(setItems).catch(() => setItems(false));
    api.admin.userLogs(id).then(setLogs).catch(() => setLogs(false));
  }, [id]);

  const summarize = (r) => {
    if (r.errors.length) return { text: `Failed: ${r.errors[0].error}`, type: 'error' };
    if (r.sent.length) return { text: 'Digest sent', type: 'success' };
    return { text: `Not sent — ${r.skipped[0]?.reason || 'nothing to send'}`, type: 'error' };
  };

  const previewDigest = async () => {
    setBusy('preview');
    try {
      setPreview(await api.admin.resendDigest(id, true));
    } catch (e) {
      showToast(e.message || 'Preview failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendDigest = async () => {
    setBusy('send');
    try {
      const { text, type } = summarize(await api.admin.resendDigest(id, false));
      showToast(text, type);
    } catch (e) {
      showToast(e.message || 'Send failed', 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleDigest = async () => {
    setBusy('toggle');
    try {
      const next = !user.digest_enabled;
      await api.admin.setUserDigest(id, next);
      showToast(next ? 'Digest enabled for user' : 'Digest disabled for user');
      await loadUser();
    } catch (e) {
      showToast(e.message || 'Could not update preference', 'error');
    } finally {
      setBusy(null);
    }
  };

  const sendReset = async () => {
    setBusy('reset');
    try {
      const { email } = await api.admin.sendPasswordReset(id);
      showToast(`Password-reset email sent to ${email}`);
    } catch (e) {
      showToast(e.message || 'Could not send reset', 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleSuspend = async () => {
    setBusy('suspend');
    try {
      await api.admin.suspendUser(id, !suspended);
      showToast(suspended ? 'User unsuspended' : 'User suspended');
      await loadUser();
    } catch (e) {
      showToast(e.message || 'Could not update suspension', 'error');
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setBusy('delete');
    try {
      await api.admin.deleteUser(id);
      showToast(`Deleted ${user.email}`);
      navigate('/admin', { replace: true });
    } catch (e) {
      showToast(e.message || 'Could not delete user', 'error');
      setBusy(null);
    }
  };

  return (
    <PageShell>
      <TopBar title="User" showBack />
      <div className="px-4 py-4 space-y-5">
        {user === null && <LoadingSpinner />}
        {user === false && <p className="text-sm text-red-600">Could not load this user.</p>}
        {user && (
          <>
            <Section title="Identity">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base font-semibold text-slate-900 break-all">{user.email}</span>
                  {user.role && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-900 text-white">
                      {user.role}
                    </span>
                  )}
                  {suspended && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                      suspended
                    </span>
                  )}
                </div>
                <Row label="Email confirmed" value={user.email_confirmed ? 'Yes' : 'No'} />
                <Row label="Signed up" value={fmtDate(user.created_at)} />
                <Row label="Last sign-in" value={fmtDate(user.last_sign_in_at)} />
                {user.banned_until && <Row label="Suspended until" value={fmtDate(user.banned_until)} />}
                <Row label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
              </div>
            </Section>

            <Section title="Email">
              <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">Daily digest</div>
                  <div className="text-xs text-slate-500">
                    {user.digest_enabled ? 'Enabled' : 'Disabled'}
                    {!user.has_prefs_row && ' (default — no preference set)'}
                  </div>
                </div>
                {user.digest_enabled ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <XCircle size={20} className="text-slate-400" />
                )}
              </div>
            </Section>

            <Section title="Actions">
              <div className="grid grid-cols-2 gap-2">
                <ActionButton icon={Eye} label="Preview digest" onClick={previewDigest} busy={busy === 'preview'} disabled={!!busy} />
                <ActionButton icon={Send} label="Send digest now" onClick={sendDigest} busy={busy === 'send'} disabled={!!busy} />
                <ActionButton
                  icon={user.digest_enabled ? BellOff : Bell}
                  label={user.digest_enabled ? 'Disable digest' : 'Enable digest'}
                  onClick={toggleDigest}
                  busy={busy === 'toggle'}
                  disabled={!!busy}
                />
                <ActionButton icon={KeyRound} label="Password reset" onClick={sendReset} busy={busy === 'reset'} disabled={!!busy} />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 px-1">
                Digest send respects the user's preference and only sends when items are due. Every action is recorded in the audit log.
              </p>
            </Section>

            <Section title="Activity">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                  <Package size={16} className="mx-auto text-violet-500 mb-1" />
                  <div className="text-lg font-semibold text-slate-900">{user.item_count}</div>
                  <div className="text-[10px] text-slate-500">items</div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                  <Package size={16} className="mx-auto text-emerald-500 mb-1" />
                  <div className="text-lg font-semibold text-slate-900">{user.active_item_count}</div>
                  <div className="text-[10px] text-slate-500">active</div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm text-center">
                  <ClipboardList size={16} className="mx-auto text-amber-500 mb-1" />
                  <div className="text-lg font-semibold text-slate-900">{user.log_count}</div>
                  <div className="text-[10px] text-slate-500">logs</div>
                </div>
              </div>
            </Section>

            <div>
              <div className="flex gap-2 mb-2">
                {['items', 'logs'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                      tab === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 shadow-sm'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {tab === 'items' && (
                <ReadList
                  data={items}
                  empty="No items."
                  render={(it) => (
                    <div key={it.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{it.name || '(unnamed)'}</span>
                        <span className="text-xs text-slate-400 shrink-0">{it.status}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {it.category || 'Uncategorized'}
                        {it.next_date && ` · next ${it.next_date}`}
                        {it.is_evergreen && ' · evergreen'}
                      </div>
                    </div>
                  )}
                />
              )}

              {tab === 'logs' && (
                <ReadList
                  data={logs}
                  empty="No logs."
                  render={(l) => (
                    <div key={l.id} className="bg-white rounded-xl p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{l.items?.name || '(item)'}</span>
                        <span className="text-xs text-slate-400 shrink-0">{l.date}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {money(l.price_paid)}
                        {l.note && ` · ${l.note}`}
                      </div>
                    </div>
                  )}
                />
              )}
            </div>

            {role === 'admin' && !isSelf && (
              <Section title="Danger zone">
                <div className="border border-red-200 rounded-xl p-3 space-y-2">
                  <button
                    onClick={toggleSuspend}
                    disabled={!!busy}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 active:bg-amber-100 disabled:opacity-50"
                  >
                    {suspended ? <ShieldCheck size={16} /> : <Ban size={16} />}
                    <span>{busy === 'suspend' ? 'Working…' : suspended ? 'Unsuspend user' : 'Suspend user'}</span>
                  </button>
                  <button
                    onClick={() => { setDeleteText(''); setConfirmDelete(true); }}
                    disabled={!!busy}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-700 bg-red-50 active:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    <span>Delete user &amp; all data</span>
                  </button>
                </div>
              </Section>
            )}
            {role === 'admin' && isSelf && (
              <p className="text-[11px] text-slate-400 px-1">
                Suspend and delete are hidden on your own account.
              </p>
            )}
          </>
        )}
      </div>

      <Modal open={confirmDelete} onClose={() => !busy && setConfirmDelete(false)} title="Delete user">
        {user && (
          <div>
            <p className="text-sm text-slate-600">
              This permanently deletes <span className="font-semibold text-slate-900">{user.email}</span> and
              all {user.item_count} items and {user.log_count} logs. This cannot be undone.
            </p>
            <label className="block text-xs text-slate-500 mt-4 mb-1">Type the email to confirm</label>
            <input
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={user.email}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={doDelete}
              disabled={deleteText !== user.email || busy === 'delete'}
              className="w-full mt-4 rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-red-600 active:bg-red-700 disabled:opacity-40"
            >
              {busy === 'delete' ? 'Deleting…' : 'Permanently delete'}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Digest preview">
        {preview && (
          preview.sent.length ? (
            <div>
              <div className="text-sm font-semibold text-slate-900 mb-2">{preview.sent[0].subject}</div>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3">
                {preview.sent[0].text}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nothing would be sent — {preview.skipped[0]?.reason || preview.errors[0]?.error || 'no due items'}.
            </p>
          )
        )}
      </Modal>
    </PageShell>
  );
}

function ActionButton({ icon: Icon, label, onClick, busy, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm text-sm font-medium text-slate-700 active:bg-slate-50 disabled:opacity-50"
    >
      <Icon size={16} className="text-slate-500 shrink-0" />
      <span className="truncate">{busy ? 'Working…' : label}</span>
    </button>
  );
}

function ReadList({ data, empty, render }) {
  if (data === null) return <LoadingSpinner />;
  if (data === false) return <p className="text-sm text-red-600">Could not load.</p>;
  if (data.length === 0) return <p className="text-sm text-slate-400 py-4 text-center">{empty}</p>;
  return <div className="space-y-2">{data.map(render)}</div>;
}
