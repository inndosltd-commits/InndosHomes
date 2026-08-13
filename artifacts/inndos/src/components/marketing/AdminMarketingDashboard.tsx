import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, UserPlus, Link2, Copy, BarChart3, TrendingUp, Activity, Search,
  ChevronRight, Check, RefreshCw, Power, PowerOff, Download, Eye, Filter,
  Calendar, Award, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";

interface Props { token: string; }

type Tab = "overview" | "marketers" | "referrals" | "analytics" | "audit";

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = "primary" }: {
  icon: any; label: string; value: number | string; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    primary: "bg-blue-50 text-blue-700",
    green:   "bg-green-50 text-green-700",
    amber:   "bg-amber-50 text-amber-700",
    red:     "bg-red-50 text-red-700",
    purple:  "bg-purple-50 text-purple-700",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color] ?? colors.primary}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminMarketingDashboard({ token }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");

  // overview
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // marketers list
  const [marketers, setMarketers] = useState<any[]>([]);
  const [marketersTotal, setMarketersTotal] = useState(0);
  const [marketersPage, setMarketersPage] = useState(1);
  const [marketersSearch, setMarketersSearch] = useState("");
  const [marketersStatus, setMarketersStatus] = useState("all");
  const [marketersSortBy, setMarketersSortBy] = useState("createdAt");
  const [loadingMarketers, setLoadingMarketers] = useState(false);

  // convert user modal
  const [showConvert, setShowConvert] = useState(false);
  const [searchUsers, setSearchUsers] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [convertingUserId, setConvertingUserId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // marketer detail modal
  const [selectedMarketer, setSelectedMarketer] = useState<any>(null);
  const [marketerDetail, setMarketerDetail] = useState<any>(null);
  const [marketerReferrals, setMarketerReferrals] = useState<any[]>([]);
  const [marketerReferralsTotal, setMarketerReferralsTotal] = useState(0);
  const [marketerReferralsFilter, setMarketerReferralsFilter] = useState("all");
  const [marketerReferralsSearch, setMarketerReferralsSearch] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // analytics chart
  const [chartRange, setChartRange] = useState("7d");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartMarketerId, setChartMarketerId] = useState("all");
  const [loadingChart, setLoadingChart] = useState(false);

  // all referrals
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [allReferralsTotal, setAllReferralsTotal] = useState(0);
  const [allReferralsPage, setAllReferralsPage] = useState(1);
  const [allReferralsSearch, setAllReferralsSearch] = useState("");
  const [loadingAllReferrals, setLoadingAllReferrals] = useState(false);

  // audit log
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // comparison
  const [comparison, setComparison] = useState<any[]>([]);

  const authH = { Authorization: `Bearer ${token}` };
  const jsonH = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const r = await fetch("/api/marketing/admin/overview", { headers: authH });
      if (r.ok) setOverview(await r.json());
    } finally { setLoadingOverview(false); }
  }, [token]);

  const fetchMarketers = useCallback(async () => {
    setLoadingMarketers(true);
    try {
      const params = new URLSearchParams({ page: String(marketersPage), limit: "20", sortBy: marketersSortBy });
      if (marketersSearch) params.set("search", marketersSearch);
      if (marketersStatus !== "all") params.set("status", marketersStatus);
      const r = await fetch(`/api/marketing/admin/marketers?${params}`, { headers: authH });
      if (r.ok) { const d = await r.json(); setMarketers(d.data); setMarketersTotal(d.total); }
    } finally { setLoadingMarketers(false); }
  }, [token, marketersPage, marketersSearch, marketersStatus, marketersSortBy]);

  const fetchChart = useCallback(async () => {
    setLoadingChart(true);
    try {
      const params = new URLSearchParams({ range: chartRange });
      if (chartMarketerId !== "all") params.set("marketerId", chartMarketerId);
      const r = await fetch(`/api/marketing/admin/analytics?${params}`, { headers: authH });
      if (r.ok) { const d = await r.json(); setChartData(d.data); }
    } finally { setLoadingChart(false); }
  }, [token, chartRange, chartMarketerId]);

  const fetchAllReferrals = useCallback(async () => {
    setLoadingAllReferrals(true);
    try {
      const params = new URLSearchParams({ page: String(allReferralsPage), limit: "50" });
      if (allReferralsSearch) params.set("search", allReferralsSearch);
      const r = await fetch(`/api/marketing/admin/referrals?${params}`, { headers: authH });
      if (r.ok) { const d = await r.json(); setAllReferrals(d.data); setAllReferralsTotal(d.total); }
    } finally { setLoadingAllReferrals(false); }
  }, [token, allReferralsPage, allReferralsSearch]);

  const fetchAuditLog = useCallback(async () => {
    const params = new URLSearchParams({ page: String(auditPage), limit: "30" });
    const r = await fetch(`/api/marketing/admin/audit-log?${params}`, { headers: authH });
    if (r.ok) { const d = await r.json(); setAuditLog(d.data); setAuditTotal(d.total); }
  }, [token, auditPage]);

  const fetchComparison = useCallback(async () => {
    const r = await fetch("/api/marketing/admin/comparison", { headers: authH });
    if (r.ok) { const d = await r.json(); setComparison(d.data); }
  }, [token]);

  const fetchMarketerDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const [detailRes, refRes] = await Promise.all([
        fetch(`/api/marketing/admin/marketers/${id}`, { headers: authH }),
        fetch(`/api/marketing/admin/marketers/${id}/referrals?limit=50`, { headers: authH }),
      ]);
      if (detailRes.ok) setMarketerDetail(await detailRes.json());
      if (refRes.ok) { const d = await refRes.json(); setMarketerReferrals(d.data); setMarketerReferralsTotal(d.total); }
    } finally { setLoadingDetail(false); }
  }, [token]);

  useEffect(() => { fetchOverview(); fetchChart(); fetchComparison(); }, []);
  useEffect(() => { if (tab === "marketers") fetchMarketers(); }, [tab, marketersPage, marketersSearch, marketersStatus, marketersSortBy]);
  useEffect(() => { if (tab === "analytics") fetchChart(); }, [chartRange, chartMarketerId]);
  useEffect(() => { if (tab === "referrals") fetchAllReferrals(); }, [tab, allReferralsPage, allReferralsSearch]);
  useEffect(() => { if (tab === "audit") fetchAuditLog(); }, [tab, auditPage]);
  useEffect(() => {
    if (selectedMarketer) fetchMarketerDetail(selectedMarketer.id);
  }, [selectedMarketer, marketerReferralsFilter, marketerReferralsSearch]);

  // ── User search for convert ──────────────────────────────────────────────────
  useEffect(() => {
    if (!searchUsers || searchUsers.length < 2) { setUserResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/marketing/admin/search-users?q=${encodeURIComponent(searchUsers)}`, { headers: authH });
        if (r.ok) { const d = await r.json(); setUserResults(d.data); }
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchUsers]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const convertUser = async (targetUserId: string) => {
    setConvertingUserId(targetUserId);
    try {
      const r = await fetch("/api/marketing/admin/marketers", {
        method: "POST", headers: jsonH, body: JSON.stringify({ targetUserId }),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Error", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Marketer created", description: `${d.user.name} is now a marketer (${d.marketer.marketerCode})` });
      setShowConvert(false); setSearchUsers(""); setUserResults([]);
      fetchMarketers(); fetchOverview();
    } finally { setConvertingUserId(null); }
  };

  const toggleStatus = async (marketer: any) => {
    const newStatus = marketer.status === "active" ? "inactive" : "active";
    const r = await fetch(`/api/marketing/admin/marketers/${marketer.id}`, {
      method: "PATCH", headers: jsonH, body: JSON.stringify({ status: newStatus }),
    });
    if (r.ok) {
      toast({ title: `Marketer ${newStatus === "active" ? "activated" : "deactivated"}` });
      fetchMarketers(); fetchOverview();
      if (marketerDetail?.marketer?.id === marketer.id) fetchMarketerDetail(marketer.id);
    }
  };

  const regenerateCode = async (marketer: any) => {
    if (!confirm(`Regenerate referral code for ${marketer.user?.name}? Historical referrals are preserved.`)) return;
    const r = await fetch(`/api/marketing/admin/marketers/${marketer.id}`, {
      method: "PATCH", headers: jsonH, body: JSON.stringify({ regenerateCode: true }),
    });
    if (r.ok) { toast({ title: "Referral code regenerated" }); fetchMarketerDetail(marketer.id); fetchMarketers(); }
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://inndos.com/#/login?ref=${code}`);
    toast({ title: "Link copied!" });
  };

  const exportCSV = (type: string) => {
    window.open(`/api/marketing/admin/export?type=${type}`, "_blank");
  };

  // ── Formatters ───────────────────────────────────────────────────────────────
  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  const avatarSrc = (u: any) => u?.avatar ? (u.avatar.startsWith("/objects/") ? `/api/storage${u.avatar}` : u.avatar) : null;
  const initials = (n?: string) => n ? n.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  // ── Tab nav ──────────────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview",  label: "Overview",    icon: BarChart3 },
    { id: "marketers", label: "Marketers",   icon: Users },
    { id: "referrals", label: "Referrals",   icon: Link2 },
    { id: "analytics", label: "Analytics",   icon: TrendingUp },
    { id: "audit",     label: "Audit Log",   icon: Activity },
  ];

  // ── OVERVIEW tab ────────────────────────────────────────────────────────────
  const OverviewTab = () => (
    <div className="space-y-6">
      {loadingOverview ? (
        <div className="flex items-center justify-center h-40"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : overview ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users}     label="Total Marketers"       value={overview.totalMarketers}   color="primary" />
            <StatCard icon={Activity}  label="Active Marketers"      value={overview.activeMarketers}  color="green" />
            <StatCard icon={Link2}     label="Total Referrals"       value={overview.totalReferrals}   color="purple" />
            <StatCard icon={TrendingUp} label="This Month"           value={overview.monthReferrals}   color="amber" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Calendar} label="Today"         value={overview.todayReferrals}  color="primary" />
            <StatCard icon={Calendar} label="This Week"     value={overview.weekReferrals}   color="primary" />
            <StatCard icon={Calendar} label="This Year"     value={overview.yearReferrals}   color="primary" />
            <StatCard icon={BarChart3} label="Avg / Marketer" value={overview.avgReferrals} color="purple" />
          </div>

          {/* Top marketer */}
          {overview.topMarketer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Top Performer</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-lg shrink-0 overflow-hidden">
                  {avatarSrc(overview.topMarketerUser)
                    ? <img src={avatarSrc(overview.topMarketerUser)} alt="" className="h-full w-full object-cover" />
                    : initials(overview.topMarketerUser?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{overview.topMarketerUser?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{overview.topMarketer.marketerCode} · {overview.topMarketer.referralCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{overview.topMarketerCount}</p>
                  <p className="text-xs text-muted-foreground">referrals</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comparison chart */}
          {comparison.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Marketer Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparison.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v: any) => [`${v} referrals`, "Total"]} />
                    <Bar dataKey="totalReferrals" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Performance breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{overview.atLeastOne}</p>
              <p className="text-xs text-muted-foreground mt-1">With ≥1 referral</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{overview.zeroReferrals}</p>
              <p className="text-xs text-muted-foreground mt-1">Zero referrals</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{overview.avgReferrals}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg / marketer</p>
            </CardContent></Card>
          </div>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-10">Failed to load overview.</p>
      )}
    </div>
  );

  // ── MARKETERS tab ────────────────────────────────────────────────────────────
  const MarketersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Name, email, code…" className="pl-9" value={marketersSearch}
              onChange={e => { setMarketersSearch(e.target.value); setMarketersPage(1); }} />
          </div>
          <Select value={marketersStatus} onValueChange={v => { setMarketersStatus(v); setMarketersPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={marketersSortBy} onValueChange={v => setMarketersSortBy(v)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Assigned</SelectItem>
              <SelectItem value="totalReferrals">Most Referrals</SelectItem>
              <SelectItem value="totalReferralsAsc">Fewest Referrals</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportCSV("marketers")}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => setShowConvert(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Marketer
          </Button>
        </div>
      </div>

      {loadingMarketers ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : marketers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No marketers found.</div>
      ) : (
        <div className="space-y-3">
          {marketers.map((m: any) => (
            <Card key={m.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {avatarSrc(m.user) ? <img src={avatarSrc(m.user)} alt="" className="h-full w-full object-cover" /> : initials(m.user?.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{m.user?.name ?? "Unknown"}</p>
                        <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] bg-gray-100 px-2 py-0.5 rounded font-mono">{m.marketerCode}</span>
                        <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">{m.referralCode}</span>
                        <span className="text-[11px] text-muted-foreground">{fmtDate(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-center shrink-0">
                    <div><p className="text-lg font-bold">{m.totalReferrals}</p><p className="text-[10px] text-muted-foreground">Total</p></div>
                    <div><p className="text-base font-semibold text-blue-600">{m.todayReferrals}</p><p className="text-[10px] text-muted-foreground">Today</p></div>
                    <div><p className="text-base font-semibold text-green-600">{m.weekReferrals}</p><p className="text-[10px] text-muted-foreground">Week</p></div>
                    <div><p className="text-base font-semibold text-purple-600">{m.monthReferrals}</p><p className="text-[10px] text-muted-foreground">Month</p></div>
                    {m.lastReferral && <div><p className="text-[11px] text-muted-foreground">{fmtDate(m.lastReferral)}</p><p className="text-[10px] text-muted-foreground">Last ref</p></div>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => copyLink(m.referralCode)} title="Copy link">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedMarketer(m); setMarketerDetail(null); setMarketerReferrals([]); }} title="View detail">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(m)} title={m.status === "active" ? "Deactivate" : "Activate"}>
                      {m.status === "active" ? <PowerOff className="h-3.5 w-3.5 text-red-500" /> : <Power className="h-3.5 w-3.5 text-green-500" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* pagination */}
      {marketersTotal > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={marketersPage === 1} onClick={() => setMarketersPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground self-center">Page {marketersPage} · {marketersTotal} total</span>
          <Button size="sm" variant="outline" disabled={marketersPage * 20 >= marketersTotal} onClick={() => setMarketersPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );

  // ── REFERRALS tab ────────────────────────────────────────────────────────────
  const ReferralsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Name, email, code…" className="pl-9" value={allReferralsSearch}
            onChange={e => { setAllReferralsSearch(e.target.value); setAllReferralsPage(1); }} />
        </div>
        <Button size="sm" variant="outline" onClick={() => exportCSV("referrals")}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {loadingAllReferrals ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["User", "Email", "Phone", "Marketer", "Code", "Date", "Status"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {allReferrals.map((r: any) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.referredUser?.name ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{r.referredUser?.email ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{r.referredUser?.phone ?? "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.marketerUser?.name ?? "—"}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{r.referralCode}</span></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(r.createdAt)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={r.referredUser?.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {r.referredUser?.status ?? "unknown"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {allReferrals.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No referrals found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {allReferralsTotal > 50 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={allReferralsPage === 1} onClick={() => setAllReferralsPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground self-center">Page {allReferralsPage} · {allReferralsTotal} total</span>
          <Button size="sm" variant="outline" disabled={allReferralsPage * 50 >= allReferralsTotal} onClick={() => setAllReferralsPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );

  // ── ANALYTICS tab ────────────────────────────────────────────────────────────
  const AnalyticsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        {["7d","30d","3m","6m","12m"].map(r => (
          <Button key={r} size="sm" variant={chartRange === r ? "default" : "outline"} onClick={() => setChartRange(r)}>
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : r === "3m" ? "3 Months" : r === "6m" ? "6 Months" : "12 Months"}
          </Button>
        ))}
        <Select value={chartMarketerId} onValueChange={setChartMarketerId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Marketers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Marketers</SelectItem>
            {marketers.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>{m.user?.name ?? m.marketerCode}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Referral Registrations Over Time</CardTitle></CardHeader>
        <CardContent>
          {loadingChart ? (
            <div className="flex justify-center h-48 items-center"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [`${v}`, "Referrals"]} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Comparison table */}
      {comparison.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Marketer Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {comparison.map((m: any, i: number) => (
                <div key={m.marketerCode} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{m.marketerCode}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${comparison[0].totalReferrals > 0 ? (m.totalReferrals / comparison[0].totalReferrals) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold shrink-0 w-10 text-right">{m.totalReferrals}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ── AUDIT tab ────────────────────────────────────────────────────────────────
  const AuditTab = () => (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Action", "Admin", "Target", "Details", "IP", "Date"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {auditLog.map((a: any) => (
              <tr key={a.id} className="hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.adminId?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{a.targetMarketerId?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2 text-xs max-w-xs truncate">{a.details ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{a.ipAddress ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(a.createdAt)}</td>
              </tr>
            ))}
            {auditLog.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No audit records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {auditTotal > 30 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={auditPage === 1} onClick={() => setAuditPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground self-center">Page {auditPage} · {auditTotal} total</span>
          <Button size="sm" variant="outline" disabled={auditPage * 30 >= auditTotal} onClick={() => setAuditPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );

  // ── Marketer detail modal ─────────────────────────────────────────────────────
  const DetailModal = () => {
    const mk = marketerDetail?.marketer;
    const usr = marketerDetail?.user;
    const stats = marketerDetail?.stats;
    const link = marketerDetail?.referralLink;

    return (
      <Dialog open={!!selectedMarketer} onOpenChange={o => { if (!o) setSelectedMarketer(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {avatarSrc(usr) ? <img src={avatarSrc(usr)} alt="" className="h-full w-full object-cover" /> : initials(usr?.name)}
              </div>
              <div>
                <p>{usr?.name ?? "Loading…"}</p>
                {mk && <p className="text-sm font-normal text-muted-foreground">{mk.marketerCode}</p>}
              </div>
            </DialogTitle>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : marketerDetail && (
            <div className="space-y-5">
              {/* Info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{usr?.email}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{usr?.phone ?? "—"}</span></div>
                <div><span className="text-muted-foreground">Marketer ID:</span> <span className="font-mono font-medium">{mk?.marketerCode}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={mk?.status === "active" ? "default" : "secondary"} className="text-[10px]">{mk?.status}</Badge></div>
                <div><span className="text-muted-foreground">Assigned:</span> <span>{fmtDate(mk?.createdAt)}</span></div>
                <div><span className="text-muted-foreground">Referral Code:</span> <span className="font-mono font-semibold text-blue-700">{mk?.referralCode}</span></div>
              </div>

              {/* Referral link */}
              <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-xs flex-1 truncate font-mono">{link}</p>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copied!" }); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {[
                    { l: "Total", v: stats.total }, { l: "Today", v: stats.today },
                    { l: "Yesterday", v: stats.yesterday }, { l: "This Week", v: stats.thisWeek },
                    { l: "This Month", v: stats.thisMonth }, { l: "This Year", v: stats.thisYear },
                    { l: "Active", v: stats.activeCount }, { l: "Inactive", v: stats.inactiveCount },
                  ].map(({ l, v }) => (
                    <div key={l} className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold">{v}</p>
                      <p className="text-xs text-muted-foreground">{l}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Visits / conversion */}
              {stats && stats.totalVisits > 0 && (
                <div className="flex items-center gap-4 text-sm bg-blue-50 rounded-lg px-4 py-3">
                  <div className="text-center"><p className="font-bold">{stats.totalVisits}</p><p className="text-xs text-muted-foreground">Link Visits</p></div>
                  <div className="text-center"><p className="font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Conversions</p></div>
                  <div className="text-center"><p className="font-bold text-blue-700">{stats.conversionRate}%</p><p className="text-xs text-muted-foreground">Conv. Rate</p></div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => toggleStatus(mk)}>
                  {mk?.status === "active" ? <><PowerOff className="h-3.5 w-3.5 mr-1.5" /> Deactivate</> : <><Power className="h-3.5 w-3.5 mr-1.5" /> Activate</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => regenerateCode({ ...mk, user: usr })}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate Code
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportCSV(`referrals&marketerId=${mk?.id}`)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Export Referrals
                </Button>
              </div>

              {/* Referral list */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Referral List ({marketerReferralsTotal})</h3>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {["Name", "Email", "Phone", "Code", "Date", "Status"].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {marketerReferrals.map((r: any) => (
                        <tr key={r.referralId} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{r.user?.name ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground text-xs">{r.user?.email ?? "—"}</td>
                          <td className="px-3 py-2 text-xs">{r.user?.phone ?? "—"}</td>
                          <td className="px-3 py-2"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{r.referralCode}</span></td>
                          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                          <td className="px-3 py-2"><Badge variant={r.user?.status === "active" ? "default" : "secondary"} className="text-[10px]">{r.user?.status ?? "?"}</Badge></td>
                        </tr>
                      ))}
                      {marketerReferrals.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No referrals yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // ── Convert user modal ────────────────────────────────────────────────────────
  const ConvertModal = () => (
    <Dialog open={showConvert} onOpenChange={setShowConvert}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert User to Marketer</DialogTitle>
          <DialogDescription>Search for an existing INNDOS user and assign them the Marketer role. Their normal account will remain unchanged.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, email or phone…" className="pl-9" value={searchUsers}
              onChange={e => setSearchUsers(e.target.value)} />
          </div>
          {searching && <p className="text-xs text-center text-muted-foreground">Searching…</p>}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {userResults.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/40">
                <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                  {avatarSrc(u) ? <img src={avatarSrc(u)} alt="" className="h-full w-full object-cover" /> : initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email} · {u.role}</p>
                </div>
                {u.isMarketer ? (
                  <Badge variant="secondary" className="text-[10px] shrink-0"><Check className="h-3 w-3 mr-1" />Marketer</Badge>
                ) : (
                  <Button size="sm" disabled={convertingUserId === u.id} onClick={() => convertUser(u.id)}>
                    {convertingUserId === u.id ? "Adding…" : "Add"}
                  </Button>
                )}
              </div>
            ))}
            {searchUsers.length >= 2 && !searching && userResults.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">No users found.</p>
            )}
            {searchUsers.length < 2 && (
              <p className="text-center text-muted-foreground text-sm py-4">Type at least 2 characters to search.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Marketing & Referrals</h2>
          <p className="text-sm text-muted-foreground">Manage marketers, track referrals, and monitor performance.</p>
        </div>
        <Button onClick={() => { fetchOverview(); fetchComparison(); fetchChart(); }} variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t.id)}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview"  && <OverviewTab />}
        {tab === "marketers" && <MarketersTab />}
        {tab === "referrals" && <ReferralsTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "audit"     && <AuditTab />}
      </div>

      <DetailModal />
      <ConvertModal />
    </div>
  );
}
