import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";

type CalendarEntry = {
  id: string;
  startDate: string;
  endDate: string;
  note?: string | null;
  bookingId?: string | null;
  linkUp?: { id: string; guestName?: string; status?: string } | null;
};

type LinkUp = { id: string; guestName?: string; tenantName?: string; status?: string; startDate?: string; endDate?: string };

export function ManagementCalendar({ propertyId }: { propertyId: string }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [linkUps, setLinkUps] = useState<LinkUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", note: "", bookingId: "" });

  const loadCalendar = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/management-calendar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not load the management calendar.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setLinkUps(Array.isArray(data.linkUps) ? data.linkUps : []);
    } catch (error) {
      toast({ title: "Calendar unavailable", description: error instanceof Error ? error.message : "Could not load the management calendar.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, token, toast]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const saveEntry = async () => {
    if (!token) return;
    if (!form.startDate || !form.endDate) {
      toast({ title: "Dates required", description: "Enter both a start and end date.", variant: "destructive" });
      return;
    }
    if (form.endDate < form.startDate) {
      toast({ title: "Invalid date range", description: "The end date must be on or after the start date.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/properties/${propertyId}/management-calendar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          note: form.note.trim(),
          ...(form.bookingId ? { bookingId: form.bookingId } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save calendar entry.");
      setForm({ startDate: "", endDate: "", note: "", bookingId: "" });
      await loadCalendar();
      toast({ title: "Management entry saved", description: "This private note does not affect customer availability or Link-Ups." });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save calendar entry.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    if (!token) return;
    setDeletingId(entryId);
    try {
      const response = await fetch(`/api/properties/${propertyId}/management-calendar/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete calendar entry.");
      await loadCalendar();
      toast({ title: "Management entry deleted" });
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Could not delete calendar entry.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600" data-testid="text-private-calendar-notice">
        Private owner management notes only. They are never shown to customers and never change customer availability or Link-Ups.
      </p>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label htmlFor="management-start">Start date</Label><Input id="management-start" data-testid="input-management-start" type="date" value={form.startDate} onChange={e => setForm(current => ({ ...current, startDate: e.target.value }))} /></div>
          <div><Label htmlFor="management-end">End date</Label><Input id="management-end" data-testid="input-management-end" type="date" value={form.endDate} onChange={e => setForm(current => ({ ...current, endDate: e.target.value }))} /></div>
        </div>
        <div>
          <Label htmlFor="management-linkup">Optional Link-Up association</Label>
          <select id="management-linkup" data-testid="select-management-linkup" value={form.bookingId} onChange={e => setForm(current => ({ ...current, bookingId: e.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">No Link-Up association</option>
            {linkUps.map(linkUp => <option key={linkUp.id} value={linkUp.id}>{linkUp.guestName || linkUp.tenantName || "Link-Up"} {linkUp.startDate ? `(${linkUp.startDate})` : ""}</option>)}
          </select>
        </div>
        <div><Label htmlFor="management-note">Private note (optional)</Label><Textarea id="management-note" data-testid="input-management-note" value={form.note} onChange={e => setForm(current => ({ ...current, note: e.target.value }))} placeholder="e.g. owner follow-up" /></div>
        <Button data-testid="button-save-management-entry" size="sm" disabled={isSaving} onClick={saveEntry}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-1" />} Save private entry</Button>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Current and historical entries</h4>
        {isLoading ? <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div> : entries.length === 0 ? <p className="text-xs text-muted-foreground border rounded-lg p-3">No private management entries yet.</p> : (
          <div className="space-y-2">{entries.map(entry => <div key={entry.id} data-testid={`management-entry-${entry.id}`} className="flex justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{entry.startDate} → {entry.endDate}</p>{entry.note && <p className="text-xs text-muted-foreground mt-1">{entry.note}</p>}{entry.bookingId && <Badge variant="secondary" className="mt-2 text-xs">Linked to Link-Up</Badge>}</div><Button data-testid={`button-delete-management-entry-${entry.id}`} variant="ghost" size="icon" disabled={deletingId === entry.id} onClick={() => deleteEntry(entry.id)}>{deletingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</Button></div>)}</div>
        )}
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Current and historical Link-Ups</h4>
        {isLoading ? null : linkUps.length === 0 ? <p className="text-xs text-muted-foreground border rounded-lg p-3">No Link-Ups for this property.</p> : (
          <div className="space-y-2">
            {linkUps.map(linkUp => (
              <div key={linkUp.id} data-testid={`management-linkup-${linkUp.id}`} className="rounded-lg border p-3 text-sm flex items-center justify-between gap-3">
                <div><p className="font-medium">{linkUp.guestName || linkUp.tenantName || "Link-Up"}</p><p className="text-xs text-muted-foreground">{linkUp.startDate || "No start date"}{linkUp.endDate ? ` → ${linkUp.endDate}` : ""}</p></div>
                {linkUp.status && <Badge variant="secondary" className="text-xs">{linkUp.status}</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}