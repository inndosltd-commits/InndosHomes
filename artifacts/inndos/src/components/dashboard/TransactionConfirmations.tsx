/**
 * TransactionConfirmations
 * Shows pending transaction confirmation prompts, history, and analytics
 * for owners, tenants/guests, and admins.
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertTriangle, Clock, TrendingUp, Home, DollarSign, ShieldCheck, Loader2, RefreshCw, Search } from "lucide-react";

type TxStatus =
  | "pending_confirmation"
  | "confirmed_by_owner_only"
  | "confirmed_by_tenant_only"
  | "fully_confirmed"
  | "disputed"
  | "cancelled"
  | "not_completed"
  | "confirmed_outside_inndos"
  | "sold_via_inndos"
  | "rented_via_inndos";

interface Transaction {
  id: string;
  bookingId: string | null;
  propertyId: string;
  ownerId: string;
  tenantId: string;
  transactionType: "rental" | "sale";
  propertyTitle: string;
  propertyAddress: string | null;
  transactionValue: number | null;
  ownerConfirmation: string;
  tenantConfirmation: string;
  status: TxStatus;
  ownerConfirmedAt: string | null;
  tenantConfirmedAt: string | null;
  adminNotes: string | null;
  adminResolvedBy: string | null;
  createdAt: string;
  // admin-only enrichments
  ownerName?: string;
  tenantName?: string;
}

interface Analytics {
  total: number;
  fullyConfirmed: number;
  pending: number;
  disputed: number;
  confirmedRentals: number;
  confirmedSales: number;
  totalValue: number;
  monthlyData: { month: string; rentals: number; sales: number; value: number }[];
  // admin-only
  linkUpSuccessRate?: number;
  avgRentalValue?: number;
  avgSaleValue?: number;
  highestRental?: number;
  highestSale?: number;
  outside?: number;
  notCompleted?: number;
}

interface Props {
  userId: string;
  userRole: "owner" | "host" | "tenant" | "guest" | "admin";
  token: string | null;
  /** If compact=true, only shows pending prompts (no analytics). Used in Overview tab. */
  compact?: boolean;
}

const STATUS_LABEL: Record<TxStatus, string> = {
  pending_confirmation: "Pending Confirmation",
  confirmed_by_owner_only: "Owner Confirmed — Awaiting Tenant",
  confirmed_by_tenant_only: "Tenant Confirmed — Awaiting Owner",
  fully_confirmed: "Fully Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  not_completed: "Not Completed",
  confirmed_outside_inndos: "Confirmed Outside inndos",
  sold_via_inndos: "Sold via inndos ✓",
  rented_via_inndos: "Rented via inndos ✓",
};

const STATUS_COLOR: Record<TxStatus, string> = {
  pending_confirmation: "bg-gray-100 text-gray-800 border-gray-200",
  confirmed_by_owner_only: "bg-gray-100 text-gray-800 border-gray-200",
  confirmed_by_tenant_only: "bg-gray-100 text-gray-800 border-gray-200",
  fully_confirmed: "bg-gray-100 text-gray-800 border-gray-200",
  disputed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
  not_completed: "bg-gray-100 text-gray-800 border-gray-300",
  confirmed_outside_inndos: "bg-gray-100 text-gray-700 border-gray-200",
  sold_via_inndos: "bg-gray-100 text-gray-800 border-gray-200",
  rented_via_inndos: "bg-gray-100 text-gray-800 border-gray-200",
};

const PENDING_STATUSES: TxStatus[] = [
  "pending_confirmation",
  "confirmed_by_owner_only",
  "confirmed_by_tenant_only",
  "disputed",
];

function isPendingForUser(tx: Transaction, userId: string): boolean {
  if (tx.ownerId === userId && tx.ownerConfirmation === "pending") return true;
  if (tx.tenantId === userId && tx.tenantConfirmation === "pending") return true;
  return false;
}

