'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AvatarBubble } from '@/components/AvatarBubble';
import { AideLabel } from '@/components/AideTip';
import { AIDES } from '@/lib/aides';
import {
  formatDaySeparator,
  formatThreadTime,
  loadMsgPrefs,
  prenom,
  saveMsgPrefs,
  sameDay,
  toggleInList,
  type MsgPrefs,
} from '@/lib/messages-prefs';

const BUREAU_IDS = new Set(['audrey', 'melissa', 'valerie', 'denis', 'philippe']);
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

/** Couleurs de prénom type WhatsApp (groupes). */
const AUTHOR_COLORS = [
  '#06CF9C',
  '#E56B6F',
  '#53BDEB',
  '#D452E8',
  '#FFBC38',
  '#02A698',
  '#FF7A6B',
  '#6B7CFF',
];

function authorColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AUTHOR_COLORS[h % AUTHOR_COLORS.length]!;
}

function parseReplyQuote(texte: string | null): {
  quoteAuthor: string;
  quoteText: string;
  body: string;
} | null {
  if (!texte) return null;
  const m = texte.match(/^↪\s*(.+?)\s*:\s*(.+?)\n([\s\S]*)$/);
  if (!m) return null;
  return {
    quoteAuthor: m[1]!.trim(),
    quoteText: m[2]!.trim(),
    body: m[3] ?? '',
  };
}

type ConvKind = 'gen' | 'user' | 'cha' | 'ext';
type LastKind = 'text' | 'photo' | 'doc' | 'action' | 'empty';
type ListFilter = 'tous' | 'directs' | 'nonlus';

type Conv = {
  id: string;
  kind?: ConvKind;
  affaireId?: string | null;
  titre: string;
  sousTitre: string;
  avatar: string;
  photo?: string | null;
  cls: string;
  pinNote?: string;
  last: string;
  lastKind?: LastKind;
  lastAuthor?: string | null;
  lastAt?: string | null;
};

type Msg = {
  id: string;
  texte: string | null;
  photoLabel: string | null;
  fichier?: string | null;
  systeme: boolean;
  interne?: boolean;
  createdAt: string;
  auteurId: string;
  auteur: {
    nom: string;
    initiales: string;
    societe?: string;
    fonction?: string;
    acces?: string;
  };
};

type MentionUser = { id: string; nom: string; initiales: string };

