import { useEffect, useState } from "react";
import { ExportModal } from "./ExportModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Home, Calendar, DollarSign, Heart, CheckCircle, Clock, Crown, Loader2,
  Download, RefreshCw, ArrowUpRight, TrendingUp, Lightbulb, BarChart3,
  ShieldCheck, Users, XCircle, Star
} from "lucide-react";

interface OwnerStats {
  totalProperties: number; activeProperties: number; pendingProperties: number; soldProperties: number;
  propertiesByType: { rent: number; sale: number; bnb: number; hotel: number; hostel: number };
  totalBookings: number; confirmedBookings: number; cancelledBookings: number; pendingBookings: number;
  totalRevenue: number; confirmedRentals: number; confirmedSales: number;
  totalTransactionValue: number; pendingLinkUps: number; linkUps: number; totalFavorites: number;
  subscription: { plan: string; status: string; endDate: string; amountPaid: number } | null;
  properties: Array<{
    id: string; title: string; type: string; status: string; isVerified: boolean; price: number;
    bookings: number; confirmedBookings: number; revenue: number;
    favorites: number; confirmedRentals: number; confirmedSales: number;
  }>;
  monthlyBookings: { month: string; count: number; revenue: number }[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function money(n: number) { return `KES ${n.toLocaleString()}`; }

const PIE_COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8"];

function KpiCard({ icon, label, value, sub, badge, onClick }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; badge?: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all group" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">{icon}</div>
          {badge && <Badge variant="outline" className="text-[10px] h-5">{badge}</Badge>}
        </div>
        <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? fmt(value) : value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        {onClick && <p className="text-[10px] text-zinc-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view →</p>}
      </CardContent>
    </Card>
  );
}

export function OwnerAnalytics({ token, onNavigate }: { token: string; onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [ratingsData, setRatingsData] = useState<{ reviews: any[]; perProperty: any[]; overallAvg: number | null; totalReviews: number } | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError("");
    try {
      const [r, rr] = await Promise.all([
        fetch("/api/owner-analytics", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/reviews/owner", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!r.ok) throw new Error();
      setData(await r.json());
      if (rr.ok) setRatingsData(await rr.json());
    } catch { setError("Failed to load analytics."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Properties", data.totalProperties],
      ["Active Properties", data.activeProperties],
      ["Total Link-Ups", data.totalBookings],
      ["Confirmed Link-Ups", data.confirmedBookings],
      ["Total Revenue (KES)", data.totalRevenue],
      ["Total Favorites", data.totalFavorites],
      ["Confirmed Rentals", data.confirmedRentals],
      ["Confirmed Sales", data.confirmedSales],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "owner-analytics.csv"; a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  if (error) return <div className="text-center py-16 text-red-500">{error}</div>;
  if (!data) return null;

  const propTypeData = Object.entries(data.propertiesByType)
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    .filter(d => d.value > 0);

  const funnelSteps = [
    { stage: "My Listings", value: data.totalProperties },
    { stage: "Link-Ups Received", value: data.totalBookings },
    { stage: "Link-Ups Confirmed", value: data.confirmedBookings },
    { stage: "Transactions Confirmed", value: data.confirmedRentals + data.confirmedSales },
  ];

  const insights: string[] = [];
  if (data.totalRevenue > 0) insights.push(`You've earned ${money(data.totalRevenue)} from confirmed link-ups.`);
  if (data.pendingLinkUps > 0) insights.push(`${data.pendingLinkUps} pending transaction${data.pendingLinkUps > 1 ? "s" : ""} awaiting your confirmation.`);
  if (data.totalFavorites > 0) insights.push(`Your properties have been favorited ${data.totalFavorites} time${data.totalFavorites > 1 ? "s" : ""}.`);
  if (data.activeProperties < data.totalProperties) insights.push(`${data.totalProperties - data.activeProperties} of your listings are pending approval.`);
  if (data.subscription) insights.push(`Your ${data.subscription.plan} subscription is ${data.subscription.status}. Expires ${data.subscription.endDate}.`);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Analytics</h2>
          <p className="text-sm text-gray-500">Performance data for all your properties</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => setExportOpen(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2" size="sm">
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard icon={<Home className="h-5 w-5" />} label="My Listings" value={data.totalProperties} sub={`${data.activeProperties} active · ${data.pendingProperties} pending`} onClick={() => onNavigate?.("listings")} />
          <KpiCard icon={<Calendar className="h-5 w-5" />} label="Total Link-Ups" value={data.totalBookings} sub={`${data.confirmedBookings} confirmed`} onClick={() => onNavigate?.("bookings")} />
          <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Total Revenue" value={money(data.totalRevenue)} sub="From confirmed link-ups" badge="Earned" onClick={() => onNavigate?.("transactions")} />
          <KpiCard icon={<Heart className="h-5 w-5" />} label="Total Favorites" value={data.totalFavorites} sub="Across all listings" onClick={() => onNavigate?.("property-likes")} />
          <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="Confirmed Rentals" value={data.confirmedRentals} sub={`${data.confirmedSales} confirmed sales`} onClick={() => onNavigate?.("transactions")} />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="Pending Link-Ups" value={data.pendingLinkUps} sub="Awaiting your confirmation" badge={data.pendingLinkUps > 0 ? "Action" : undefined} onClick={() => onNavigate?.("bookings")} />
        </div>
      </div>

      {/* Subscription Card */}
      {data.subscription && (
        <Card className="border-zinc-200 bg-zinc-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-zinc-900 flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-bold text-gray-900 capitalize">{data.subscription.plan} Plan</p>
                <Badge variant={data.subscription.status === "active" ? "default" : "secondary"} className="capitalize text-[10px]">
                  {data.subscription.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">Expires {data.subscription.endDate} · Amount paid: {money(data.subscription.amountPaid)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Booking Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Link-Ups & Revenue (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyBookings.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Link-Ups" fill="#18181b" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="Revenue (KES)" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No link-up history yet</div>
            )}
          </CardContent>
        </Card>

        {/* Property Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Properties by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {propTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={propTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {propTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No properties yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Engagement Funnel</CardTitle>
          <CardDescription>From listing to confirmed transaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelSteps.map((step, i) => {
              const pct = funnelSteps[0]!.value > 0 ? Math.round((step.value / funnelSteps[0]!.value) * 100) : 0;
              return (
                <div key={step.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{step.stage}</span>
                    <span className="text-gray-500">{step.value} {i > 0 && <span className="text-xs ml-1">({pct}%)</span>}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-zinc-800 h-2 rounded-full" style={{ width: `${Math.max(pct, step.value > 0 ? 4 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-Property Table */}
      {data.properties.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Property Performance</CardTitle>
            <CardDescription>Individual breakdown for each listing</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Property</th>
                    <th className="text-center p-3 font-medium text-gray-600">Status</th>
                    <th className="text-right p-3 font-medium text-gray-600">Link-Ups</th>
                    <th className="text-right p-3 font-medium text-gray-600">Revenue</th>
                    <th className="text-right p-3 font-medium text-gray-600">Favorites</th>
                    <th className="text-right p-3 font-medium text-gray-600">Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.properties.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{p.title}</p>
                          <p className="text-[11px] text-gray-400 capitalize">{p.type} · KES {p.price.toLocaleString()}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={p.isVerified && p.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                          {p.status === "approved" && p.isVerified ? "Active" : p.status === "sold" ? "Sold" : "Pending"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-gray-700">{p.bookings} <span className="text-gray-400 text-xs">({p.confirmedBookings} confirmed)</span></td>
                      <td className="p-3 text-right text-gray-700 font-medium">{money(p.revenue)}</td>
                      <td className="p-3 text-right text-gray-700">{p.favorites}</td>
                      <td className="p-3 text-right">
                        <span className="text-gray-700">{p.confirmedRentals + p.confirmedSales}</span>
                        {(p.confirmedRentals > 0 || p.confirmedSales > 0) && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 inline ml-1" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ratings & Reviews */}
      {ratingsData && ratingsData.totalReviews > 0 && (
        <Card className="border-zinc-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-zinc-700" /> Ratings & Reviews
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(ratingsData.overallAvg ?? 0) ? "fill-gray-900 text-gray-900" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900">{ratingsData.overallAvg ?? "—"}</span>
                <span className="text-xs text-gray-500">({ratingsData.totalReviews} review{ratingsData.totalReviews !== 1 ? "s" : ""})</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Per-property averages */}
            {ratingsData.perProperty.filter(p => p.totalReviews > 0).length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {ratingsData.perProperty.filter(p => p.totalReviews > 0).map((p: any) => (
                  <div key={p.propertyId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    {p.propertyImage && <img src={p.propertyImage.startsWith("/objects") ? `/api/storage${p.propertyImage}` : p.propertyImage} className="h-10 w-10 rounded object-cover shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{p.propertyTitle}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= Math.round(p.averageRating ?? 0) ? "fill-gray-700 text-gray-700" : "text-gray-300"}`} />
                        ))}
                        <span className="text-xs text-gray-500 ml-1">{p.averageRating} · {p.totalReviews} review{p.totalReviews !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Recent reviews list */}
            <div className="space-y-3">
              {ratingsData.reviews.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600">
                    {r.reviewerAvatar ? <img src={r.reviewerAvatar} className="h-8 w-8 rounded-full object-cover" /> : (r.reviewerName?.[0] ?? "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">{r.reviewerName}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-gray-800 text-gray-800" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.comment}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {ratingsData.reviews.length > 5 && (
                <p className="text-xs text-center text-gray-400">{ratingsData.reviews.length - 5} more review{ratingsData.reviews.length - 5 !== 1 ? "s" : ""} not shown</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Insights */}
      {insights.length > 0 && (
        <Card className="border-zinc-200 bg-zinc-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-zinc-700" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-zinc-400 mt-0.5">•</span> {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} token={token} role="owner" />
    </div>
  );
}
