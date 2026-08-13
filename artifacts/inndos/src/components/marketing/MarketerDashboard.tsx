import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users, Link2, TrendingUp, Calendar, CheckCircle2, Clock, Search, Filter, RefreshCw } from "lucide-react";

interface Props { token: string; }

function StatCard({ icon: Icon, label, value, color = "primary" }: { icon: any; label: string; value: number | string; color?: string }) {
  const colors: Record<string, string> = {
    primary: "bg-blue-50 text-blue-700",
    green:   "bg-green-50 text-green-700",
    amber:   "bg-amber-50 text-amber-700",
    purple:  "bg-purple-50 text-purple-700",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketerDashboard({ token }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"dashboard" | "link" | "referrals">("dashboard");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralsTotal, setReferralsTotal] = useState(0);
  const [referralsPage, setReferralsPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const authH = { Authorization: `Bearer ${token}` };

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/marketing/me", { headers: authH });
      if (r.ok) setProfile(await r.json());
      else setProfile(null);
    } finally { setLoading(false); }
  }, [token]);

  const fetchReferrals = useCallback(async () => {
    setLoadingReferrals(true);
    try {
      const params = new URLSearchParams({ page: String(referralsPage), limit: "50" });
      if (filter !== "all") params.set("filter", filter);
      if (search) params.set("search", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const r = await fetch(`/api/marketing/me/referrals?${params}`, { headers: authH });
      if (r.ok) { const d = await r.json(); setReferrals(d.data); setReferralsTotal(d.total); }
    } finally { setLoadingReferrals(false); }
  }, [token, referralsPage, filter, search, dateFrom, dateTo]);

  useEffect(() => { fetchProfile(); }, []);
  useEffect(() => { if (tab === "referrals") fetchReferrals(); }, [tab, referralsPage, filter, search, dateFrom, dateTo]);

  const copyLink = () => {
    if (!profile?.referralLink) return;
    navigator.clipboard.writeText(profile.referralLink);
    setLinkCopied(true);
    toast({ title: "Referral link copied!" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: "Join inndos via my link", url: profile?.referralLink ?? "" }).catch(() => {});
    } else copyLink();
  };

  const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  const { marketer, user, stats, referralLink } = profile;

  const navTabs: { id: "dashboard" | "link" | "referrals"; label: string }[] = [
    { id: "dashboard",  label: "Dashboard" },
    { id: "link",       label: "My Referral Link" },
    { id: "referrals",  label: `My Referrals (${stats.total})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Marketer Portal</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{marketer.marketerCode}</span>
            <Badge variant={marketer.status === "active" ? "default" : "secondary"} className="text-[10px]">{marketer.status}</Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchProfile}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {navTabs.map(t => (
          <button key={t.id}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD tab */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* Quick referral link card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Link2 className="h-4 w-4" /> Your Referral Link</p>
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
                <p className="text-xs flex-1 truncate font-mono text-muted-foreground">{referralLink}</p>
                <Button size="sm" variant="ghost" onClick={copyLink}>
                  {linkCopied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={shareLink}><Share2 className="h-3.5 w-3.5" /></Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Code: <span className="font-mono font-semibold text-primary">{marketer.referralCode}</span> · Assigned: {fmtDate(marketer.createdAt)}</p>
            </CardContent>
          </Card>

          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard icon={Users}     label="Total People Joined" value={stats.total}       color="primary" />
            <StatCard icon={Calendar}  label="New Today"           value={stats.today}       color="amber" />
            <StatCard icon={TrendingUp} label="This Week"          value={stats.thisWeek}    color="purple" />
            <StatCard icon={Calendar}  label="This Month"          value={stats.thisMonth}   color="primary" />
            <StatCard icon={CheckCircle2} label="Active Referrals" value={stats.activeCount} color="green" />
            <StatCard icon={Clock}     label="Inactive Referrals"  value={stats.inactiveCount} color="amber" />
          </div>

          {/* Conversion stats if available */}
          {stats.totalVisits > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Referral Funnel</CardTitle></CardHeader>
              <CardContent className="flex gap-6 text-center">
                <div><p className="text-xl font-bold">{stats.totalVisits}</p><p className="text-xs text-muted-foreground">Link Visits</p></div>
                <div className="self-center text-muted-foreground">→</div>
                <div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Registrations</p></div>
                <div className="self-center text-muted-foreground">=</div>
                <div><p className="text-xl font-bold text-blue-700">{stats.conversionRate ?? 0}%</p><p className="text-xs text-muted-foreground">Conversion</p></div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* MY REFERRAL LINK tab */}
      {tab === "link" && (
        <div className="space-y-6 max-w-lg">
          <Card>
            <CardHeader><CardTitle>Your Referral Link</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Share this link. When someone registers through it, they're counted as your referral.</p>
                <div className="bg-muted rounded-lg px-4 py-3 font-mono text-sm break-all">{referralLink}</div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={copyLink}>
                  {linkCopied ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
                </Button>
                <Button variant="outline" onClick={shareLink}><Share2 className="h-4 w-4 mr-2" /> Share</Button>
              </div>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Your Code</span><span className="font-mono font-bold">{marketer.referralCode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Marketer ID</span><span className="font-mono">{marketer.marketerCode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={marketer.status === "active" ? "default" : "secondary"} className="text-[10px]">{marketer.status}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span>{fmtDate(marketer.createdAt)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MY REFERRALS tab */}
      {tab === "referrals" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, email…" className="pl-9" value={search}
                onChange={e => { setSearch(e.target.value); setReferralsPage(1); }} />
            </div>
            <Select value={filter} onValueChange={v => { setFilter(v); setReferralsPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="w-36" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setReferralsPage(1); }} placeholder="From" />
            <Input type="date" className="w-36" value={dateTo}   onChange={e => { setDateTo(e.target.value);   setReferralsPage(1); }} placeholder="To" />
          </div>

          {loadingReferrals ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Name", "Email", "Phone", "Date & Time", "Code", "Account Status"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {referrals.map((r: any) => (
                    <tr key={r.referralId} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.user?.name ?? "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{r.user?.email ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{r.user?.phone ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{r.referralCode}</span></td>
                      <td className="px-3 py-2.5">
                        <Badge variant={r.user?.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {r.user?.status === "active" ? "Active" : r.user?.status ?? "Unknown"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {referrals.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                      {stats.total === 0 ? "No one has joined through your link yet. Share your referral link to get started!" : "No results for the selected filters."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {referralsTotal > 50 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" disabled={referralsPage === 1} onClick={() => setReferralsPage(p => p - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground self-center">Page {referralsPage} · {referralsTotal} total</span>
              <Button size="sm" variant="outline" disabled={referralsPage * 50 >= referralsTotal} onClick={() => setReferralsPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
