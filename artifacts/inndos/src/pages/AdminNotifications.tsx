import { useState, useEffect, useRef } from "react";
import {
  Bell, Mail, MessageSquare, LayoutDashboard, Home, Users,
  Handshake, ShieldCheck, BarChart3, Menu, X, Search as SearchIcon,
  RotateCcw, Save, ChevronRight, BellRing, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NotifTemplate {
  id: string;
  key: string;
  category: string;
  channel: "email" | "sms" | "bell";
  label: string;
  subject: string | null;
  body: string;
  cta_label: string | null;
  default_subject: string | null;
  default_body: string;
  default_cta_label: string | null;
  variables: { name: string; description: string }[];
  is_active: boolean;
  updated_by: string | null;
  updated_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const API = "/api/admin/notification-templates";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "subscription", label: "Subscription" },
  { value: "booking",      label: "Booking" },
  { value: "listing",      label: "Listing" },
  { value: "auth",         label: "Auth" },
  { value: "transaction",  label: "Transaction" },
];

const CHANNELS = [
  { value: "all",   label: "All Channels", Icon: BellRing },
  { value: "email", label: "Email",        Icon: Mail },
  { value: "sms",   label: "SMS",          Icon: MessageSquare },
  { value: "bell",  label: "Bell",         Icon: Bell },
];

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "email") return (
    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-semibold uppercase tracking-wide gap-1 py-0.5">
      <Mail className="h-2.5 w-2.5" />Email
    </Badge>
  );
  if (channel === "sms") return (
    <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] font-semibold uppercase tracking-wide gap-1 py-0.5">
      <MessageSquare className="h-2.5 w-2.5" />SMS
    </Badge>
  );
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-semibold uppercase tracking-wide gap-1 py-0.5">
      <Bell className="h-2.5 w-2.5" />Bell
    </Badge>
  );
}

