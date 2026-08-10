import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Users, Home, TrendingUp, TrendingDown, DollarSign, Star, Heart, Calendar,
  BarChart3, CheckCircle, XCircle, Clock, AlertTriangle, Crown, Loader2,
  Download, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Lightbulb, ShieldCheck
} from "lucide-react";

interface AdminStats {
  totalUsers: number; activeUsers: number; suspendedUsers: number;
  newUsersToday: number; newUsersThisWeek: number; newUsersThisMonth: number;
  usersByRole: { owner: number; host: number; tenant: number; guest: number };
  totalProperties: number; activeProperties: number; pendingProperties: number;
  soldProperties: number; flaggedProperties: number;
  propertiesByType: { rent: number; sale: number; bnb: number; hotel: number; hostel: number };
  totalBookings: number; confirmedBookings: number; cancelledBookings: number; pendingBookings: number;
  totalRevenue: number; activeSubscriptions: number; expiredSubscriptions: number; cancelledSubscriptions: number;
  subscriptionsByPlan: { free: number; basic: number; pro: number; enterprise: number };
  totalPaymentRevenue: number; totalFavorites: number;
  confirmedRentals: number; confirmedSales: number; totalMarketplaceValue: number;
  monthlyRegistrations: { month: string; count: number }[];
  monthlyProperties: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  monthlyBookings: { month: string; count: number }[];
}

