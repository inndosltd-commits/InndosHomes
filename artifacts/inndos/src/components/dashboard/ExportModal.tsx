import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileText, Sheet, Download, CheckSquare, Square } from "lucide-react";
import { exportPDF, exportExcel, ExportSheet, fmtDate, fmtMoney, fmtStatus } from "@/utils/exportUtils";

// ─── Dataset definitions ───────────────────────────────────────────────────────
type DatasetKey = "users" | "properties" | "linkups" | "transactions" | "subscriptions"
  | "my-listings" | "my-bookings" | "my-transactions";

interface DatasetOption {
  key: DatasetKey;
  label: string;
  description: string;
}

const ADMIN_DATASETS: DatasetOption[] = [
  { key: "users",         label: "All Users",          description: "Full user registry with roles and status" },
  { key: "properties",    label: "All Properties",     description: "Every listing on the platform" },
  { key: "linkups",       label: "All Link-Ups",       description: "All booking requests and confirmations" },
  { key: "transactions",  label: "All Transactions",   description: "Confirmed rentals and sales" },
  { key: "subscriptions", label: "All Subscriptions",  description: "Owner subscription history" },
];

const OWNER_DATASETS: DatasetOption[] = [
  { key: "my-listings",     label: "My Listings",          description: "All your property listings" },
  { key: "my-bookings",     label: "Bookings Received",    description: "Link-up requests on your properties" },
  { key: "my-transactions", label: "My Transactions",      description: "Confirmed rentals and sales" },
];

