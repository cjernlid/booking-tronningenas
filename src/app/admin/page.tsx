'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Booking, BlockedDate } from '@/lib/types';

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [bookingsRes, blockedRes] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/blocked-dates'),
      ]);
      setBookings(await bookingsRes.json());
      setBlockedDates(await blockedRes.json());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) fetchData();
  }, [authed, fetchData]);

  const handleStatusChange = async (id: string, status: 'approved' | 'denied') => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchData();
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    await fetch('/api/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates: [blockDate], reason: blockReason }),
    });
    setBlockDate('');
    setBlockReason('');
    fetchData();
  };

  const handleUnblock = async (date: string) => {
    await fetch(`/api/blocked-dates?date=${date}`, { method: 'DELETE' });
    fetchData();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple PIN check - stored in env var
    if (pin === (process.env.NEXT_PUBLIC_ADMIN_PIN || '1234')) {
      setAuthed(true);
    } else {
      alert('Fel PIN-kod');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-sand)' }}>
        <form onSubmit={handleLogin} className="rounded-2xl p-8 w-full max-w-sm" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h1 className="text-2xl mb-6 text-center" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
            Admin
          </h1>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN-kod"
            className="w-full px-4 py-3 rounded-xl text-sm text-center tracking-[0.5em] outline-none mb-4"
            style={{
              background: 'var(--color-sand)',
              border: '1px solid var(--color-sand-dark)',
              color: 'var(--color-forest)',
            }}
          />
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--color-copper)', color: 'var(--color-white)' }}
          >
            Logga in
          </button>
        </form>
      </div>
    );
  }

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-sand)' }}>
      <header className="pt-10 pb-6 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-copper-dark)' }}>Admin</p>
            <h1 className="text-3xl" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
              Viekärrsvägen 4
            </h1>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'rgba(243,156,18,0.15)', color: 'var(--color-amber)' }}>
              {pendingCount} inväntar
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'denied'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: filter === f ? 'var(--color-copper)' : 'var(--color-white)',
                color: filter === f ? 'var(--color-white)' : 'var(--color-forest-light)',
              }}
            >
              {f === 'all' ? 'Alla' : f === 'pending' ? 'Inväntar' : f === 'approved' ? 'Godkända' : 'Nekade'}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {loading ? (
          <p style={{ color: 'var(--color-forest-light)' }}>Laddar...</p>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-white)' }}>
            <p style={{ color: 'var(--color-forest-light)' }}>Inga bokningar att visa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => (
              <div
                key={booking.id}
                className="rounded-2xl p-5"
                style={{
                  background: 'var(--color-white)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${booking.status === 'pending' ? 'var(--color-amber)' : booking.status === 'approved' ? 'var(--color-green)' : 'var(--color-red)'}`,
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-lg" style={{ color: 'var(--color-forest)' }}>
                      {booking.guest_name}
                    </p>
                    {booking.guest_email && (
                      <p className="text-sm" style={{ color: 'var(--color-forest-light)' }}>{booking.guest_email}</p>
                    )}
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      background: booking.status === 'pending' ? 'rgba(243,156,18,0.15)' : booking.status === 'approved' ? 'rgba(76,175,80,0.1)' : 'rgba(231,76,60,0.1)',
                      color: booking.status === 'pending' ? 'var(--color-amber)' : booking.status === 'approved' ? 'var(--color-green)' : 'var(--color-red)',
                    }}
                  >
                    {booking.status === 'pending' ? 'Inväntar' : booking.status === 'approved' ? 'Godkänd' : 'Nekad'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-copper-dark)' }}>Incheckning</p>
                    <p className="text-sm font-medium">{formatDate(booking.check_in)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-copper-dark)' }}>Utcheckning</p>
                    <p className="text-sm font-medium">{formatDate(booking.check_out)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-copper-dark)' }}>Summa</p>
                    <p className="text-sm font-medium">{booking.total_price.toLocaleString('sv-SE')} kr</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-forest-light)' }}>
                      Swish-ref: <span className="font-mono font-semibold" style={{ color: 'var(--color-forest)' }}>{booking.swish_reference}</span>
                    </p>
                    {booking.notes && (
                      <p className="text-xs mt-1 italic" style={{ color: 'var(--color-forest-light)' }}>
                        &ldquo;{booking.notes}&rdquo;
                      </p>
                    )}
                  </div>

                  {booking.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleStatusChange(booking.id, 'approved')}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'var(--color-green)', color: 'white' }}
                      >
                        Godkänn
                      </button>
                      <button
                        onClick={() => handleStatusChange(booking.id, 'denied')}
                        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: 'var(--color-red)', color: 'white' }}
                      >
                        Neka
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Block dates section */}
        <div className="mt-10">
          <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
            Blockera datum
          </h2>

          <form onSubmit={handleBlockDate} className="rounded-2xl p-5 mb-4" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div className="flex gap-3">
              <input
                type="date"
                value={blockDate}
                onChange={e => setBlockDate(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-sand)', border: '1px solid var(--color-sand-dark)', color: 'var(--color-forest)' }}
              />
              <input
                type="text"
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Anledning (valfritt)"
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--color-sand)', border: '1px solid var(--color-sand-dark)', color: 'var(--color-forest)' }}
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-forest)', color: 'white' }}
              >
                Blockera
              </button>
            </div>
          </form>

          {blockedDates.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div className="space-y-2">
                {blockedDates.map(bd => (
                  <div key={bd.id} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--color-sand)' }}>
                    <div>
                      <span className="text-sm font-medium">{formatDate(bd.date)}</span>
                      {bd.reason && <span className="text-sm ml-2" style={{ color: 'var(--color-forest-light)' }}>({bd.reason})</span>}
                    </div>
                    <button
                      onClick={() => handleUnblock(bd.date)}
                      className="text-xs font-medium px-3 py-1 rounded-lg transition-colors"
                      style={{ color: 'var(--color-red)' }}
                    >
                      Ta bort
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