export function MessagesView({
  convs: initialConvs,
  initialThread,
  meId,
  meAvatar,
  meNom,
  canAdd,
  mentionUsers,
  isExterne = false,
}: {
  convs: Conv[];
  initialThread: string | null;
  meId: string;
  meAvatar: string;
  meNom: string;
  canAdd: boolean;
  mentionUsers: MentionUser[];
  isExterne?: boolean;
}) {
  const [convs, setConvs] = useState(initialConvs);
  const [conv, setConv] = useState<string | null>(initialThread);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pinNote, setPinNote] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [listFilter, setListFilter] = useState<ListFilter>('tous');
  const [prefs, setPrefs] = useState<MsgPrefs>(() => loadMsgPrefs());
  const [mobileThread, setMobileThread] = useState(!!initialThread);
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [composeQ, setComposeQ] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeErr, setComposeErr] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ctxMsg, setCtxMsg] = useState<Msg | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [reactPicker, setReactPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    auteur: string;
    texte: string;
  } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardIds, setForwardIds] = useState<string[]>([]);
  const [forwardBusy, setForwardBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [actionModal, setActionModal] = useState<Msg | null>(null);
  const [hasExternes, setHasExternes] = useState(false);
  const [externes, setExternes] = useState<
    { id: string; nom: string; societe: string; fonction: string; initiales: string }[]
  >([]);
  const [pendingInvites, setPendingInvites] = useState<
    { id: string; email: string; nom: string; societe: string; expiresAt: string }[]
  >([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    nom: '',
    societe: '',
    fonction: '',
    message: '',
    historyMode: 'from_now',
    accessDuration: 'months_6',
  });
  const [inviteLink, setInviteLink] = useState('');
  const [interneMode, setInterneMode] = useState(false);
  const [extReminderAck, setExtReminderAck] = useState(false);
  const [actionTitre, setActionTitre] = useState('');
  const [actionResp, setActionResp] = useState(meId);
  const [actionEcheance, setActionEcheance] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [actionBusy, setActionBusy] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQ, setMentionQ] = useState('');

  const streamRef = useRef<HTMLDivElement>(null);
  const pjRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const c = conv ? (convs.find((x) => x.id === conv) ?? null) : null;

  const persist = useCallback((next: MsgPrefs) => {
    setPrefs(next);
    saveMsgPrefs(next);
  }, []);

  function canDeleteConv(id: string) {
    const c0 = convs.find((x) => x.id === id);
    if (c0?.kind === 'gen') return false;
    return canAdd && id !== 'gen' && id !== meId && !BUREAU_IDS.has(id);
  }

  const totalUnread = useMemo(() => {
    return convs.reduce((n, x) => {
      if (prefs.muted.includes(x.id) || prefs.archived.includes(x.id)) return n;
      const lr = prefs.lastRead[x.id];
      if (!x.lastAt) return n;
      if (!lr || new Date(x.lastAt) > new Date(lr)) return n + 1;
      return n;
    }, 0);
  }, [convs, prefs]);

  function unreadCount(x: Conv): number {
    if (prefs.muted.includes(x.id)) return 0;
    const lr = prefs.lastRead[x.id];
    if (!x.lastAt) return 0;
    if (!lr || new Date(x.lastAt) > new Date(lr)) return 1;
    return 0;
  }

  const filtered = useMemo(() => {
    // Messagerie interne seulement (pas les fils chantier de la fiche affaire)
    let list = convs.filter(
      (x) =>
        x.kind === 'gen' ||
        x.kind === 'user' ||
        x.kind === 'cha' ||
        x.kind === 'ext' ||
        !x.kind,
    );
    list = list.filter((x) => !prefs.archived.includes(x.id));

    if (listFilter === 'directs') list = list.filter((x) => x.kind === 'user');
    if (listFilter === 'nonlus') list = list.filter((x) => unreadCount(x) > 0);

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (x) =>
          x.titre.toLowerCase().includes(s) ||
          x.sousTitre.toLowerCase().includes(s) ||
          x.avatar.toLowerCase().includes(s) ||
          x.last.toLowerCase().includes(s),
      );
    }

    list.sort((a, b) => {
      const pa = prefs.pinned.includes(a.id) ? 1 : 0;
      const pb = prefs.pinned.includes(b.id) ? 1 : 0;
      if (pa !== pb) return pb - pa;
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convs, q, listFilter, prefs]);

  const mentionHits = useMemo(() => {
    if (!mentionOpen) return [];
    const s = mentionQ.toLowerCase();
    return mentionUsers
      .filter((u) => u.id !== meId)
      .filter(
        (u) =>
          !s ||
          u.nom.toLowerCase().includes(s) ||
          u.initiales.toLowerCase().includes(s),
      )
      .slice(0, 6);
  }, [mentionOpen, mentionQ, mentionUsers, meId]);

  async function load(id: string) {
    const c0 = convs.find((x) => x.id === id);
    const qs = new URLSearchParams({ thread: id });
    if (c0?.affaireId) qs.set('affaireId', c0.affaireId);
    const r = await fetch(`/api/messages?${qs}`);
    if (!r.ok) return;
    const j = await r.json();
    setMsgs(j.messages);
    setHasExternes(!!j.hasExternes);
    setExternes(j.externes ?? []);
    setPendingInvites(j.pendingInvites ?? []);
    const localPin = loadMsgPrefs().msgPins[id];
    setPinNote(localPin || j.pin || '');
    setPrefs((prev) => {
      const next = {
        ...prev,
        lastRead: { ...prev.lastRead, [id]: new Date().toISOString() },
      };
      saveMsgPrefs(next);
      return next;
    });
  }

  useEffect(() => {
    setConvs(initialConvs);
  }, [initialConvs]);

  useEffect(() => {
    setConv(initialThread);
    if (initialThread) setMobileThread(true);
  }, [initialThread]);

  useEffect(() => {
    if (!conv) {
      setMsgs([]);
      return;
    }
    void load(conv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [msgs]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = 5 * 24;
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [text]);

  function selectConv(id: string) {
    setConv(id);
    setMobileThread(true);
    closeMsgMenu();
    exitSelect();
    setReplyTo(null);
    router.replace(`/messages?thread=${encodeURIComponent(id)}`, { scroll: false });
  }

  function clearConv() {
    setConv(null);
    setMobileThread(false);
    closeMsgMenu();
    exitSelect();
    setReplyTo(null);
    router.replace('/messages', { scroll: false });
  }

  function previewLine(x: Conv): string {
    const kind = x.lastKind ?? 'text';
    let body = x.last;
    if (kind === 'photo') body = `📷 ${x.last}`;
    else if (kind === 'doc') body = `📎 ${x.last}`;
    else if (kind === 'action') body = `✓ ${x.last}`;
    if (x.kind === 'gen' && x.lastAuthor && kind !== 'empty') {
      const p = prenom(x.lastAuthor);
      if (!body.startsWith(p)) return `${p} : ${body}`;
    }
    return body;
  }

  function bumpConv(id: string, preview: string, kind: LastKind = 'text') {
    const now = new Date().toISOString();
    setConvs((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              last: preview,
              lastKind: kind,
              lastAuthor: meNom,
              lastAt: now,
            }
          : x,
      ),
    );
  }

  async function send() {
    const v = text.trim();
    if (!v || !c) return;
    if (!isExterne && hasExternes && !interneMode && !extReminderAck) {
      const key = `ext-remind-${conv}`;
      if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
        const ok = window.confirm(
          'Ce que vous écrivez ici est lu à l’extérieur (participants externes). Continuer ?',
        );
        if (!ok) return;
        localStorage.setItem(key, '1');
        setExtReminderAck(true);
      } else {
        setExtReminderAck(true);
      }
    }
    const payload = replyTo
      ? `↪ ${replyTo.auteur} : ${replyTo.texte}\n${v}`
      : v;
    bumpConv(conv!, v, 'text');
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadKey: conv,
        affaireId: c.affaireId ?? null,
        texte: payload,
        interne: !isExterne && interneMode,
      }),
    });
    setText('');
    setReplyTo(null);
    setMentionOpen(false);
    await load(conv!);
    router.refresh();
  }

  async function sendFile(file: File) {
    if (!c || !conv) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (conv) fd.append('threadKey', conv);
      const up = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await up.json();
      if (!up.ok) {
        alert(j.error ?? 'Échec de l’envoi');
        return;
      }
      const isImg = /\.(jpe?g|png|webp|gif|heic)$/i.test(j.name ?? file.name);
      const label = j.name ?? file.name;
      bumpConv(conv, label, isImg ? 'photo' : 'doc');
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadKey: conv,
          affaireId: c.affaireId ?? null,
          photoLabel: j.name,
          fichier: j.url,
          texte: isImg ? text.trim() || null : text.trim() || `Pièce jointe : ${j.name}`,
        }),
      });
      setText('');
      await load(conv);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function onTextChange(v: string) {
    setText(v);
    const m = v.match(/@(\w*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQ(m[1] ?? '');
    } else {
      setMentionOpen(false);
      setMentionQ('');
    }
  }

  function insertMention(u: MentionUser) {
    const next = text.replace(/@(\w*)$/, `@${prenom(u.nom)} `);
    setText(next);
    setMentionOpen(false);
    taRef.current?.focus();
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  function openAction(m: Msg) {
    closeMsgMenu();
    setActionModal(m);
    setActionTitre((m.texte ?? '').slice(0, 120));
    setActionResp(meId);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setActionEcheance(d.toISOString().slice(0, 10));
  }

  function msgPreview(m: Msg): string {
    if (m.texte?.trim()) return m.texte.trim();
    if (m.photoLabel) return m.photoLabel;
    if (m.fichier) return 'Pièce jointe';
    return 'Message';
  }

  function showToast(t: string) {
    setToast(t);
    window.setTimeout(() => setToast(''), 2200);
  }

  function closeMsgMenu() {
    setCtxMsg(null);
    setMenuPos(null);
    setReactPicker(false);
  }

  function openMsgMenu(m: Msg, e?: { clientX: number; clientY: number }) {
    if (selectMode) {
      toggleSelect(m.id);
      return;
    }
    setReactPicker(false);
    setCtxMsg(m);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 260;
    const h = 420;
    let left = e?.clientX ?? vw / 2 - w / 2;
    let top = e?.clientY ?? vh / 2 - h / 2;
    left = Math.max(8, Math.min(left, vw - w - 8));
    top = Math.max(8, Math.min(top, vh - h - 8));
    setMenuPos({ top, left });
  }

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function startSelect(m?: Msg) {
    closeMsgMenu();
    setSelectMode(true);
    setSelected(m ? [m.id] : []);
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected([]);
  }

  function replyMessage(m: Msg) {
    closeMsgMenu();
    setReplyTo({
      id: m.id,
      auteur: m.auteurId === meId ? 'Vous' : m.auteur.nom,
      texte: msgPreview(m).slice(0, 120),
    });
    taRef.current?.focus();
  }

  function reactTo(m: Msg, emoji: string) {
    const next = { ...prefs.reactions };
    if (next[m.id] === emoji) delete next[m.id];
    else next[m.id] = emoji;
    persist({ ...prefs, reactions: next });
    closeMsgMenu();
  }

  function toggleImportant(m: Msg) {
    persist({ ...prefs, starred: toggleInList(prefs.starred, m.id) });
    closeMsgMenu();
    showToast(
      prefs.starred.includes(m.id)
        ? 'Retiré des importants'
        : 'Marqué comme important',
    );
  }

  function pinMessage(m: Msg) {
    if (!conv) return;
    const preview = msgPreview(m).slice(0, 160);
    const already = prefs.msgPins[conv];
    const nextPins = { ...prefs.msgPins };
    if (already === preview) {
      delete nextPins[conv];
      persist({ ...prefs, msgPins: nextPins });
      setPinNote('');
      showToast('Message désépinglé');
    } else {
      nextPins[conv] = preview;
      persist({ ...prefs, msgPins: nextPins });
      setPinNote(preview);
      showToast('Message épinglé');
    }
    closeMsgMenu();
  }

  async function copyMessage(m: Msg) {
    const t = msgPreview(m);
    try {
      await navigator.clipboard.writeText(t);
      showToast('Message copié');
    } catch {
      showToast('Copie impossible');
    }
    closeMsgMenu();
  }

  function reportMessage() {
    closeMsgMenu();
    showToast('Signalement enregistré (démo)');
  }

  function deleteMessage(m: Msg) {
    if (!confirm('Supprimer ce message pour vous ?')) return;
    persist({
      ...prefs,
      hiddenMsgs: prefs.hiddenMsgs.includes(m.id)
        ? prefs.hiddenMsgs
        : [...prefs.hiddenMsgs, m.id],
    });
    closeMsgMenu();
    showToast('Message supprimé pour vous');
  }

  function deleteSelected() {
    if (!selected.length) return;
    if (!confirm(`Supprimer ${selected.length} message(s) pour vous ?`)) return;
    const set = new Set([...prefs.hiddenMsgs, ...selected]);
    persist({ ...prefs, hiddenMsgs: [...set] });
    exitSelect();
    showToast('Messages supprimés pour vous');
  }

  async function copySelected() {
    const texts = msgs
      .filter((m) => selected.includes(m.id))
      .map((m) => msgPreview(m))
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(texts);
      showToast('Messages copiés');
    } catch {
      showToast('Copie impossible');
    }
  }

  function openForward(ids: string[]) {
    closeMsgMenu();
    setForwardIds(ids);
    setForwardOpen(true);
  }

  async function forwardTo(targetId: string) {
    const target = convs.find((x) => x.id === targetId);
    if (!target || !forwardIds.length) return;
    setForwardBusy(true);
    const toSend = msgs.filter((m) => forwardIds.includes(m.id));
    for (const m of toSend) {
      const body = `↪ Transféré\n${msgPreview(m)}`;
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadKey: targetId,
          affaireId: target.affaireId ?? null,
          texte: body,
        }),
      });
    }
    bumpConv(targetId, `↪ ${msgPreview(toSend[0]!)}`.slice(0, 80), 'text');
    setForwardBusy(false);
    setForwardOpen(false);
    setForwardIds([]);
    exitSelect();
    showToast('Message(s) transféré(s)');
    router.refresh();
  }

  async function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionModal || !conv || !actionTitre.trim()) return;
    setActionBusy(true);
    const r = await fetch('/api/taches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: actionTitre.trim().slice(0, 120),
        niveau: 2,
        threadKey: conv,
        affaireId: c?.affaireId ?? null,
        responsableId: actionResp,
        dateEcheance: actionEcheance,
        fromMessage: true,
      }),
    });
    setActionBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error ?? 'Impossible de créer l’action');
      return;
    }
    persist({
      ...prefs,
      actionMsgs: prefs.actionMsgs.includes(actionModal.id)
        ? prefs.actionMsgs
        : [...prefs.actionMsgs, actionModal.id],
    });
    setActionModal(null);
    await load(conv);
    router.refresh();
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!conv || !inviteForm.email.trim() || !inviteForm.nom.trim()) return;
    setInviteBusy(true);
    const r = await fetch('/api/messages/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadKey: conv, ...inviteForm }),
    });
    const j = await r.json().catch(() => ({}));
    setInviteBusy(false);
    if (!r.ok) {
      alert(j.error ?? 'Invitation impossible');
      return;
    }
    setInviteLink(j.invite?.link ?? '');
    showToast(
      j.invite?.mailSent
        ? 'Invitation envoyée par e-mail'
        : 'Lien créé — à transmettre manuellement',
    );
    await load(conv);
    router.refresh();
  }

  async function resendInvite(id: string) {
    const r = await fetch(`/api/messages/invites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend' }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      alert(j.error ?? 'Renvoi impossible');
      return;
    }
    if (j.link) {
      try {
        await navigator.clipboard.writeText(j.link);
        showToast('Nouveau lien copié');
      } catch {
        setInviteLink(j.link);
        showToast('Lien renouvelé');
      }
    }
  }

  async function cancelInvite(id: string) {
    if (!confirm('Annuler cette invitation ?')) return;
    await fetch(`/api/messages/invites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    });
    if (conv) await load(conv);
  }

  async function deleteCollaborateur(id: string, nom: string) {
    if (!canDeleteConv(id)) return;
    if (!confirm(`Retirer ${nom} de l’équipe ?`)) return;
    setDeleting(true);
    let r = await fetch('/api/collaborateurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (r.status === 405) {
      r = await fetch('/api/collaborateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
    }
    const j = await r.json().catch(() => ({}));
    setDeleting(false);
    if (!r.ok) {
      alert(j.error ?? 'Suppression impossible');
      return;
    }
    setConvs((prev) => prev.filter((x) => x.id !== id));
    if (conv === id) clearConv();
    router.refresh();
  }

  const composeRecipients = useMemo(() => {
    const s = composeQ.trim().toLowerCase();
    let list = convs.filter(
      (x) =>
        (x.kind === 'gen' || x.kind === 'user' || !x.kind) &&
        !prefs.archived.includes(x.id),
    );
    if (s) {
      list = list.filter(
        (x) =>
          x.titre.toLowerCase().includes(s) ||
          x.sousTitre.toLowerCase().includes(s) ||
          x.avatar.toLowerCase().includes(s),
      );
    }
    return list.sort((a, b) => {
      const order = (k?: ConvKind) => (k === 'gen' ? 0 : 1);
      const d = order(a.kind) - order(b.kind);
      if (d !== 0) return d;
      return a.titre.localeCompare(b.titre, 'fr');
    });
  }, [convs, composeQ, prefs.archived]);

  function openCompose() {
    setComposeErr('');
    setComposeText('');
    setComposeQ('');
    setComposeTo(null);
    setShowCompose(true);
  }

  function openComposeTo(id: string) {
    setComposeTo(id);
    setComposeErr('');
  }

  async function submitCompose(e: React.FormEvent) {
    e.preventDefault();
    const targetId = composeTo;
    const v = composeText.trim();
    if (!targetId) {
      setComposeErr('Choisissez un destinataire.');
      return;
    }
    if (!v) {
      setComposeErr('Écrivez un message.');
      return;
    }
    const target = convs.find((x) => x.id === targetId);
    if (!target) {
      setComposeErr('Discussion introuvable.');
      return;
    }
    setComposeBusy(true);
    setComposeErr('');
    const now = new Date().toISOString();
    setConvs((prev) =>
      prev.map((x) =>
        x.id === targetId
          ? {
              ...x,
              last: v,
              lastKind: 'text' as const,
              lastAuthor: meNom,
              lastAt: now,
            }
          : x,
      ),
    );
    const r = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadKey: targetId,
        affaireId: target.affaireId ?? null,
        texte: v,
      }),
    });
    setComposeBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setComposeErr(j.error ?? 'Envoi impossible');
      return;
    }
    setShowCompose(false);
    setComposeText('');
    setComposeTo(null);
    selectConv(targetId);
    await load(targetId);
    router.refresh();
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function openOnly(id: string) {
    setShowCompose(false);
    selectConv(id);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  return (
    <div className={`wa-page${mobileThread && conv ? ' wa-show-thread' : ''}`}>
      <div className="chat wa wa-desk">
        {/* Rail */}
        <nav className="wa-rail" aria-label="Messagerie">
          <button
            type="button"
            className="wa-rail-btn on"
            title="Messages"
            aria-label="Messages"
            onClick={() => setListFilter('tous')}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
              <path
                fill="currentColor"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"
              />
            </svg>
            {totalUnread > 0 ? (
              <span className="wa-rail-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
            ) : null}
          </button>
          <div className="wa-rail-spacer" />
          <div className="wa-rail-me" title={meNom}>
            <AvatarBubble label={meAvatar} size={40} cls="wa-av" />
          </div>
        </nav>

        {/* Liste */}
        <aside className="wa-sidebar" aria-label="Discussions">
          <header className="wa-side-head">
            <AideLabel aide={AIDES.msgListe} as="div">
              <h2>Messages</h2>
            </AideLabel>
            {!isExterne ? (
              <button
                type="button"
                className="wa-icon-btn"
                title="Nouveau message"
                aria-label="Nouveau message"
                onClick={openCompose}
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
                  />
                </svg>
              </button>
            ) : null}
          </header>

          <div className="wa-search">
            <span className="wa-search-ico" aria-hidden>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher une discussion"
            />
          </div>

          {!isExterne ? (
            <div className="wa-filters" role="tablist" aria-label="Filtres">
              {(
                [
                  ['tous', 'Tous'],
                  ['directs', 'Directs'],
                  ['nonlus', 'Non lus'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={listFilter === id}
                  className={listFilter === id ? 'on' : ''}
                  onClick={() => setListFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="wa-convs">
            {filtered.map((x) => {
              const unread = unreadCount(x);
              const muted = prefs.muted.includes(x.id);
              const pinned = prefs.pinned.includes(x.id);
              const selected = conv === x.id;
              return (
                <button
                  key={x.id}
                  type="button"
                  className={`wa-conv${selected ? ' on' : ''}${unread ? ' unread' : ''}`}
                  onClick={() => selectConv(x.id)}
                >
                  <AvatarBubble label={x.avatar} cls={`wa-av ${x.cls}`.trim()} size={48} />
                  <span className="wa-conv-body">
                    <span className="wa-conv-top">
                      <span className="wa-conv-name">
                        {pinned ? (
                          <span className="wa-pin-mini" aria-hidden title="Épinglé">
                            📌
                          </span>
                        ) : null}
                        {x.titre}
                      </span>
                      <span className={`wa-conv-time${unread ? ' hi' : ''}`}>
                        {formatThreadTime(x.lastAt)}
                      </span>
                    </span>
                    <span className="wa-conv-bottom">
                      <span className="wa-conv-last">{previewLine(x)}</span>
                      {muted ? (
                        <span className="wa-mute" title="Sourdine" aria-label="Sourdine">
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                            <path
                              fill="currentColor"
                              d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zM4.27 3 3 4.27 7.73 9H6v5l-2 2v1h11.73l3 3L20 18.73 4.27 3z"
                            />
                          </svg>
                        </span>
                      ) : unread ? (
                        <span className="wa-badge">{unread}</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {!filtered.length ? (
              <p className="wa-empty-list">Aucune discussion</p>
            ) : null}
          </div>
        </aside>

        {/* Conversation */}
        <section className="wa-main" aria-label="Conversation">
          {c && conv ? (
            <>
              <header className="wa-chat-head">
                <button
                  type="button"
                  className="wa-back"
                  aria-label="Retour aux discussions"
                  onClick={clearConv}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                    />
                  </svg>
                </button>
                <AvatarBubble label={c.avatar} cls={`wa-av ${c.cls}`.trim()} size={40} />
                <div className="wa-chat-head-txt">
                  <h3>{c.titre}</h3>
                  <p>
                    {c.kind === 'user' || c.kind === 'ext'
                      ? `Discussion avec ${c.titre}`
                      : c.sousTitre}
                  </p>
                </div>
                <div className="wa-head-actions">
                  {!isExterne ? (
                    <button
                      type="button"
                      className="wa-head-action"
                      onClick={() => {
                        setInviteLink('');
                        setInviteOpen(true);
                      }}
                    >
                      Inviter un externe
                    </button>
                  ) : null}
                  {canDeleteConv(c.id) ? (
                    <button
                      type="button"
                      className="wa-head-action"
                      disabled={deleting}
                      onClick={() => void deleteCollaborateur(c.id, c.titre)}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              </header>

              {hasExternes || pendingInvites.length ? (
                <div className="wa-ext-banner" role="status">
                  <strong>Discussion ouverte à des participants externes</strong>
                  {externes.length ? (
                    <span>
                      {externes
                        .map((e) => e.societe || e.nom)
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  ) : (
                    <span>Invitation en cours</span>
                  )}
                </div>
              ) : null}

              {!isExterne && pendingInvites.length ? (
                <div className="wa-ext-pending">
                  {pendingInvites.map((p) => (
                    <div key={p.id} className="wa-ext-pending-row">
                      <span>
                        En attente : <b>{p.nom}</b> ({p.email})
                        {p.societe ? ` · ${p.societe}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => void resendInvite(p.id)}
                      >
                        Renvoyer
                      </button>
                      <button
                        type="button"
                        onClick={() => void cancelInvite(p.id)}
                      >
                        Annuler
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {pinNote ? (
                <div className="wa-pinned">
                  <span className="wa-pin-ico" aria-hidden>
                    📌
                  </span>
                  <span>
                    <b>Épinglé —</b> {pinNote}
                  </span>
                  {conv && prefs.msgPins[conv] ? (
                    <button
                      type="button"
                      className="wa-pinned-clear"
                      onClick={() => {
                        const next = { ...prefs.msgPins };
                        delete next[conv];
                        persist({ ...prefs, msgPins: next });
                        void load(conv);
                      }}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
              ) : null}

              {selectMode ? (
                <div className="wa-select-bar">
                  <button type="button" onClick={exitSelect} aria-label="Annuler">
                    ✕
                  </button>
                  <span>
                    {selected.length
                      ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`
                      : 'Sélectionnez des messages'}
                  </span>
                  <button
                    type="button"
                    disabled={!selected.length}
                    onClick={() => void copySelected()}
                  >
                    Copier
                  </button>
                  <button
                    type="button"
                    disabled={!selected.length}
                    onClick={() => openForward(selected)}
                  >
                    Transférer
                  </button>
                  <button
                    type="button"
                    disabled={!selected.length}
                    onClick={deleteSelected}
                  >
                    Supprimer
                  </button>
                </div>
              ) : null}

              <div
                className={`wa-stream${selectMode ? ' select-mode' : ''}`}
                ref={streamRef}
              >
                {msgs.length === 0 ? (
                  <div className="wa-day-chip">Aucun message pour l’instant</div>
                ) : null}
                {msgs.map((m, i) => {
                  if (m.systeme) {
                    return (
                      <div className="wa-sys" key={m.id}>
                        {m.texte}
                      </div>
                    );
                  }
                  if (prefs.hiddenMsgs.includes(m.id)) return null;
                  const prev = msgs[i - 1];
                  const showDay =
                    !prev || !sameDay(prev.createdAt, m.createdAt);
                  const mine = m.auteurId === meId;
                  const showAuthor =
                    !prev ||
                    prev.systeme ||
                    prev.auteurId !== m.auteurId ||
                    !sameDay(prev.createdAt, m.createdAt);
                  const showTail = showAuthor;
                  const isImg =
                    m.fichier && /\.(jpe?g|png|webp|gif|heic)$/i.test(m.fichier);
                  const isPdf = m.fichier && /\.pdf$/i.test(m.fichier);
                  const hasAction = prefs.actionMsgs.includes(m.id);
                  const starred = prefs.starred.includes(m.id);
                  const reaction = prefs.reactions[m.id];
                  const isSelected = selected.includes(m.id);
                  const quote = parseReplyQuote(m.texte);
                  const displayText = quote ? quote.body : m.texte;
                  const authorLabel = mine ? 'Vous' : m.auteur.nom;
                  const authorHue = authorColor(m.auteurId || m.auteur.nom);
                  return (
                    <div key={m.id}>
                      {showDay ? (
                        <div className="wa-day-chip">{formatDaySeparator(m.createdAt)}</div>
                      ) : null}
                      <div
                        className={`wa-msg-row${mine ? ' me' : ''}${showTail ? ' tail' : ''}`}
                      >
                        {!mine ? (
                          showTail ? (
                            <AvatarBubble
                              label={m.auteur.initiales}
                              size={32}
                              cls="wa-msg-av"
                            />
                          ) : (
                            <span className="wa-msg-av-spacer" aria-hidden />
                          )
                        ) : null}
                      <div
                        className={`wa-bub${mine ? ' me' : ''}${showTail ? ' tail' : ''}${isSelected ? ' select-on' : ''}${reaction ? ' has-react' : ''}${m.interne ? ' interne-msg' : ''}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openMsgMenu(m, { clientX: e.clientX, clientY: e.clientY });
                        }}
                        onClick={() => {
                          if (selectMode) toggleSelect(m.id);
                        }}
                        onTouchStart={() => {
                          if (selectMode) return;
                          const t = window.setTimeout(() => openMsgMenu(m), 500);
                          const clear = () => window.clearTimeout(t);
                          window.addEventListener('touchend', clear, { once: true });
                          window.addEventListener('touchmove', clear, { once: true });
                        }}
                      >
                        {selectMode ? (
                          <button
                            type="button"
                            className={`wa-bub-check${isSelected ? ' on' : ''}`}
                            aria-label="Sélectionner"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(m.id);
                            }}
                          >
                            ✓
                          </button>
                        ) : null}
                        {!selectMode ? (
                          <button
                            type="button"
                            className="wa-bub-menu-btn"
                            aria-label="Options du message"
                            onClick={(e) => {
                              e.stopPropagation();
                              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              openMsgMenu(m, {
                                clientX: r.left,
                                clientY: r.bottom + 4,
                              });
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                              <path fill="currentColor" d="M7 10l5 5 5-5z" />
                            </svg>
                          </button>
                        ) : null}
                        {showAuthor ? (
                          <span
                            className={`wa-bub-author${mine ? ' me' : ''}`}
                            style={mine ? undefined : { color: authorHue }}
                          >
                            {authorLabel}
                            {!mine &&
                            (m.auteur.acces === 'externe' || m.auteur.societe) ? (
                              <span className="wa-ext-tag">
                                {m.auteur.societe || 'Externe'}
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                        {m.interne ? (
                          <span className="wa-interne-badge">Note interne</span>
                        ) : null}
                        {quote ? (
                          <div
                            className="wa-quote"
                            style={
                              mine
                                ? undefined
                                : { borderLeftColor: authorColor(quote.quoteAuthor) }
                            }
                          >
                            <b style={{ color: authorColor(quote.quoteAuthor) }}>
                              {quote.quoteAuthor}
                            </b>
                            <span>{quote.quoteText}</span>
                          </div>
                        ) : null}
                        {starred ? (
                          <span className="wa-bub-star" aria-label="Important">
                            ★
                          </span>
                        ) : null}
                        {m.fichier && isImg ? (
                          <a
                            href={m.fichier}
                            target="_blank"
                            rel="noreferrer"
                            className="wa-photo-link"
                            onClick={(e) => selectMode && e.preventDefault()}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.fichier}
                              alt={m.photoLabel ?? 'Photo'}
                              className="wa-photo-img"
                            />
                          </a>
                        ) : m.fichier ? (
                          <a
                            href={m.fichier}
                            target="_blank"
                            rel="noreferrer"
                            className="wa-doc-card"
                            onClick={(e) => selectMode && e.preventDefault()}
                          >
                            <span className="wa-doc-ico" aria-hidden>
                              {isPdf ? 'PDF' : 'DOC'}
                            </span>
                            <span className="wa-doc-meta">
                              <strong>{m.photoLabel ?? 'Document'}</strong>
                              <small>{isPdf ? 'pdf' : 'Pièce jointe'}</small>
                            </span>
                          </a>
                        ) : m.photoLabel ? (
                          <div className="wa-pj">📷 {m.photoLabel}</div>
                        ) : null}
                        {displayText ? <p>{displayText}</p> : null}
                        {hasAction ? (
                          <Link href="/aujourdhui" className="wa-action-badge">
                            Action créée
                          </Link>
                        ) : null}
                        <span className="wa-bub-meta">
                          {new Date(m.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {mine ? (
                            <span className="wa-ticks" aria-hidden>
                              ✓✓
                            </span>
                          ) : null}
                        </span>
                        {reaction ? (
                          <span className="wa-bub-react" aria-label="Réaction">
                            {reaction}
                          </span>
                        ) : null}
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {replyTo && !selectMode ? (
                <div className="wa-reply-bar">
                  <div className="wa-reply-bar-body">
                    <b>Répondre à {replyTo.auteur}</b>
                    <span>{replyTo.texte}</span>
                  </div>
                  <button type="button" aria-label="Annuler" onClick={() => setReplyTo(null)}>
                    ✕
                  </button>
                </div>
              ) : null}

              {!isExterne && hasExternes ? (
                <div className="wa-interne-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={interneMode}
                      onChange={(e) => setInterneMode(e.target.checked)}
                    />
                    Note interne (invisible aux externes)
                  </label>
                </div>
              ) : null}

              <div className="wa-composer">
                <input
                  ref={pjRef}
                  type="file"
                  hidden
                  accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void sendFile(f);
                  }}
                />
                <button
                  type="button"
                  className="wa-attach"
                  title="Joindre"
                  aria-label="Pièce jointe"
                  disabled={uploading}
                  onClick={() => pjRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-1.93-1.57-3.5-3.5-3.5S8 3.07 8 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-2.5z"
                    />
                  </svg>
                </button>
                <div className="wa-input-wrap">
                  {mentionOpen && mentionHits.length ? (
                    <ul className="wa-mention-list" role="listbox">
                      {mentionHits.map((u) => (
                        <li key={u.id}>
                          <button type="button" onClick={() => insertMention(u)}>
                            <AvatarBubble label={u.initiales} size={28} />
                            <span>{u.nom}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <textarea
                    ref={taRef}
                    rows={1}
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onKeyDown={onComposerKey}
                    placeholder={
                      uploading ? 'Envoi en cours…' : 'Écrire un message'
                    }
                    disabled={uploading}
                    aria-label="Message"
                  />
                </div>
                <button
                  type="button"
                  className="wa-send"
                  onClick={() => void send()}
                  disabled={uploading || !text.trim()}
                  aria-label="Envoyer"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="wa-empty-main">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-setrim.png"
                alt=""
                className="wa-empty-logo"
                width={140}
                height={40}
              />
              <p>Sélectionnez une discussion</p>
              {!isExterne ? (
                <button type="button" className="btn-primary" onClick={openCompose}>
                  Nouveau message
                </button>
              ) : (
                <p className="hint">Vos discussions invitées apparaissent à gauche.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {actionModal ? (
        <>
          <div className="scrim on" onClick={() => setActionModal(null)} />
          <div className="wa-action-sheet" role="dialog" aria-labelledby="wa-action-title">
            <button type="button" className="sheet-close" onClick={() => setActionModal(null)}>
              ✕
            </button>
            <span className="eyebrow">Depuis un message</span>
            <h3 id="wa-action-title">Créer une action</h3>
            <form onSubmit={submitAction} className="add-collab-form">
              <label>
                Titre
                <input
                  required
                  value={actionTitre}
                  onChange={(e) => setActionTitre(e.target.value)}
                />
              </label>
              <label>
                Responsable
                <select
                  value={actionResp}
                  onChange={(e) => setActionResp(e.target.value)}
                >
                  {mentionUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Échéance
                <input
                  type="date"
                  required
                  value={actionEcheance}
                  onChange={(e) => setActionEcheance(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-primary" disabled={actionBusy}>
                {actionBusy ? 'Création…' : 'Créer l’action'}
              </button>
            </form>
          </div>
        </>
      ) : null}

      {showCompose ? (
        <>
          <div className="scrim on" onClick={() => !composeBusy && setShowCompose(false)} />
          <div
            className="add-collab-sheet wa-compose-sheet"
            role="dialog"
            aria-labelledby="wa-compose-title"
          >
            <button
              type="button"
              className="sheet-close"
              onClick={() => setShowCompose(false)}
              disabled={composeBusy}
            >
              ✕
            </button>
            <span className="eyebrow">Messagerie</span>
            <h3 id="wa-compose-title">Nouveau message</h3>
            <p className="hint">Choisissez un destinataire, puis écrivez votre message.</p>

            <label className="wa-compose-search">
              Rechercher
              <input
                value={composeQ}
                onChange={(e) => setComposeQ(e.target.value)}
                placeholder="Nom du collaborateur…"
                autoComplete="off"
              />
            </label>

            <div className="wa-compose-list" role="listbox" aria-label="Destinataires">
              {composeRecipients.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="option"
                  aria-selected={composeTo === x.id}
                  className={`wa-compose-pick${composeTo === x.id ? ' on' : ''}`}
                  onClick={() => openComposeTo(x.id)}
                  onDoubleClick={() => openOnly(x.id)}
                >
                  <AvatarBubble label={x.avatar} cls={`wa-av ${x.cls}`.trim()} size={36} />
                  <span>
                    <strong>{x.titre}</strong>
                    <small>
                      {x.kind === 'gen' ? 'Équipe' : 'Direct'}
                      {x.sousTitre ? ` · ${x.sousTitre}` : ''}
                    </small>
                  </span>
                </button>
              ))}
              {!composeRecipients.length ? (
                <p className="hint">Aucun destinataire trouvé.</p>
              ) : null}
            </div>

            <form onSubmit={(e) => void submitCompose(e)} className="add-collab-form">
              <label>
                Message
                <textarea
                  rows={3}
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  placeholder={
                    composeTo
                      ? 'Écrivez votre message…'
                      : 'Choisissez d’abord un destinataire'
                  }
                  disabled={!composeTo || composeBusy}
                />
              </label>
              {composeErr ? <p className="err">{composeErr}</p> : null}
              <div className="wa-compose-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={composeBusy || !composeTo}
                >
                  {composeBusy ? 'Envoi…' : 'Envoyer'}
                </button>
                {composeTo ? (
                  <button
                    type="button"
                    className="btn-edit"
                    disabled={composeBusy}
                    onClick={() => openOnly(composeTo)}
                  >
                    Ouvrir sans envoyer
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </>
      ) : null}

      {ctxMsg && menuPos ? (
        <>
          <div className="wa-msg-menu-scrim" onClick={closeMsgMenu} />
          <div
            className="wa-msg-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {reactPicker ? (
              <div className="wa-react-bar">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => reactTo(ctxMsg, emoji)}
                    aria-label={`Réagir ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" role="menuitem" onClick={() => replyMessage(ctxMsg)}>
              <span className="wa-menu-ico" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"
                  />
                </svg>
              </span>
              Répondre
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => setReactPicker((v) => !v)}
            >
              <span className="wa-menu-ico" aria-hidden>
                🙂
              </span>
              Réagir
            </button>
            <button type="button" role="menuitem" onClick={() => toggleImportant(ctxMsg)}>
              <span className="wa-menu-ico" aria-hidden>
                ★
              </span>
              {prefs.starred.includes(ctxMsg.id) ? 'Retirer important' : 'Important'}
            </button>
            <button type="button" role="menuitem" onClick={() => pinMessage(ctxMsg)}>
              <span className="wa-menu-ico" aria-hidden>
                📌
              </span>
              {conv && prefs.msgPins[conv] === msgPreview(ctxMsg).slice(0, 160)
                ? 'Désépingler'
                : 'Épingler'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openForward([ctxMsg.id])}
            >
              <span className="wa-menu-ico" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z"
                  />
                </svg>
              </span>
              Transférer
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => void copyMessage(ctxMsg)}
            >
              <span className="wa-menu-ico" aria-hidden>
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
              </span>
              Copier
            </button>
            <div className="wa-msg-menu-sep" />
            <button type="button" role="menuitem" onClick={reportMessage}>
              <span className="wa-menu-ico" aria-hidden>
                ⚠
              </span>
              Signaler
            </button>
            <div className="wa-msg-menu-sep" />
            <button
              type="button"
              role="menuitem"
              className="danger"
              onClick={() => deleteMessage(ctxMsg)}
            >
              <span className="wa-menu-ico" aria-hidden>
                🗑
              </span>
              Supprimer
            </button>
            <div className="wa-msg-menu-sep" />
            <button type="button" role="menuitem" onClick={() => startSelect(ctxMsg)}>
              <span className="wa-menu-ico" aria-hidden>
                ✓
              </span>
              Sélectionner des messages
            </button>
            <div className="wa-msg-menu-sep" />
            {!isExterne ? (
              <button type="button" role="menuitem" onClick={() => openAction(ctxMsg)}>
                <span className="wa-menu-ico" aria-hidden>
                  ✓
                </span>
                Créer une action
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {forwardOpen ? (
        <>
          <div
            className="scrim on"
            onClick={() => !forwardBusy && setForwardOpen(false)}
          />
          <div
            className="add-collab-sheet wa-compose-sheet"
            role="dialog"
            aria-labelledby="wa-forward-title"
          >
            <button
              type="button"
              className="sheet-close"
              disabled={forwardBusy}
              onClick={() => setForwardOpen(false)}
            >
              ✕
            </button>
            <span className="eyebrow">Messagerie</span>
            <h3 id="wa-forward-title">Transférer vers…</h3>
            <p className="hint">
              {forwardIds.length} message
              {forwardIds.length > 1 ? 's' : ''} à envoyer dans une autre discussion.
            </p>
            <div className="wa-compose-list">
              {convs
                .filter((x) => x.id !== conv && !prefs.archived.includes(x.id))
                .map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    className="wa-compose-pick"
                    disabled={forwardBusy}
                    onClick={() => void forwardTo(x.id)}
                  >
                    <AvatarBubble label={x.avatar} cls={`wa-av ${x.cls}`.trim()} size={36} />
                    <span>
                      <strong>{x.titre}</strong>
                      <small>{x.kind === 'gen' ? 'Équipe' : 'Direct'}</small>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </>
      ) : null}

      {inviteOpen ? (
        <>
          <div className="scrim on" onClick={() => !inviteBusy && setInviteOpen(false)} />
          <div
            className="add-collab-sheet wa-compose-sheet"
            role="dialog"
            aria-labelledby="wa-invite-title"
          >
            <button
              type="button"
              className="sheet-close"
              disabled={inviteBusy}
              onClick={() => setInviteOpen(false)}
            >
              ✕
            </button>
            <span className="eyebrow">Messagerie</span>
            <h3 id="wa-invite-title">Inviter un participant externe</h3>
            <p className="hint">
              Syndic, maîtrise d’œuvre, fournisseur ou sous-traitant — accès limité à ce
              fil.
            </p>
            <form onSubmit={(e) => void submitInvite(e)} className="add-collab-form">
              <label>
                E-mail
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                />
              </label>
              <label>
                Nom
                <input
                  required
                  value={inviteForm.nom}
                  onChange={(e) => setInviteForm({ ...inviteForm, nom: e.target.value })}
                />
              </label>
              <label>
                Société
                <input
                  value={inviteForm.societe}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, societe: e.target.value })
                  }
                />
              </label>
              <label>
                Fonction
                <input
                  value={inviteForm.fonction}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, fonction: e.target.value })
                  }
                />
              </label>
              <label>
                Message d’accompagnement
                <textarea
                  rows={2}
                  value={inviteForm.message}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, message: e.target.value })
                  }
                />
              </label>
              <label>
                Historique visible
                <select
                  value={inviteForm.historyMode}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, historyMode: e.target.value })
                  }
                >
                  <option value="from_now">À partir de maintenant (recommandé)</option>
                  <option value="share_all">Tout l’historique du fil</option>
                </select>
              </label>
              <label>
                Durée d’accès
                <select
                  value={inviteForm.accessDuration}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, accessDuration: e.target.value })
                  }
                >
                  <option value="days_30">30 jours</option>
                  <option value="months_6">6 mois</option>
                  <option value="chantier">Durée du chantier</option>
                  <option value="unlimited">Sans limite</option>
                </select>
              </label>
              {inviteLink ? (
                <p className="hint">
                  Lien à transmettre :{' '}
                  <button
                    type="button"
                    className="linkish"
                    onClick={() => void navigator.clipboard.writeText(inviteLink)}
                  >
                    Copier le lien
                  </button>
                </p>
              ) : null}
              <button type="submit" className="btn-primary" disabled={inviteBusy}>
                {inviteBusy ? 'Envoi…' : 'Envoyer l’invitation'}
              </button>
            </form>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className="wa-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