function relativeTime(iso: string | null) {
  if (!iso) return "Default content";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function categoryLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [templates, setTemplates]           = useState<NotifTemplate[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeChannel, setActiveChannel]   = useState("all");
  const [search, setSearch]                 = useState("");
  const [selected, setSelected]             = useState<NotifTemplate | null>(null);
  const [editSubject, setEditSubject]       = useState("");
  const [editBody, setEditBody]             = useState("");
  const [editCta, setEditCta]               = useState("");
  const [saving, setSaving]                 = useState(false);
  const [resetting, setResetting]           = useState(false);
  const [toast, setToast]                   = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const navItems = [
    { Icon: LayoutDashboard, label: "Dashboard",     path: "/#/admin" },
    { Icon: Home,            label: "Properties",    path: "/#/admin/properties" },
    { Icon: Users,           label: "Users",         path: "/#/admin/users" },
    { Icon: Handshake,       label: "Transactions",  path: "/#/admin/transactions" },
    { Icon: ShieldCheck,     label: "Moderation",    path: "/#/admin/moderation" },
    { Icon: BarChart3,       label: "Analytics",     path: "/#/admin/analytics" },
    { Icon: Bell,            label: "Notifications", path: "/#/admin/notifications", active: true },
  ];

  // ── Fetch ──────────────────────────────────────────────────────────────────
  async function fetchTemplates() {
    setLoading(true);
    try {
      const res = await fetch(API, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed");
      setTemplates(await res.json());
    } catch {
      showToast("Failed to load templates", "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTemplates(); }, []);

  // ── Select ─────────────────────────────────────────────────────────────────
  function selectTemplate(tmpl: NotifTemplate) {
    setSelected(tmpl);
    setEditSubject(tmpl.subject ?? "");
    setEditBody(tmpl.body ?? "");
    setEditCta(tmpl.cta_label ?? "");
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${selected.key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ subject: editSubject || null, body: editBody, ctaLabel: editCta || null }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: NotifTemplate = await res.json();
      setTemplates(prev => prev.map(t => t.key === updated.key ? updated : t));
      setSelected(updated);
      showToast("Template saved!", "ok");
    } catch {
      showToast("Failed to save template", "err");
    } finally {
      setSaving(false);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  async function handleReset() {
    if (!selected) return;
    if (!confirm(`Reset "${selected.label}" to the original default content?`)) return;
    setResetting(true);
    try {
      const res = await fetch(`${API}/${selected.key}/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed");
      const updated: NotifTemplate = await res.json();
      setTemplates(prev => prev.map(t => t.key === updated.key ? updated : t));
      selectTemplate(updated);
      showToast("Reset to default!", "ok");
    } catch {
      showToast("Failed to reset template", "err");
    } finally {
      setResetting(false);
    }
  }

  // ── Insert variable into body textarea ────────────────────────────────────
  function insertVariable(varName: string) {
    const token = `{{${varName}}}`;
    const ta = bodyRef.current;
    if (ta) {
      const start = ta.selectionStart ?? editBody.length;
      const end   = ta.selectionEnd   ?? editBody.length;
      const next  = editBody.slice(0, start) + token + editBody.slice(end);
      setEditBody(next);
      setTimeout(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + token.length;
      }, 0);
    } else {
      setEditBody(prev => prev + token);
    }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = templates.filter(t => {
    if (activeCategory !== "all" && t.category !== activeCategory) return false;
    if (activeChannel  !== "all" && t.channel   !== activeChannel)  return false;
    if (search) {
      const q = search.toLowerCase();
      return t.label.toLowerCase().includes(q) || t.key.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by category
  const grouped: Record<string, NotifTemplate[]> = {};
  for (const t of filtered) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  const isDirty = selected && (
    editBody    !== (selected.body      ?? "") ||
    editSubject !== (selected.subject   ?? "") ||
    editCta     !== (selected.cta_label ?? "")
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`bg-white border-r w-64 flex-shrink-0 flex flex-col transition-transform duration-300 z-40 fixed md:relative h-full ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="text-blue-700 font-bold text-2xl tracking-tighter flex items-center">
            INN<span className="text-amber-500">DOS</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 tracking-wider">ADMIN PANEL</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map(item => (
              <a key={item.path} href={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                  ${item.active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                onClick={() => setSidebarOpen(false)}>
                <item.Icon className={`h-4 w-4 ${item.active ? "text-blue-600" : "text-gray-400"}`} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">

        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Notification Templates</h1>
            <p className="text-xs text-gray-500 mt-0.5">Edit SMS, email, and bell message content — changes apply to all future notifications</p>
          </div>
          <Badge variant="outline" className="text-xs">{templates.length} templates</Badge>
        </div>

        <div className="flex-1 overflow-hidden flex">

          {/* Left panel — filters + list */}
          <div className={`flex flex-col border-r bg-white ${selected ? "hidden lg:flex lg:w-96 lg:flex-shrink-0" : "flex flex-1 lg:flex-none lg:w-96 lg:flex-shrink-0"}`}>

            {/* Search + channel filter */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {CHANNELS.map(ch => (
                  <button key={ch.value}
                    onClick={() => setActiveChannel(ch.value)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors
                      ${activeChannel === ch.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                    <ch.Icon className="h-3 w-3" />{ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex overflow-x-auto border-b">
              {CATEGORIES.map(cat => (
                <button key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-3 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors flex-shrink-0
                    ${activeCategory === cat.value
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-400">Loading templates…</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">No templates match your filters</div>
              ) : Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b sticky top-0">
                    {categoryLabel(cat)} <span className="font-normal text-gray-300">({items.length})</span>
                  </div>
                  {items.map(tmpl => (
                    <button key={tmpl.key}
                      onClick={() => selectTemplate(tmpl)}
                      className={`w-full text-left px-3 py-2.5 border-b flex items-start gap-2 transition-colors hover:bg-gray-50
                        ${selected?.key === tmpl.key ? "bg-blue-50 border-l-[3px] border-l-blue-500" : "border-l-[3px] border-l-transparent"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ChannelBadge channel={tmpl.channel} />
                        </div>
                        <p className="text-xs font-medium text-gray-900 leading-snug line-clamp-2">
                          {tmpl.label.replace(/\s*\((Email|SMS|Bell)\)$/, "")}
                        </p>
                        <p className={`text-[10px] mt-0.5 ${tmpl.updated_at ? "text-amber-600 font-medium" : "text-gray-400"}`}>
                          {tmpl.updated_at ? `Edited ${relativeTime(tmpl.updated_at)}` : "Default content"}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 flex-shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — editor */}
          {selected ? (
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">

              {/* Editor header */}
              <div className="px-5 py-3.5 border-b bg-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button onClick={() => setSelected(null)} className="lg:hidden p-1 rounded hover:bg-gray-100 flex-shrink-0">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                  <ChannelBadge channel={selected.channel} />
                  <span className="text-sm font-semibold text-gray-800 truncate">{selected.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting}
                    className="text-xs h-7 gap-1.5 text-gray-500">
                    <RotateCcw className={`h-3 w-3 ${resetting ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}
                    className="text-xs h-7 gap-1.5 bg-blue-600 hover:bg-blue-700">
                    <Save className="h-3 w-3" />
                    {saving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>

              {/* Editor body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Template key info */}
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border text-[11px] text-gray-500">
                  <Tag className="h-3 w-3 flex-shrink-0" />
                  <span className="font-mono truncate">{selected.key}</span>
                  <span className="ml-auto capitalize font-medium text-gray-600 flex-shrink-0">{selected.category}</span>
                </div>

                {/* Variable chips */}
                {selected.variables.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      Available variables <span className="font-normal text-gray-400">(click to insert at cursor)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.variables.map(v => (
                        <button key={v.name}
                          onClick={() => insertVariable(v.name)}
                          title={v.description}
                          className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-mono border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                          {`{{${v.name}}}`}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Hover a variable chip to see what it represents. Variables are replaced with real values when the notification is sent.
                    </p>
                  </div>
                )}

                {/* Subject (email only) */}
                {selected.channel === "email" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Subject Line <span className="text-gray-400 font-normal">(supports variables)</span>
                    </label>
                    <Input
                      className="text-sm"
                      placeholder='e.g. ⏰ Your subscription expires in {{daysLeft}} days'
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                    />
                    {selected.default_subject && editSubject !== (selected.default_subject ?? "") && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Default: <span className="font-mono">{selected.default_subject}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Body */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    {selected.channel === "email" ? "Body / Intro Paragraph" : "Message Content"}
                    <span className="text-gray-400 font-normal ml-1">(supports variables)</span>
                  </label>
                  <Textarea
                    ref={bodyRef}
                    className="text-sm font-mono leading-relaxed min-h-[140px] resize-y"
                    placeholder="Message content with {{variable}} placeholders…"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[11px] text-gray-400">{editBody.length} chars</p>
                    {editBody !== selected.default_body && (
                      <p className="text-[11px] text-amber-600">Content differs from default</p>
                    )}
                  </div>
                </div>

                {/* CTA label (email only) */}
                {selected.channel === "email" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">CTA Button Label</label>
                    <Input
                      className="text-sm"
                      placeholder="e.g. Renew My Subscription"
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                    />
                  </div>
                )}

                {/* Live preview */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Preview <span className="font-normal normal-case">(variables shown highlighted)</span>
                  </p>
                  {selected.channel === "email" && editSubject && (
                    <p className="text-xs font-semibold text-gray-700 mb-2 pb-2 border-b">{editSubject}</p>
                  )}
                  <p className="text-xs text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: editBody
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/\{\{(\w+)\}\}/g, '<span class="bg-blue-100 text-blue-700 rounded px-0.5 font-mono text-[10px]">{{$1}}</span>')
                    }}
                  />
                  {selected.channel === "email" && editCta && (
                    <div className="mt-3">
                      <span className="inline-block px-3 py-1.5 bg-gray-900 text-white text-xs rounded-md font-medium">{editCta}</span>
                    </div>
                  )}
                </div>

                {/* Default content reference */}
                {selected.default_body && selected.default_body !== editBody && (
                  <details className="border rounded-lg overflow-hidden">
                    <summary className="px-3 py-2.5 cursor-pointer text-[11px] font-semibold text-amber-700 bg-amber-50 border-b border-amber-100 select-none hover:bg-amber-100 transition-colors">
                      View original default content
                    </summary>
                    <div className="p-3 bg-white space-y-2">
                      {selected.default_subject && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Subject</p>
                          <p className="text-[11px] text-gray-700 font-mono">{selected.default_subject}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Body</p>
                        <p className="text-[11px] text-gray-700 font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap">{selected.default_body}</p>
                      </div>
                      {selected.default_cta_label && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">CTA</p>
                          <p className="text-[11px] text-gray-700">{selected.default_cta_label}</p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center text-center p-8">
              <div>
                <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500">Select a template to edit</p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Changes take effect on the next notification send — no redeploy needed
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white
          ${toast.type === "ok" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
