import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import {
  Home, Users, BarChart3, Download, LogOut, LayoutDashboard,
  ShieldCheck, FileText, TrendingUp, DollarSign, Handshake,
  AlertTriangle, CheckCircle2, Clock, Menu, X, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyDataPoint {
  month: string;
  rentals: number;
  sales: number;
  value: number;
}

interface TransactionAnalytics {
  total: number;
  confirmedRentals: number;
  confirmedSales: number;
  pending: number;
  disputed: number;
  outside: number;
  notCompleted: number;
  totalValue: number;
  avgRentalValue: number;
  avgSaleValue: number;
  highestRental: number;
  highestSale: number;
  linkUpSuccessRate: number;
  monthlyData: MonthlyDataPoint[];
}

interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  totalBookings: number;
  totalRevenue: number;
  pendingProperties: number;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS = ['#295b9d', '#d4a34b', '#10b981', '#ef4444', '#6366f1', '#f59e0b'];
const BRAND_BLUE = '#295b9d';
const BRAND_GOLD = '#d4a34b';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { token, logout } = useAuth();
  const { toast } = useToast();

  const [analytics, setAnalytics] = useState<TransactionAnalytics | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [txRes, statsRes] = await Promise.all([
        fetch('/api/transactions/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (txRes.ok) setAnalytics(await txRes.json());
      else toast({ title: 'Failed to load transaction analytics', variant: 'destructive' });

      if (statsRes.ok) setAdminStats(await statsRes.json());
      else toast({ title: 'Failed to load platform stats', variant: 'destructive' });
    } catch {
      toast({ title: 'Network error loading analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Export helpers ────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary
    const summary = [
      { Metric: 'Total Transactions', Value: analytics?.total ?? 0 },
      { Metric: 'Confirmed Rentals', Value: analytics?.confirmedRentals ?? 0 },
      { Metric: 'Confirmed Sales', Value: analytics?.confirmedSales ?? 0 },
      { Metric: 'Total Marketplace Value (PHP)', Value: analytics?.totalValue ?? 0 },
      { Metric: 'Avg Rental Value (PHP)', Value: analytics?.avgRentalValue ?? 0 },
      { Metric: 'Avg Sale Value (PHP)', Value: analytics?.avgSaleValue ?? 0 },
      { Metric: 'Link-Up Success Rate (%)', Value: analytics?.linkUpSuccessRate ?? 0 },
      { Metric: 'Pending Transactions', Value: analytics?.pending ?? 0 },
      { Metric: 'Disputed Transactions', Value: analytics?.disputed ?? 0 },
      { Metric: 'Total Users', Value: adminStats?.totalUsers ?? 0 },
      { Metric: 'Total Properties', Value: adminStats?.totalProperties ?? 0 },
      { Metric: 'Pending Review', Value: adminStats?.pendingProperties ?? 0 },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    // Monthly Trends
    const monthly = (analytics?.monthlyData ?? []).map(d => ({
      Month: d.month,
      'Confirmed Rentals': d.rentals,
      'Confirmed Sales': d.sales,
      'Marketplace Value (PHP)': d.value,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthly), 'Monthly Trends');

    XLSX.writeFile(wb, 'inndos_analytics_report.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('INNDOS — Analytics & Reports', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    const summary = [
      ['Confirmed Rentals', String(analytics?.confirmedRentals ?? 0)],
      ['Confirmed Sales', String(analytics?.confirmedSales ?? 0)],
      ['Total Marketplace Value', fmt(analytics?.totalValue ?? 0)],
      ['Avg Rental Value', fmt(analytics?.avgRentalValue ?? 0)],
      ['Avg Sale Value', fmt(analytics?.avgSaleValue ?? 0)],
      ['Link-Up Success Rate', `${analytics?.linkUpSuccessRate ?? 0}%`],
      ['Pending Transactions', String(analytics?.pending ?? 0)],
      ['Disputed Transactions', String(analytics?.disputed ?? 0)],
      ['Total Users', String(adminStats?.totalUsers ?? 0)],
      ['Total Properties', String(adminStats?.totalProperties ?? 0)],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: summary,
      theme: 'grid',
      headStyles: { fillColor: [41, 91, 157] },
    });

    const y1 = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Monthly Trends (Last 6 Months)', 14, y1);

    const monthRows = (analytics?.monthlyData ?? []).map(d => [
      d.month,
      String(d.rentals),
      String(d.sales),
      fmt(d.value),
    ]);

    autoTable(doc, {
      startY: y1 + 5,
      head: [['Month', 'Rentals', 'Sales', 'Value']],
      body: monthRows,
      theme: 'grid',
      headStyles: { fillColor: [41, 91, 157] },
    });

    doc.save('inndos_analytics_report.pdf');
  };

  // ─── Status pie data ───────────────────────────────────────────────────────

  const statusPieData = analytics
    ? [
        { name: 'Confirmed Rentals', value: analytics.confirmedRentals },
        { name: 'Confirmed Sales', value: analytics.confirmedSales },
        { name: 'Pending', value: analytics.pending },
        { name: 'Disputed', value: analytics.disputed },
        { name: 'Outside INNDOS', value: analytics.outside },
        { name: 'Not Completed', value: analytics.notCompleted },
      ].filter(d => d.value > 0)
    : [];

  // ─── Sidebar nav ───────────────────────────────────────────────────────────

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/#/admin' },
    { icon: Home, label: 'Properties', path: '/#/admin/properties' },
    { icon: Users, label: 'Users', path: '/#/admin/users' },
    { icon: Handshake, label: 'Transactions', path: '/#/admin/transactions' },
    { icon: ShieldCheck, label: 'Moderation', path: '/#/admin/moderation' },
    { icon: BarChart3, label: 'Analytics', path: '/#/admin/analytics', active: true },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`bg-white border-r w-64 flex-shrink-0 flex flex-col transition-transform duration-300 z-40 fixed md:relative h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="text-blue-700 font-bold text-2xl tracking-tighter flex items-center">
            INN<span className="text-amber-500">DOS</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 tracking-wider">ADMIN PANEL</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item, i) => (
              <a
                key={i}
                href={item.path}
                className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors ${
                  item.active
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${item.active ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t">
          <button
            className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            onClick={() => { logout(); setLocation('/'); }}
            data-testid="btn-signout"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 mt-8 md:mt-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-500 text-sm mt-1">Real-time data from your platform</p>
            </div>
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-50 flex-1 md:flex-none"
                onClick={handleExportExcel}
                disabled={loading || !analytics}
                data-testid="btn-export-excel"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                className="bg-white hover:bg-gray-50 flex-1 md:flex-none"
                onClick={handleExportPDF}
                disabled={loading || !analytics}
                data-testid="btn-export-pdf"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500 text-sm">Loading analytics…</span>
            </div>
          )}

          {!loading && analytics && (
            <>
              {/* KPI Cards — Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-blue-500 bg-blue-50 p-2 rounded-md">
                        <Home className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Rentals</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{analytics.confirmedRentals}</h3>
                    <p className="text-sm font-medium text-gray-600">Confirmed Rentals</p>
                    {analytics.avgRentalValue > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Avg {fmt(analytics.avgRentalValue)}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-amber-500 bg-amber-50 p-2 rounded-md">
                        <FileText className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Sales</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{analytics.confirmedSales}</h3>
                    <p className="text-sm font-medium text-gray-600">Confirmed Sales</p>
                    {analytics.avgSaleValue > 0 && (
                      <p className="text-xs text-gray-400 mt-1">Avg {fmt(analytics.avgSaleValue)}</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-emerald-500 bg-emerald-50 p-2 rounded-md">
                        <DollarSign className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 truncate">{fmt(analytics.totalValue)}</h3>
                    <p className="text-sm font-medium text-gray-600">Total Marketplace Value</p>
                    <p className="text-xs text-gray-400 mt-1">From confirmed transactions</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-indigo-500 bg-indigo-50 p-2 rounded-md">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{analytics.linkUpSuccessRate}%</h3>
                    <p className="text-sm font-medium text-gray-600">Link-Up Success Rate</p>
                    <p className="text-xs text-gray-400 mt-1">{analytics.confirmedRentals + analytics.confirmedSales} of {analytics.total} transactions</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-orange-500 bg-orange-50 p-2 rounded-md">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{analytics.pending}</h3>
                    <p className="text-sm font-medium text-gray-600">Pending Transactions</p>
                    <p className="text-xs text-gray-400 mt-1">Awaiting confirmation</p>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-red-500 bg-red-50 p-2 rounded-md">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-1">{analytics.disputed}</h3>
                    <p className="text-sm font-medium text-gray-600">Disputed Transactions</p>
                    <p className="text-xs text-gray-400 mt-1">Requires admin review</p>
                  </CardContent>
                </Card>
              </div>

              {/* Platform Stats strip */}
              {adminStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Users', value: adminStats.totalUsers, icon: Users },
                    { label: 'Total Properties', value: adminStats.totalProperties, icon: Home },
                    { label: 'Total Bookings', value: adminStats.totalBookings, icon: CheckCircle2 },
                    { label: 'Pending Review', value: adminStats.pendingProperties, icon: ShieldCheck },
                  ].map((s, i) => (
                    <Card key={i} className="shadow-sm border-gray-100">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="text-blue-500 bg-blue-50 p-2 rounded-md shrink-0">
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-gray-900">{s.value}</p>
                          <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Charts Row 1 — Monthly Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                      Monthly Transaction Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.monthlyData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                          <Bar dataKey="rentals" name="Rentals" fill={BRAND_BLUE} radius={[2, 2, 0, 0]} maxBarSize={30} />
                          <Bar dataKey="sales" name="Sales" fill={BRAND_GOLD} radius={[2, 2, 0, 0]} maxBarSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                      Monthly Marketplace Value (PHP)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: '#888' }}
                            tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(v: number) => [fmt(v), 'Value']}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Value"
                            stroke={BRAND_BLUE}
                            strokeWidth={2}
                            dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: BRAND_BLUE }}
                            activeDot={{ r: 6, fill: BRAND_BLUE }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row 2 — Status Breakdown + Value Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Status Pie */}
                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-800">Transaction Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {statusPieData.length === 0 ? (
                      <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">No transaction data yet</div>
                    ) : (
                      <div className="h-[280px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              labelLine={false}
                            >
                              {statusPieData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {/* Legend */}
                    <div className="mt-2 flex flex-wrap gap-2 justify-center">
                      {statusPieData.map((d, i) => (
                        <span key={i} className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="inline-block w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                          {d.name}: {d.value}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Value stats */}
                <Card className="shadow-sm border-gray-100 flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-800">Value Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center gap-4">
                    {[
                      { label: 'Avg Rental Value', value: analytics.avgRentalValue, color: 'blue' },
                      { label: 'Avg Sale Value', value: analytics.avgSaleValue, color: 'amber' },
                      { label: 'Highest Rental', value: analytics.highestRental, color: 'emerald' },
                      { label: 'Highest Sale', value: analytics.highestSale, color: 'indigo' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                        <span className="text-sm text-gray-600 font-medium">{s.label}</span>
                        <span className="text-sm font-bold text-gray-900">{s.value > 0 ? fmt(s.value) : '—'}</span>
                      </div>
                    ))}

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                        <div className="text-2xl font-bold text-blue-700">{analytics.confirmedRentals + analytics.confirmedSales}</div>
                        <div className="text-xs font-medium text-gray-600 mt-1">Total Confirmed</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-4 text-center border border-amber-100">
                        <div className="text-2xl font-bold text-amber-600">{analytics.total}</div>
                        <div className="text-xs font-medium text-gray-600 mt-1">Total Transactions</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!loading && !analytics && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <AlertTriangle className="h-10 w-10 mb-3" />
              <p className="text-sm">Could not load analytics data. Please refresh or check your connection.</p>
              <Button variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