interface TxAnalytics {
  total: number; confirmedRentals: number; confirmedSales: number; pending: number; disputed: number;
  totalValue: number; avgRentalValue: number; avgSaleValue: number;
  highestRental: number; highestSale: number; linkUpSuccessRate: number;
  monthlyData: { month: string; rentals: number; sales: number; value: number }[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function money(n: number) {
  return `KES ${n.toLocaleString()}`;
}

const COLORS = ["#18181b", "#52525b", "#a1a1aa", "#d4d4d8", "#f4f4f5"];
const PIE_COLORS = ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#d4d4d8"];

interface KpiCardProps {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: "up" | "down" | "neutral"; badge?: string;
}
function KpiCard({ icon, label, value, sub, trend, badge }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-700">{icon}</div>
          {badge && <Badge variant="outline" className="text-[10px] h-5">{badge}</Badge>}
          {trend === "up" && <ArrowUpRight className="h-4 w-4 text-green-500" />}
          {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
          {trend === "neutral" && <Minus className="h-4 w-4 text-gray-400" />}
        </div>
        <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? fmt(value) : value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsDashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [tx, setTx] = useState<TxAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateRange, setDateRange] = useState("30d");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [s, t] = await Promise.all([
        fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch("/api/transactions/admin/analytics", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setStats(s); setTx(t);
    } catch {
      setError("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleExportCSV = () => {
    if (!stats) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", stats.totalUsers],
      ["Active Users", stats.activeUsers],
      ["New This Month", stats.newUsersThisMonth],
      ["Total Properties", stats.totalProperties],
      ["Active Properties", stats.activeProperties],
      ["Confirmed Bookings", stats.confirmedBookings],
      ["Total Revenue (KES)", stats.totalRevenue],
      ["Active Subscriptions", stats.activeSubscriptions],
      ["Confirmed Rentals", stats.confirmedRentals],
      ["Confirmed Sales", stats.confirmedSales],
      ["Marketplace Value (KES)", stats.totalMarketplaceValue],
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "inndos-analytics.csv"; a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  );
  if (error) return (
    <div className="flex items-center justify-center py-20 text-red-500">{error}</div>
  );
  if (!stats) return null;

  const userRoleData = [
    { name: "Owners", value: stats.usersByRole.owner },
    { name: "Hosts", value: stats.usersByRole.host },
    { name: "Tenants", value: stats.usersByRole.tenant },
    { name: "Guests", value: stats.usersByRole.guest },
  ].filter(d => d.value > 0);

  const propTypeData = [
    { name: "Rent", value: stats.propertiesByType.rent },
    { name: "Sale", value: stats.propertiesByType.sale },
    { name: "B&B", value: stats.propertiesByType.bnb },
    { name: "Hotel", value: stats.propertiesByType.hotel },
    { name: "Hostel", value: stats.propertiesByType.hostel },
  ].filter(d => d.value > 0);

  const subsData = [
    { name: "Free", value: stats.subscriptionsByPlan.free },
    { name: "Basic", value: stats.subscriptionsByPlan.basic },
    { name: "Pro", value: stats.subscriptionsByPlan.pro },
    { name: "Enterprise", value: stats.subscriptionsByPlan.enterprise },
  ].filter(d => d.value > 0);

  const bookingStatusData = [
    { name: "Confirmed", value: stats.confirmedBookings },
    { name: "Pending", value: stats.pendingBookings },
    { name: "Cancelled", value: stats.cancelledBookings },
  ].filter(d => d.value > 0);

  // Smart insights
  const insights: string[] = [];
  if (stats.newUsersThisMonth > 0) insights.push(`${stats.newUsersThisMonth} new users joined this month.`);
  if (stats.confirmedBookings > 0 && stats.totalBookings > 0) {
    const rate = Math.round((stats.confirmedBookings / stats.totalBookings) * 100);
    insights.push(`Booking confirmation rate is ${rate}%.`);
  }
  if (tx && tx.linkUpSuccessRate > 0) insights.push(`Link-Up success rate: ${tx.linkUpSuccessRate}%.`);
  if (stats.activeProperties > 0 && stats.totalProperties > 0) {
    const activeRate = Math.round((stats.activeProperties / stats.totalProperties) * 100);
    insights.push(`${activeRate}% of listings are currently active and approved.`);
  }
  if (stats.pendingProperties > 0) insights.push(`${stats.pendingProperties} propert${stats.pendingProperties === 1 ? "y" : "ies"} awaiting your review.`);
  if (stats.propertiesByType.rent > stats.propertiesByType.sale) insights.push("Rental properties outnumber sale listings — high demand for rentals.");

  // Conversion funnel
  const funnelData = [
    { stage: "Registered Users", value: stats.totalUsers },
    { stage: "Active Listings Viewed", value: stats.totalBookings * 5 },
    { stage: "Bookings Made", value: stats.totalBookings },
    { stage: "Link-Ups Confirmed", value: stats.confirmedBookings },
    { stage: "Transactions Done", value: (stats.confirmedRentals + stats.confirmedSales) },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
          <p className="text-sm text-gray-500">Real-time overview of the entire inndos platform</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Section: Platform Growth */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Platform Growth</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Users className="h-5 w-5" />} label="Total Users" value={stats.totalUsers} trend="up" />
          <KpiCard icon={<Users className="h-5 w-5" />} label="Active Users" value={stats.activeUsers} sub={`${stats.suspendedUsers} suspended`} />
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="New This Month" value={stats.newUsersThisMonth} sub={`${stats.newUsersThisWeek} this week · ${stats.newUsersToday} today`} trend="up" />
          <KpiCard icon={<Users className="h-5 w-5" />} label="Owners & Hosts" value={stats.usersByRole.owner + stats.usersByRole.host} sub={`${stats.usersByRole.tenant + stats.usersByRole.guest} tenants/guests`} />
        </div>
      </div>

      {/* Section: Property Analytics */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Property Analytics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Home className="h-5 w-5" />} label="Total Listings" value={stats.totalProperties} />
          <KpiCard icon={<CheckCircle className="h-5 w-5" />} label="Active Listings" value={stats.activeProperties} badge="Live" trend="up" />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="Pending Approval" value={stats.pendingProperties} badge="Action needed" />
          <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="Sold Properties" value={stats.soldProperties} sub={`${stats.flaggedProperties} flagged`} />
        </div>
      </div>

      {/* Section: Bookings & Revenue */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Bookings & Revenue</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Calendar className="h-5 w-5" />} label="Total Bookings" value={stats.totalBookings} />
          <KpiCard icon={<CheckCircle className="h-5 w-5" />} label="Confirmed Link-Ups" value={stats.confirmedBookings} trend="up" />
          <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Platform Revenue" value={money(stats.totalRevenue)} sub="From confirmed bookings" trend="up" />
          <KpiCard icon={<DollarSign className="h-5 w-5" />} label="Marketplace Value" value={money(stats.totalMarketplaceValue)} sub="Confirmed transactions" trend="up" />
        </div>
      </div>

      {/* Section: Subscriptions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Subscriptions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Crown className="h-5 w-5" />} label="Active Subscriptions" value={stats.activeSubscriptions} trend="up" />
          <KpiCard icon={<XCircle className="h-5 w-5" />} label="Expired" value={stats.expiredSubscriptions} />
          <KpiCard icon={<Heart className="h-5 w-5" />} label="Total Favorites" value={stats.totalFavorites} />
          <KpiCard icon={<Star className="h-5 w-5" />} label="Confirmed Transactions" value={stats.confirmedRentals + stats.confirmedSales} sub={`${stats.confirmedRentals} rentals · ${stats.confirmedSales} sales`} />
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly User Registrations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Registrations (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyRegistrations.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats.monthlyRegistrations}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="New Users" stroke="#18181b" fill="url(#regGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No registration data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Properties by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Listings by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {propTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={propTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {propTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} listings`]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No property data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Bookings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Bookings (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyBookings.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Bookings" fill="#18181b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No booking data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Plan Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Subscriptions by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {subsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={subsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="value" name="Subscribers" fill="#3f3f46" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No subscription data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Role Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {userRoleData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={userRoleData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {userRoleData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No user data yet</div>
            )}
          </CardContent>
        </Card>

        {/* Booking Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booking Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={bookingStatusData} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {bookingStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No booking data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Trends (from tx analytics) */}
      {tx && tx.monthlyData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Rental vs Sale Transactions (6 months)</CardTitle>
            <CardDescription>Confirmed transactions by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={tx.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="rentals" name="Rentals" fill="#18181b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="sales" name="Sales" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platform Conversion Funnel</CardTitle>
          <CardDescription>From registrations to confirmed transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((step, i) => {
              const pct = funnelData[0]!.value > 0 ? Math.round((step.value / funnelData[0]!.value) * 100) : 0;
              return (
                <div key={step.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{step.stage}</span>
                    <span className="text-gray-500">{fmt(step.value)} {i > 0 && <span className="text-xs ml-1">({pct}%)</span>}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-zinc-800 h-2 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Moderation Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Moderation & Platform Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "Pending Review", value: stats.pendingProperties, color: "text-amber-600" },
              { label: "Flagged Listings", value: stats.flaggedProperties, color: "text-red-500" },
              { label: "Sold Properties", value: stats.soldProperties, color: "text-green-600" },
              { label: "Suspended Users", value: stats.suspendedUsers, color: "text-red-400" },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-gray-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <Card className="border-zinc-200 bg-zinc-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-zinc-700" /> Smart Insights
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
