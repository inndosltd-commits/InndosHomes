import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Simple heuristic for demo: If timezone is East Africa, show KES.
    // Otherwise show USD (converting approx 130 KES = 1 USD)
    if (timeZone.includes("Nairobi") || timeZone.includes("Africa/Dar_es_Salaam") || timeZone.includes("Africa/Kampala")) {
       return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
    } else {
       // Mock conversion for international viewers
       // Assuming base prices in mockData are in KES
       const usdAmount = amount / 130;
       return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usdAmount);
    }
  } catch (e) {
    return `Ksh ${amount.toLocaleString()}`;
  }
}