export function TransactionConfirmations({ userId, userRole, token, compact = false }: Props) {
  const { toast } = useToast();
  const isAdmin = userRole === "admin";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ tx: Transaction } | null>(null);
  const [resolveDialog, setResolveDialog] = useState<{ tx: Transaction } | null>(null);
  const [resolveStatus, setResolveStatus] = useState<TxStatus>("rented_via_inndos");
  const [resolveNotes, setResolveNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [txRes, analyticsRes] = await Promise.all([
        fetch(isAdmin ? "/api/transactions/admin" : "/api/transactions", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(isAdmin ? "/api/transactions/admin/analytics" : "/api/transactions/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (txRes.ok) setTransactions(await txRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [token, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirm = async (tx: Transaction, choice: "confirmed" | "not_completed" | "outside_inndos") => {
    if (!token) return;
    setConfirmingId(tx.id);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: choice }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({
        title: "Confirmation submitted",
        description: choice === "confirmed"
          ? "You confirmed this transaction was completed via inndos."
          : choice === "outside_inndos"
          ? "Recorded as completed outside inndos."
          : "Recorded as not completed.",
      });
      setConfirmDialog(null);
      await fetchData();
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAdminResolve = async () => {
    if (!resolveDialog || !token) return;
    setIsResolving(true);
    try {
      const res = await fetch(`/api/transactions/admin/${resolveDialog.tx.id}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: resolveStatus, adminNotes: resolveNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Transaction resolved", description: `Status updated to: ${STATUS_LABEL[resolveStatus]}` });
      setResolveDialog(null);
      setResolveNotes("");
      await fetchData();
    } catch {
      toast({ title: "Failed to resolve", variant: "destructive" });
    } finally {
      setIsResolving(false);
    }
  };

  const txQ = txSearch.toLowerCase();
  const pendingTxs = (isAdmin
    ? transactions.filter(tx => PENDING_STATUSES.includes(tx.status))
    : transactions.filter(tx => isPendingForUser(tx, userId)))
    .filter(tx => !txSearch || (tx.propertyTitle ?? "").toLowerCase().includes(txQ) || (tx.ownerName ?? "").toLowerCase().includes(txQ) || (tx.tenantName ?? "").toLowerCase().includes(txQ))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  const historyTxs = (isAdmin
    ? transactions.filter(tx => !PENDING_STATUSES.includes(tx.status))
    : transactions.filter(tx => !isPendingForUser(tx, userId)))
    .filter(tx => !txSearch || (tx.propertyTitle ?? "").toLowerCase().includes(txQ) || (tx.ownerName ?? "").toLowerCase().includes(txQ) || (tx.tenantName ?? "").toLowerCase().includes(txQ))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d < 1) return "today";
    if (d === 1) return "1 day ago";
    return `${d} days ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading transactions…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Analytics Summary (skip in compact mode) ── */}
      {!compact && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Confirmed Rentals</p>
              <p className="text-2xl font-bold">{analytics.confirmedRentals}</p>
              <p className="text-xs text-gray-600 mt-0.5">Rented via inndos</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Confirmed Sales</p>
              <p className="text-2xl font-bold">{analytics.confirmedSales}</p>
              <p className="text-xs text-gray-600 mt-0.5">Sold via inndos</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-2xl font-bold">{analytics.pending}</p>
              <p className="text-xs text-gray-700 mt-0.5">Awaiting confirmation</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Value</p>
              <p className="text-2xl font-bold">KES {(analytics.totalValue || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Confirmed transactions</p>
            </CardContent>
          </Card>
          {isAdmin && analytics.linkUpSuccessRate !== undefined && (
            <>
              <Card className="bg-white border-l-4 border-l-indigo-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Link-Up Success Rate</p>
                  <p className="text-2xl font-bold">{analytics.linkUpSuccessRate}%</p>
                  <p className="text-xs text-indigo-600 mt-0.5">Fully confirmed / total</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-teal-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Avg Rental Value</p>
                  <p className="text-2xl font-bold">KES {(analytics.avgRentalValue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-rose-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Avg Sale Value</p>
                  <p className="text-2xl font-bold">KES {(analytics.avgSaleValue || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Disputed</p>
                  <p className="text-2xl font-bold">{analytics.disputed}</p>
                  <p className="text-xs text-gray-700 mt-0.5">Needs admin review</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── Pending Confirmations ── */}
      <Card className={pendingTxs.length > 0 ? "border-yellow-300 bg-yellow-50/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-gray-600" />
                {isAdmin ? "Pending / Disputed Transactions" : "Action Required: Confirm Your Transactions"}
                {pendingTxs.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-yellow-500 text-white text-[11px] font-bold">
                    {pendingTxs.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-0.5">
                {isAdmin
                  ? "Transactions awaiting resolution or admin review"
                  : "Please confirm whether these rentals or sales were completed via inndos"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData} className="gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" value={txSearch} onChange={e => setTxSearch(e.target.value)} placeholder="Search by property, owner or tenant…" className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-800 bg-white" />
          </div>
        </CardHeader>
        <CardContent>
          {pendingTxs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-white rounded-lg border border-dashed">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No pending confirmations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTxs.map(tx => {
                const myTurn = isPendingForUser(tx, userId) && !isAdmin;
                return (
                  <div
                    key={tx.id}
                    className={`p-4 rounded-lg border bg-white shadow-sm ${myTurn ? "border-yellow-400 ring-1 ring-yellow-200" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm truncate">{tx.propertyTitle}</p>
                          <Badge variant="outline" className={`text-[10px] h-4 border ${STATUS_COLOR[tx.status]}`}>
                            {STATUS_LABEL[tx.status]}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] h-4 capitalize">
                            {tx.transactionType}
                          </Badge>
                        </div>
                        {tx.propertyAddress && (
                          <p className="text-xs text-muted-foreground mt-0.5">{tx.propertyAddress}</p>
                        )}
                        {isAdmin && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Owner: <span className="font-medium">{tx.ownerName ?? "—"}</span>
                            {" · "}Tenant: <span className="font-medium">{tx.tenantName ?? "—"}</span>
                          </p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>Owner: <span className={tx.ownerConfirmation === "pending" ? "text-gray-700 font-medium" : "text-gray-700 font-medium"}>{tx.ownerConfirmation === "pending" ? "⏳ Awaiting" : "✓ " + tx.ownerConfirmation}</span></span>
                          <span>Tenant: <span className={tx.tenantConfirmation === "pending" ? "text-gray-700 font-medium" : "text-gray-700 font-medium"}>{tx.tenantConfirmation === "pending" ? "⏳ Awaiting" : "✓ " + tx.tenantConfirmation}</span></span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Link-up confirmed {timeAgo(tx.createdAt)}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap shrink-0">
                        {myTurn && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1"
                            disabled={confirmingId === tx.id}
                            onClick={() => setConfirmDialog({ tx })}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Confirm Transaction
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => { setResolveDialog({ tx }); setResolveStatus(tx.transactionType === "sale" ? "sold_via_inndos" : "rented_via_inndos"); }}
                          >
                            <ShieldCheck className="h-3 w-3" /> Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Transaction History (not shown in compact mode) ── */}
      {!compact && historyTxs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {historyTxs.slice(0, 20).map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.propertyTitle}</p>
                    {isAdmin && (
                      <p className="text-xs text-muted-foreground">
                        {tx.ownerName ?? "—"} ↔ {tx.tenantName ?? "—"}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground capitalize">{tx.transactionType} · {timeAgo(tx.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {tx.transactionValue != null && (
                      <span className="text-sm font-semibold text-primary">KES {tx.transactionValue.toLocaleString()}</span>
                    )}
                    <Badge variant="outline" className={`text-[10px] h-4 border ${STATUS_COLOR[tx.status]}`}>
                      {STATUS_LABEL[tx.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Confirmation Dialog ── */}
      <Dialog open={!!confirmDialog} onOpenChange={open => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription>
              Please select the outcome for <strong>{confirmDialog?.tx.propertyTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-2">
            <p className="text-sm text-muted-foreground">
              {confirmDialog?.tx.transactionType === "sale"
                ? "Was this property sold via inndos?"
                : "Was this rental completed via inndos?"}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white justify-start gap-2 h-auto py-3 px-4"
                disabled={confirmingId === confirmDialog?.tx.id}
                onClick={() => confirmDialog && handleConfirm(confirmDialog.tx, "confirmed")}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    {confirmDialog?.tx.transactionType === "sale" ? "Successfully Sold via inndos" : "Successfully Rented via inndos"}
                  </p>
                  <p className="text-xs opacity-80">The transaction was completed through inndos</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="border-orange-300 text-gray-700 hover:bg-orange-50 justify-start gap-2 h-auto py-3 px-4"
                disabled={confirmingId === confirmDialog?.tx.id}
                onClick={() => confirmDialog && handleConfirm(confirmDialog.tx, "outside_inndos")}
              >
                <XCircle className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    {confirmDialog?.tx.transactionType === "sale" ? "Not Sold via inndos" : "Not Rented via inndos"}
                  </p>
                  <p className="text-xs opacity-80">Completed outside of the inndos platform</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-600 hover:bg-gray-50 justify-start gap-2 h-auto py-3 px-4"
                disabled={confirmingId === confirmDialog?.tx.id}
                onClick={() => confirmDialog && handleConfirm(confirmDialog.tx, "not_completed")}
              >
                <Clock className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <p className="font-semibold text-sm">Transaction Did Not Complete</p>
                  <p className="text-xs opacity-80">The deal fell through or is still ongoing</p>
                </div>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialog(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Resolve Dialog ── */}
      <Dialog open={!!resolveDialog} onOpenChange={open => !open && setResolveDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Transaction</DialogTitle>
            <DialogDescription>
              Manually set the outcome for <strong>{resolveDialog?.tx.propertyTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="grid grid-cols-1 gap-2">
              {(["rented_via_inndos", "sold_via_inndos", "not_completed", "confirmed_outside_inndos", "cancelled"] as TxStatus[]).map(s => (
                <label key={s} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${resolveStatus === s ? "border-indigo-400 bg-indigo-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="radio"
                    name="resolveStatus"
                    value={s}
                    checked={resolveStatus === s}
                    onChange={() => setResolveStatus(s)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm font-medium">{STATUS_LABEL[s]}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Admin Notes (optional)</label>
              <Textarea
                placeholder="Add a note for your records…"
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleAdminResolve}
              disabled={isResolving}
            >
              {isResolving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resolving…</> : "Resolve Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
