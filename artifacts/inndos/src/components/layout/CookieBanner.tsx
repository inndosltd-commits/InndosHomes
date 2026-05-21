import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookiesAccepted');
    if (!accepted) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-[100] shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-sm text-gray-600 max-w-4xl">
        We use cookies to improve your experience, personalize content, and analyze our traffic. By continuing to use our site, you agree to our use of cookies.
      </div>
      <div className="flex gap-2 w-full sm:w-auto shrink-0">
        <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setShow(false)}>Decline</Button>
        <Button className="flex-1 sm:flex-none bg-black text-white hover:bg-gray-800" onClick={accept}>Accept Cookies</Button>
      </div>
      <button onClick={() => setShow(false)} className="absolute top-2 right-2 sm:hidden text-gray-400">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
