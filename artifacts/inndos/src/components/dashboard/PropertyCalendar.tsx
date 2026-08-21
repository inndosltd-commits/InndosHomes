import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X, Plus, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Block = {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
};

type BookedRange = {
  startDate: string;
  endDate: string;
  status: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function isInStayRange(date: string, start: string, endExclusive: string): boolean {
  return date >= start && date < endExclusive;
}

function isInSelectedRange(date: string, start: string, endInclusive: string): boolean {
  return date >= start && date <= endInclusive;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

type DayStatus = "available" | "booked" | "blocked" | "past" | "selecting";

interface PropertyCalendarProps {
  propertyId: string;
  propertyTitle: string;
}

export function PropertyCalendar({ propertyId, propertyTitle }: PropertyCalendarProps) {
  const { token } = useAuth();
  const { toast } = useToast();

  const today = toYMD(new Date());
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [blocksRes, availRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/blocks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/properties/${propertyId}/availability`),
      ]);
      if (blocksRes.ok) setBlocks(await blocksRes.json());
      if (availRes.ok) {
        const all: BookedRange[] = await availRes.json();
        setBookedRanges(all.filter(r => r.status !== "blocked"));
      }
    } catch {
      toast({ title: "Failed to load calendar data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, token, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getDayStatus = (dateStr: string): DayStatus => {
    if (dateStr < today) return "past";
    for (const b of blocks) {
      if (isInStayRange(dateStr, b.startDate, b.endDate)) return "blocked";
    }
    for (const r of bookedRanges) {
      if (isInStayRange(dateStr, r.startDate, r.endDate)) return "booked";
    }
    if (selectStart) {
      const rangeStart = selectStart <= (hoverDate ?? selectStart) ? selectStart : (hoverDate ?? selectStart);
      const rangeEnd = selectStart <= (hoverDate ?? selectStart) ? (hoverDate ?? selectStart) : selectStart;
      if (isInSelectedRange(dateStr, rangeStart, rangeEnd)) return "selecting";
    }
    return "available";
  };

  const handleDayClick = (dateStr: string) => {
    const status = getDayStatus(dateStr);
    if (status === "past") return;

    if (!selectStart) {
      setSelectStart(dateStr);
      return;
    }

    const start = selectStart <= dateStr ? selectStart : dateStr;
    const end = selectStart <= dateStr ? dateStr : selectStart;
    setSelectStart(null);
    setHoverDate(null);
    handleAddBlock(start, end);
  };

  const handleAddBlock = async (startDate: string, endDate: string) => {
    if (!token) return;
    setIsSaving(true);
    try {
      // Owners select inclusive calendar days, while stored availability ranges
      // use the same half-open [start, end) contract as bookings.
      const endExclusive = addDays(endDate, 1);
      const res = await fetch(`/api/properties/${propertyId}/blocks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startDate, endDate: endExclusive, reason: reason || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: err.error || "Failed to add block", variant: "destructive" });
        return;
      }
      setReason("");
      await fetchData();
      toast({
        title: "Dates blocked",
        description: `${startDate} → ${endDate} marked as unavailable.`,
        className: "bg-gray-50 border-gray-200 text-gray-700",
      });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    if (!token) return;
    setDeletingId(blockId);
    try {
      const res = await fetch(`/api/properties/${propertyId}/blocks/${blockId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast({ title: "Failed to remove block", variant: "destructive" });
        return;
      }
      await fetchData();
      toast({ title: "Block removed", description: "Dates are now available." });
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const days = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const upcomingBlocks = blocks
    .filter(b => b.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const DAY_STYLES: Record<DayStatus, string> = {
    available: "bg-white hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer text-gray-800",
    booked: "bg-gray-100 text-gray-700 cursor-default border-gray-200",
    blocked: "bg-gray-100 text-gray-700 cursor-pointer border-gray-200 hover:bg-gray-200",
    past: "bg-gray-50 text-gray-300 cursor-default",
    selecting: "bg-emerald-100 text-emerald-800 cursor-pointer border-emerald-300",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm bg-orange-100 border border-orange-200" /> Blocked by you
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" /> Guest booking
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" /> Selecting range
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">
                {MONTHS[month]} {year}
              </span>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {days.map(day => {
                  const dateStr = toYMD(day);
                  const status = getDayStatus(dateStr);
                  const isToday = dateStr === today;
                  const isStart = selectStart === dateStr;
                  return (
                    <button
                      key={dateStr}
                      className={`
                        relative text-xs rounded-lg border py-1.5 font-medium transition-colors
                        ${DAY_STYLES[status]}
                        ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                        ${isStart ? "ring-2 ring-emerald-500 ring-offset-1" : ""}
                      `}
                      onClick={() => handleDayClick(dateStr)}
                      onMouseEnter={() => selectStart && setHoverDate(dateStr)}
                      onMouseLeave={() => selectStart && setHoverDate(null)}
                      title={status === "blocked" ? "Click to select (to modify range)" : status === "booked" ? "Guest booking" : "Click to start range"}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {selectStart ? (
            <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 space-y-3">
              <p className="text-sm font-medium text-emerald-800">
                Range started: <strong>{selectStart}</strong> — click an end date on the calendar
              </p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs text-emerald-700 mb-1 block">Label (optional)</Label>
                  <Input
                    placeholder="e.g. Maintenance, Personal use"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSelectStart(null); setHoverDate(null); }}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Click any available date to start selecting a range to block
            </p>
          )}

          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving block…
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Plus className="h-4 w-4 text-gray-400" />
              Upcoming blocked periods
              {upcomingBlocks.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{upcomingBlocks.length}</Badge>
              )}
            </h4>
            {upcomingBlocks.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center border rounded-lg">
                No blocked dates — all days are open for booking.
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingBlocks.map(b => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/60 text-sm"
                  >
                    <div>
                      <span className="font-medium text-gray-800">
                        {b.startDate} → {addDays(b.endDate, -1)}
                      </span>
                      {b.reason && (
                        <span className="ml-2 text-gray-600 text-xs">{b.reason}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-600 hover:bg-orange-100"
                      disabled={deletingId === b.id}
                      onClick={() => handleRemoveBlock(b.id)}
                    >
                      {deletingId === b.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
