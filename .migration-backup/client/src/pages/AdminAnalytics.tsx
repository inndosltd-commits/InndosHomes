import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';
import { 
  Users, Briefcase, FileText, Building2, Download, LogOut, 
  LayoutDashboard, FileEdit, MessageSquare, UserCog, Settings, 
  Database, BarChart3, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'wouter';

// Mock Data
const monthlyOverviewData = [
  { name: 'Nov 25', jobs: 2, applications: 0 },
  { name: 'Dec 25', jobs: 0, applications: 0 },
  { name: 'Jan 26', jobs: 2, applications: 0 },
  { name: 'Feb 26', jobs: 1, applications: 0 },
  { name: 'Mar 26', jobs: 0, applications: 0 },
  { name: 'Apr 26', jobs: 3, applications: 1 },
];

const newUsersData = [
  { name: 'Nov 25', users: 0 },
  { name: 'Dec 25', users: 0 },
  { name: 'Jan 26', users: 0 },
  { name: 'Feb 26', users: 0 },
  { name: 'Mar 26', users: 0 },
  { name: 'Apr 26', users: 5 },
];

const jobsByCategoryData = [
  { name: 'Uncategorized', value: 2 },
  { name: 'Sales', value: 2 },
  { name: 'Marketing', value: 1 },
  { name: 'Human Resources', value: 1 },
  { name: 'IT', value: 1 },
  { name: 'Operations', value: 1 },
];

const jobsByTypeData = [
  { name: 'Full-time', jobs: 7 },
  { name: 'Contract', jobs: 1 },
];

const exportData = {
  summary: [
    { metric: 'Total Users', value: 5, details: '2 seekers, 3 employers' },
    { metric: 'Jobs Posted (This Month)', value: 3, details: '8 total, 0 pending' },
    { metric: 'Applications (This Month)', value: 1, details: '1 total' },
    { metric: 'Active Employers', value: 3, details: '8 active jobs' },
  ],
  monthlyOverview: monthlyOverviewData,
  jobsByCategory: jobsByCategoryData,
  jobsByType: jobsByTypeData
};

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const wsSummary = XLSX.utils.json_to_sheet(exportData.summary);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    
    // Monthly Overview Sheet
    const wsMonthly = XLSX.utils.json_to_sheet(exportData.monthlyOverview);
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Overview");
    
    // Jobs By Category Sheet
    const wsCategory = XLSX.utils.json_to_sheet(exportData.jobsByCategory);
    XLSX.utils.book_append_sheet(wb, wsCategory, "Jobs By Category");
    
    XLSX.writeFile(wb, "analytics_report.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Analytics & Reports", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Generated on: \${new Date().toLocaleDateString()}`, 14, 30);
    
    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value', 'Details']],
      body: exportData.summary.map(item => [item.metric, item.value, item.details]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    
    doc.text("Monthly Overview", 14, finalY + 15);
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Month', 'Jobs', 'Applications']],
      body: exportData.monthlyOverview.map(item => [item.name, item.jobs, item.applications]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save("analytics_report.pdf");
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Mobile sidebar toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`bg-white border-r w-64 flex-shrink-0 flex flex-col transition-transform duration-300 z-40 fixed md:relative h-full \${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="p-6 border-b flex items-center space-x-3">
          <div className="text-blue-700 font-bold text-2xl tracking-tighter flex items-center">
            RS<span className="text-red-500">HR</span>
          </div>
          <span className="text-xs font-semibold text-gray-500 tracking-wider">ADMIN PANEL</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {[
              { icon: LayoutDashboard, label: 'Dashboard' },
              { icon: FileEdit, label: 'Blog Posts' },
              { icon: Briefcase, label: 'Job Vacancies' },
              { icon: FileText, label: 'Applications' },
              { icon: MessageSquare, label: 'Contact Inquiries' },
              { icon: Users, label: 'Users' },
              { icon: BarChart3, label: 'Analytics', active: true },
              { icon: Settings, label: 'Content Management' },
              { icon: Database, label: 'Seed Database' },
            ].map((item, i) => (
              <a
                key={i}
                href="#"
                className={`flex items-center px-4 py-3 text-sm rounded-md transition-colors \${
                  item.active 
                    ? 'bg-blue-600 text-white font-medium shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={(e) => e.preventDefault()}
                data-testid={`nav-\${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className={`mr-3 h-5 w-5 \${item.active ? 'text-white' : 'text-gray-400'}`} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium text-sm">
              a
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">admin</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
          <button 
            className="flex items-center w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            onClick={() => setLocation('/')}
            data-testid="btn-signout"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
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
                data-testid="btn-export-excel"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button 
                variant="outline" 
                className="bg-white hover:bg-gray-50 flex-1 md:flex-none"
                onClick={handleExportPDF}
                data-testid="btn-export-pdf"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-500 bg-blue-50 p-2 rounded-md">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">5</h3>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-xs text-gray-400 mt-1">2 seekers · 3 employers</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-500 bg-blue-50 p-2 rounded-md">
                    <Briefcase className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">3</h3>
                  <p className="text-sm font-medium text-gray-600">Jobs Posted (This Month)</p>
                  <p className="text-xs text-gray-400 mt-1">8 total · 0 pending</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-500 bg-blue-50 p-2 rounded-md">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">1</h3>
                  <p className="text-sm font-medium text-gray-600">Applications (This Month)</p>
                  <p className="text-xs text-gray-400 mt-1">1 total</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-500 bg-blue-50 p-2 rounded-md">
                    <Building2 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">3</h3>
                  <p className="text-sm font-medium text-gray-600">Active Employers</p>
                  <p className="text-xs text-gray-400 mt-1">8 active jobs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Monthly Overview — Jobs & Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyOverviewData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Bar dataKey="jobs" name="Jobs Posted" fill="#295b9d" radius={[2, 2, 0, 0]} maxBarSize={30} />
                      <Bar dataKey="applications" name="Applications" fill="#d4a34b" radius={[2, 2, 0, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  New User Registrations (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={newUsersData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="users" 
                        name="New Users" 
                        stroke="#295b9d" 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, fill: '#295b9d' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Jobs by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={jobsByCategoryData} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                      <XAxis type="number" axisLine={true} tickLine={true} tick={{ fontSize: 12, fill: '#888' }} tickCount={5} domain={[0, 4]} />
                      <YAxis dataKey="name" type="category" axisLine={true} tickLine={true} tick={{ fontSize: 11, fill: '#555' }} width={90} />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" name="Jobs" radius={[0, 2, 2, 0]} maxBarSize={30}>
                        {jobsByCategoryData.map((entry, index) => {
                          const colors = ['#295b9d', '#d4a34b', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                          return <Cell key={`cell-\${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-gray-100 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-800">Jobs by Type & User Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="h-[200px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobsByTypeData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} domain={[0, 8]} />
                      <Tooltip 
                        cursor={{ fill: '#f9fafb' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="jobs" name="Jobs" radius={[2, 2, 0, 0]} maxBarSize={60}>
                        {jobsByTypeData.map((entry, index) => (
                          <Cell key={`cell-\${index}`} fill={index === 0 ? '#295b9d' : '#d4a34b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-auto pt-6">
                  <div className="bg-blue-50/50 rounded-lg p-4 text-center border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">2</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Job Seekers</div>
                  </div>
                  <div className="bg-amber-50/50 rounded-lg p-4 text-center border border-amber-100">
                    <div className="text-2xl font-bold text-amber-600">3</div>
                    <div className="text-sm font-medium text-gray-600 mt-1">Employers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </main>
    </div>
  );
}
