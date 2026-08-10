import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/lib/auth';
import { PROPERTIES } from '@/lib/mockData';

export function Analytics() {
  const { user } = useAuth();
  
  // Real data calculations based on mock data
  const isOwner = user?.role === 'owner' || user?.role === 'host';
  const isAdmin = user?.role === 'admin';
  
  const relevantProperties = isOwner 
    ? PROPERTIES.filter(p => p.ownerId === user?.id)
    : PROPERTIES;

  const totalProperties = relevantProperties.length;
  const totalRentals = relevantProperties.filter(p => p.type === 'rent').length;
  const totalBnbs = relevantProperties.filter(p => p.type === 'bnb').length;
  
  // Mock monthly data (in a real app, this would come from an API based on booking history)
  const monthlyData = [
    { name: 'Jan', views: 120, inquiries: 12, bookings: 2 },
    { name: 'Feb', views: 150, inquiries: 15, bookings: 3 },
    { name: 'Mar', views: 180, inquiries: 22, bookings: 5 },
    { name: 'Apr', views: 220, inquiries: 28, bookings: 8 },
    { name: 'May', views: 270, inquiries: 35, bookings: 12 },
    { name: 'Jun', views: 310, inquiries: 42, bookings: 18 },
  ];

  const propertyTypeData = [
    { name: 'Rentals', value: totalRentals },
    { name: 'B&Bs', value: totalBnbs },
    { name: 'Sale', value: relevantProperties.filter(p => p.type === 'sale').length },
    { name: 'Hotels/Hostels', value: relevantProperties.filter(p => ['hotel', 'hostel'].includes(p.type)).length }
  ].filter(d => d.value > 0);

  const COLORS = ['#295b9d', '#d4a34b', '#10b981', '#8b5cf6'];

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet([
      { Metric: 'Total Properties', Value: totalProperties },
      { Metric: 'Total Rentals', Value: totalRentals },
      { Metric: 'Total B&Bs', Value: totalBnbs },
      { Metric: 'Total Views (6mo)', Value: monthlyData.reduce((acc, curr) => acc + curr.views, 0) },
      { Metric: 'Total Bookings (6mo)', Value: monthlyData.reduce((acc, curr) => acc + curr.bookings, 0) }
    ]);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    
    const wsMonthly = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Monthly Trends");
    
    XLSX.writeFile(wb, `${isAdmin ? 'platform' : 'my'}_analytics_report.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Analytics & Reports", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Scope: ${isAdmin ? 'Platform Wide' : 'My Properties'}`, 14, 36);
    
    autoTable(doc, {
      startY: 45,
      head: [['Metric', 'Value']],
      body: [
        ['Total Properties', totalProperties],
        ['Total Rentals', totalRentals],
        ['Total B&Bs', totalBnbs],
        ['Total Views (6mo)', monthlyData.reduce((acc, curr) => acc + curr.views, 0)],
        ['Total Bookings (6mo)', monthlyData.reduce((acc, curr) => acc + curr.bookings, 0)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.text("Monthly Trends", 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Month', 'Views', 'Inquiries', 'Bookings']],
      body: monthlyData.map(item => [item.name, item.views, item.inquiries, item.bookings]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`${isAdmin ? 'platform' : 'my'}_analytics_report.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">Analytics & Reports</h2>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? 'Platform-wide performance metrics' : 'Performance metrics for your listings'}
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-muted-foreground" />
              Engagement Trends (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="views" name="Views" stroke="#295b9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="inquiries" name="Inquiries" stroke="#d4a34b" strokeWidth={2} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Bookings vs Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="inquiries" name="Inquiries" fill="#295b9d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" name="Bookings" fill="#d4a34b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex justify-center">
              {propertyTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={propertyTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {propertyTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No property data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 h-full content-center">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                <div className="text-3xl font-bold text-gray-900">{totalProperties}</div>
                <div className="text-sm font-medium text-gray-600 mt-1">Total Properties</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-center">
                <div className="text-3xl font-bold text-amber-700">
                  {monthlyData.reduce((acc, curr) => acc + curr.bookings, 0)}
                </div>
                <div className="text-sm font-medium text-amber-600 mt-1">Total Bookings (6mo)</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <div className="text-3xl font-bold text-gray-700">
                  {monthlyData.reduce((acc, curr) => acc + curr.views, 0)}
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">Total Views (6mo)</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-center">
                <div className="text-3xl font-bold text-gray-700">
                  {(monthlyData.reduce((acc, curr) => acc + curr.bookings, 0) / monthlyData.reduce((acc, curr) => acc + curr.inquiries, 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm font-medium text-gray-600 mt-1">Conversion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
