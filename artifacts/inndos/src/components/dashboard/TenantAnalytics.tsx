import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Calendar, DollarSign, Heart, CheckCircle, Clock, Loader2,
  Download, RefreshCw, MapPin, Home, Lightbulb, ShieldCheck
} from "lucide-react";

interface TenantStats {
  totalBookings: number; confirmedBookings: number; cancelledBookings: number; pendingBookings: number;
  totalSpent: number; avgBookingValue: number;
  confirmedRentals: number; confirmedSales: number; pendingTransactions: number;
  totalFavorites: number;
  recentBookings: Array<{
    id: string; status: string; startDate: string; endDate: string;
    totalPrice: number; createdAt: string;
    propertyTitle: string | null; propertyAddress: string | null; propertyType: string | null;
  }>;
  monthlyBookings: { month: string; count: number; spent: number }[];
  favoriteAreas: { area: string; count: number }[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function money(n: number) { return `KES ${n.toLocaleString()}`; }

/** Fill all 6 months with zero for missing entries. Backend format: "Jan 2026" */
function zeroFillMonths6(
  data: { month: string; count: number; spent: number }[]
): { month: string; count: number; spent: number }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const label = d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear();
    return data.find(e => e.month === label) ?? { month: label, count: 0, spent: 0 };
  });
}

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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "default",
  pending: "secondary",
  cancelled: "destructive",
};

export function TenantAnalytics({ token, onNavigate }: { token: string; onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (isRefresh = false) => {
    if (isRefresh) { setRefreshing(true); } else { setLoading(true); }
    setError("");
    try {
      const r = await fetch("/api/tenant-analytics", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      setData(await r.json());
    } catch { setError("Failed to load analytics."); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Bookings", data.totalBookings],
      ["Confirmed Bookings", data.confirmedBookings],
      ["Cancelled Bookings", data.cancelledBookings],
      ["Total Spent (KES)", data.totalSpent],
      ["Avg Booking Value (KES)", data.avgBookingValue],
      ["Total Favorites", data.totalFavorites],
      ["Confirmed Rentals", data.confirmedRentals],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "my-activity-analytics.csv"; a.click();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  if (error) return <div className="text-center py-16 text-red-500">{error}</div>;
  if (!data) return null;

  const insights: string[] = [];
  if (data.confirmedBookings > 0) insights.push(`${data.confirmedBookings} of your bookings have been confirmed as Link-Ups.`);
  if (data.totalSpent > 0) insights.push(`You've spent ${money(data.totalSpent)} total across all bookings.`);
  if (data.avgBookingValue > 0) insights.push(`Your average booking value is ${money(data.avgBookingValue)}.`);
  if (data.favoriteAreas.length > 0) insights.push(`Your most visited area is ${data.favoriteAreas[0]!.area}.`);
  if (data.pendingTransactions > 0) insights.push(`${data.pendingTransactions} pending transaction${data.pendingTransactions > 1 ? "s" : ""} await your confirmation.`);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Activity</h2>
          <p className="text-sm text-gray-500">Your booking history, spending, and search patterns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">My Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard icon={<Calendar className="h-5 w-5" />} label="Total Bookings" value={data.totalBookings} sub={`${data.confirmedBookings} confirmed`} onClick={() => onNavigate?.("bookings")} />
          <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Total Spent" value={money(data.totalSpent)} sub={`Avg ${money(data.avgBookingValue)} per booking`} onClick={() => onNavigate?.("transactions")} />
          <KpiCard icon={<Heart className="h-5 w-5" />} label="Favorites Saved" value={data.totalFavorites} onClick={() => onNavigate?.("saved")} />
          <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="Confirmed Rentals" value={data.confirmedRentals} sub={`${data.confirmedSales} confirmed purchases`} onClick={() => onNavigate?.("transactions")} />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="Pending Bookings" value={data.pendingBookings} badge={data.pendingBookings > 0 ? "Active" : undefined} onClick={() => onNavigate?.("bookings")} />
          <KpiCard icon={<CheckCircle className="h-5 w-5" />} label="Pending Confirmations" value={data.pendingTransactions} badge={data.pendingTransactions > 0 ? "Action" : undefined} onClick={() => onNavigate?.("transactions")} />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Booking Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Booking Activity (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => { const chartData = zeroFillMonths6(data.monthlyBookings); return chartData.some(m => m.count > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Bookings" stroke="#18181b" fill="url(#tenantGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No booking history yet</div>
            ); })()}
          </CardContent>
        </Card>

        {/* Favorite Areas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Favourite Areas</CardTitle>
            <CardDescription>Based on your booking history</CardDescription>
          </CardHeader>
          <CardContent>
            {data.favoriteAreas.length > 0 ? (
              <div className="space-y-3 pt-1">
                {data.favoriteAreas.map((a, i) => (
                  <div key={a.area} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 text-xs font-bold shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 truncate">{a.area}</span>
                        <span className="text-gray-400 text-xs">{a.count} booking{a.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="bg-zinc-800 h-1.5 rounded-full" style={{ width: `${Math.round((a.count / data.favoriteAreas[0]!.count) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                <MapPin className="h-8 w-8 text-gray-200" />
                <span>Make bookings to see your favourite areas</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending */}
      {data.monthlyBookings.some(m => m.spent > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Spending (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={zeroFillMonths6(data.monthlyBookings)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(v / 1000)}K`} />
                <Tooltip formatter={(v: any) => [`KES ${Number(v).toLocaleString()}`]} />
                <Bar dataKey="spent" name="Spent (KES)" fill="#3f3f46" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Bookings */}
      {data.recentBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <CardDescription>Your 10 most recent booking requests</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Property</th>
                    <th className="text-center p-3 font-medium text-gray-600">Status</th>
                    <th className="text-right p-3 font-medium text-gray-600">Dates</th>
                    <th className="text-right p-3 font-medium text-gray-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentBookings.map(b => (
                    <tr key={b.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{b.propertyTitle ?? "Property"}</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{b.propertyAddress ?? ""}</p>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={(STATUS_COLORS[b.status] as any) ?? "secondary"} className="text-[10px] capitalize">{b.status}</Badge>
                      </td>
                      <td className="p-3 text-right text-gray-500 text-xs">{b.startDate} → {b.endDate}</td>
                      <td className="p-3 text-right font-medium text-gray-900">{money(b.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline empty state */}
      {data.totalBookings === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Home className="h-14 w-14 text-gray-200 mb-4" />
            <h3 className="font-medium text-gray-700 mb-1">No activity yet</h3>
            <p className="text-sm max-w-xs">Once you browse and book properties, your activity and analytics will appear here.</p>
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
    </div>
  );
}