// ─── Data fetchers ─────────────────────────────────────────────────────────────
async function fetchDataset(key: DatasetKey, token: string): Promise<ExportSheet> {
  const h = { Authorization: `Bearer ${token}` };

  switch (key) {
    case "users": {
      const data = await fetch("/api/admin/users", { headers: h }).then(r => r.json());
      return {
        name: "All Users",
        columns: ["Name", "Email", "Role", "Status", "Phone", "Joined"],
        rows: data.map((u: any) => [u.name, u.email, fmtStatus(u.role), fmtStatus(u.status), u.phone || "—", fmtDate(u.joinDate)]),
      };
    }
    case "properties": {
      const data = await fetch("/api/properties", { headers: h }).then(r => r.json());
      return {
        name: "All Properties",
        columns: ["Title", "Type", "Address", "Price", "Status", "Verified", "Owner", "Listed"],
        rows: data.map((p: any) => [
          p.title, fmtStatus(p.type), p.address || "—",
          fmtMoney(p.price), fmtStatus(p.propertyStatus),
          p.isVerified ? "Yes" : "No", p.ownerName || "—", fmtDate(p.createdAt),
        ]),
      };
    }
    case "linkups": {
      const data = await fetch("/api/bookings/admin", { headers: h }).then(r => r.json());
      return {
        name: "All Link-Ups",
        columns: ["Status", "Property", "Type", "Guest", "Guest Email", "Owner", "Start", "End", "Price", "Booked"],
        rows: data.map((b: any) => [
          fmtStatus(b.status), b.propertyTitle || "—", fmtStatus(b.propertyType),
          b.guestName || "—", b.guestEmail || "—", b.ownerName || "—",
          fmtDate(b.startDate), fmtDate(b.endDate), fmtMoney(b.totalPrice), fmtDate(b.createdAt),
        ]),
      };
    }
    case "transactions": {
      const data = await fetch("/api/transactions/admin", { headers: h }).then(r => r.json());
      return {
        name: "All Transactions",
        columns: ["Status", "Type", "Property", "Owner", "Tenant", "Amount", "Date"],
        rows: data.map((t: any) => [
          fmtStatus(t.status), fmtStatus(t.type), t.propertyTitle || "—",
          t.ownerName || "—", t.tenantName || "—", fmtMoney(t.amount), fmtDate(t.createdAt),
        ]),
      };
    }
    case "subscriptions": {
      const data = await fetch("/api/admin/subscriptions", { headers: h }).then(r => r.json());
      return {
        name: "All Subscriptions",
        columns: ["User", "Email", "Plan", "Status", "Billing Cycle", "Amount Paid", "Start", "End"],
        rows: data.map((s: any) => [
          s.userName || "—", s.userEmail || "—", fmtStatus(s.plan),
          fmtStatus(s.status), fmtStatus(s.billingCycle),
          fmtMoney(s.amountPaid), fmtDate(s.startDate), fmtDate(s.endDate),
        ]),
      };
    }
    case "my-listings": {
      const me = await fetch("/api/auth/me", { headers: h }).then(r => r.json());
      const data = await fetch(`/api/properties?ownerId=${me.id}`, { headers: h }).then(r => r.json());
      return {
        name: "My Listings",
        columns: ["Title", "Type", "Address", "Price", "Status", "Verified", "Listed"],
        rows: data.map((p: any) => [
          p.title, fmtStatus(p.type), p.address || "—",
          fmtMoney(p.price), fmtStatus(p.propertyStatus),
          p.isVerified ? "Yes" : "No", fmtDate(p.createdAt),
        ]),
      };
    }
    case "my-bookings": {
      const data = await fetch("/api/bookings/received", { headers: h }).then(r => r.json());
      return {
        name: "Bookings Received",
        columns: ["Status", "Property", "Guest", "Start", "End", "Price", "Booked"],
        rows: data.map((b: any) => [
          fmtStatus(b.status), b.propertyTitle || "—", b.guestName || "—",
          fmtDate(b.startDate), fmtDate(b.endDate), fmtMoney(b.totalPrice), fmtDate(b.createdAt),
        ]),
      };
    }
    case "my-transactions": {
      const data = await fetch("/api/transactions", { headers: h }).then(r => r.json());
      return {
        name: "My Transactions",
        columns: ["Status", "Type", "Property", "Amount", "Date"],
        rows: data.map((t: any) => [
          fmtStatus(t.status), fmtStatus(t.type), t.propertyTitle || t.propertyId || "—",
          fmtMoney(t.amount), fmtDate(t.createdAt),
        ]),
      };
    }
    default:
      return { name: "Unknown", columns: [], rows: [] };
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  token: string;
  role: "admin" | "owner";
}

export function ExportModal({ open, onClose, token, role }: ExportModalProps) {
  const datasets = role === "admin" ? ADMIN_DATASETS : OWNER_DATASETS;
  const [selected, setSelected] = useState<Set<DatasetKey>>(new Set(datasets.map(d => d.key)));
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  const allSelected = selected.size === datasets.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(datasets.map(d => d.key)));
  const toggle = (key: DatasetKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleDownload = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const keys = datasets.filter(d => selected.has(d.key)).map(d => d.key);
      const sheets: ExportSheet[] = [];
      for (const key of keys) {
        setProgress(`Fetching ${datasets.find(d => d.key === key)?.label}…`);
        const sheet = await fetchDataset(key, token);
        sheets.push(sheet);
      }
      setProgress("Generating file…");
      const reportTitle = role === "admin" ? "Platform Report" : "Owner Report";
      if (format === "pdf") exportPDF(reportTitle, sheets);
      else exportExcel(reportTitle, sheets);
      onClose();
    } catch (e) {
      console.error(e);
      setProgress("Error generating report. Please try again.");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Report
          </DialogTitle>
          <DialogDescription>
            Choose format and which data to include. A branded file will download automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Format toggle */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Format</p>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat("pdf")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                format === "pdf"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              onClick={() => setFormat("excel")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                format === "excel"
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Sheet className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>

        {/* Data sections */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Include</p>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              {allSelected
                ? <><CheckSquare className="h-3.5 w-3.5" /> Deselect all</>
                : <><Square className="h-3.5 w-3.5" /> Select all</>
              }
            </button>
          </div>
          <div className="space-y-2">
            {datasets.map(d => (
              <label
                key={d.key}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-zinc-300 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.has(d.key)}
                  onCheckedChange={() => toggle(d.key)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Combined download note */}
        {selected.size > 1 && (
          <p className="text-xs text-gray-500 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
            {selected.size} sections will be combined into one {format === "pdf" ? "PDF" : "Excel workbook"} with separate {format === "pdf" ? "pages" : "sheets"} per dataset.
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={loading || selected.size === 0}
            className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress || "Generating…"}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {format === "pdf" ? "PDF" : "Excel"}
                {selected.size > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">
                    {selected.size}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
