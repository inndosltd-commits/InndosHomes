import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Home, Loader2, Users } from "lucide-react";
import { useState } from "react";

type UpgradeRole = "owner" | "host";

interface AccountUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AccountUpgradeDialog({ open, onOpenChange, onSuccess }: AccountUpgradeDialogProps) {
  const { token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [upgradeTargetRole, setUpgradeTargetRole] = useState<UpgradeRole | null>(null);
  const [isUpgradingRole, setIsUpgradingRole] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isUpgradingRole) setUpgradeTargetRole(null);
    onOpenChange(nextOpen);
  };

  const handleUpgradeRole = async () => {
    if (!upgradeTargetRole || !token) return;
    setIsUpgradingRole(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: upgradeTargetRole }),
      });
      if (!res.ok) throw new Error("Failed to upgrade account");
      await refreshUser();
      setUpgradeTargetRole(null);
      onOpenChange(false);
      toast({
        title: "Account upgraded!",
        description: `You are now a ${upgradeTargetRole === "owner" ? "Property Owner" : "Host / Agency"}. You can now list your property.`,
      });
      onSuccess?.();
    } catch {
      toast({ title: "Upgrade failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUpgradingRole(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Switch Account to List a Property</DialogTitle>
          <DialogDescription>
            Tenant accounts can't list properties. Choose the account type that fits you best — you can always manage everything from your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => setUpgradeTargetRole("owner")}
            className={`text-left rounded-xl border-2 p-4 transition-all ${upgradeTargetRole === "owner" ? "border-zinc-900 bg-zinc-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Home className="h-5 w-5 text-zinc-800" />
              <span className="font-semibold text-sm">Property Owner</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ List your own properties for rent or sale</li>
              <li>✓ Receive link-up requests from tenants</li>
              <li>✓ Manage bookings from your dashboard</li>
              <li>✓ Get SMS & email alerts on new link-ups</li>
            </ul>
          </button>
          <button
            type="button"
            onClick={() => setUpgradeTargetRole("host")}
            className={`text-left rounded-xl border-2 p-4 transition-all ${upgradeTargetRole === "host" ? "border-zinc-900 bg-zinc-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-zinc-800" />
              <span className="font-semibold text-sm">Host / Agency</span>
            </div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ List multiple properties on behalf of others</li>
              <li>✓ Register as a firm (business / company)</li>
              <li>✓ Access agency-level subscription plans</li>
              <li>✓ Manage all client listings in one dashboard</li>
            </ul>
          </button>
        </div>
        {upgradeTargetRole && (
          <p className="text-xs text-muted-foreground mt-1">
            You're switching to: <strong>{upgradeTargetRole === "owner" ? "Property Owner" : "Host / Agency"}</strong>. This change takes effect immediately.
          </p>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isUpgradingRole}>Cancel</Button>
          <Button
            className="bg-zinc-900 hover:bg-zinc-800 text-white"
            disabled={!upgradeTargetRole || isUpgradingRole}
            onClick={handleUpgradeRole}
          >
            {isUpgradingRole ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Switching…</> : "Switch & List Property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}