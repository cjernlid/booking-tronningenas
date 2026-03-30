'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Booking, BlockedDate } from '@/lib/types';

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
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

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    denied: bookings.filter(b => b.status === 'denied').length,
  };

  const filterLabels: Record<string, string> = {
    all: 'Alla',
    pending: 'Inväntar',
    approved: 'Godkända',
    denied: 'Nekade',
  };

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
          {counts.pending > 0 && (
            <div className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'rgba(243,156,18,0.15)', color: 'var(--color-amber)' }}>
              {counts.pending} inväntar
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pb-16">
        {/* Unified calendar */}
        {!loading && (
          <UnifiedCalendar bookings={bookings} blockedDates={blockedDates} onUpdate={fetchData} />
        )}

        {/* Section heading for bookings */}
        <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
          Bokningar
        </h2>

        {/* Filter tabs with counts */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'pending', 'approved', 'denied'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background: filter === f ? 'var(--color-copper)' : 'var(--color-white)',
                color: filter === f ? 'var(--color-white)' : 'var(--color-forest-light)',
              }}
            >
              {filterLabels[f]}
              <span
                className="text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center"
                style={{
                  background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--color-sand)',
                  color: filter === f ? 'var(--color-white)' : 'var(--color-forest-light)',
                }}
              >
                {counts[f]}
              </span>
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
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'var(--color-white)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  borderLeft: `4px solid ${booking.status === 'pending' ? 'var(--color-amber)' : booking.status === 'approved' ? 'var(--color-green)' : 'var(--color-red)'}`,
                }}
              >
                <div className="p-5">
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
                </div>

                {booking.status === 'pending' && (
                  <div
                    className="flex border-t"
                    style={{ borderColor: 'var(--color-sand)' }}
                  >
                    <button
                      onClick={() => {
                        if (confirm(`Godkänn bokning från ${booking.guest_name}?\n\n${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}\n${booking.total_price.toLocaleString('sv-SE')} kr\n\nEtt bekräftelsemejl med Swish-info skickas till ${booking.guest_email || 'gästen'}.`)) {
                          handleStatusChange(booking.id, 'approved');
                        }
                      }}
                      className="flex-1 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                      style={{ background: 'rgba(76,175,80,0.08)', color: 'var(--color-green)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.08)'; }}
                    >
                      <span style={{ fontSize: '16px' }}>&#10003;</span> Godkänn
                    </button>
                    <div style={{ width: '1px', background: 'var(--color-sand)' }} />
                    <button
                      onClick={() => {
                        if (confirm(`Neka bokning från ${booking.guest_name}?\n\n${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}\n\nEtt avslagsmejl skickas till ${booking.guest_email || 'gästen'}.`)) {
                          handleStatusChange(booking.id, 'denied');
                        }
                      }}
                      className="flex-1 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2"
                      style={{ background: 'rgba(231,76,60,0.06)', color: 'var(--color-red)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(231,76,60,0.06)'; }}
                    >
                      <span style={{ fontSize: '16px' }}>&#10005;</span> Neka
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function UnifiedCalendar({
  bookings,
  blockedDates,
  onUpdate,
}: {
  bookings: Booking[];
  blockedDates: BlockedDate[];
  onUpdate: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [blockReason, setBlockReason] = useState('');
  const [saving, setSaving] = useState(false);

  const blockedSet = new Set(blockedDates.map(bd => bd.date));

  const getBookingInfo = (dateStr: string): { status: string; guest?: string } | null => {
    for (const b of bookings) {
      if (b.status !== 'denied' && dateStr >= b.check_in && dateStr < b.check_out) {
        return { status: b.status, guest: b.guest_name };
      }
    }
    return null;
  };

  const isBooked = (dateStr: string) => {
    return bookings.some(
      b => b.status !== 'denied' && dateStr >= b.check_in && dateStr < b.check_out
    );
  };

  const toggleDate = (dateStr: string) => {
    if (isBooked(dateStr)) return;
    const next = new Set(selectedDates);
    if (next.has(dateStr)) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
    }
    setSelectedDates(next);
  };

  const handleBlock = async () => {
    if (selectedDates.size === 0) return;
    const datesToBlock = [...selectedDates].filter(d => !blockedSet.has(d));
    if (datesToBlock.length === 0) return;

    const sortedDates = datesToBlock.sort();
    const confirmMsg = `Blockera ${datesToBlock.length} datum?\n\n${sortedDates.map(d => {
      const date = new Date(d + 'T12:00:00');
      return date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
    }).join('\n')}\n\nDessa datum kommer inte att gå att boka.`;

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    await fetch('/api/blocked-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates: datesToBlock, reason: blockReason }),
    });
    setSelectedDates(new Set());
    setBlockReason('');
    setSaving(false);
    onUpdate();
  };

  const handleUnblock = async () => {
    if (selectedDates.size === 0) return;
    const datesToUnblock = [...selectedDates].filter(d => blockedSet.has(d));
    if (datesToUnblock.length === 0) return;

    const sortedDates = datesToUnblock.sort();
    const confirmMsg = `Avblockera ${datesToUnblock.length} datum?\n\n${sortedDates.map(d => {
      const date = new Date(d + 'T12:00:00');
      return date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
    }).join('\n')}\n\nDessa datum blir bokningsbara igen.`;

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    for (const date of datesToUnblock) {
      await fetch(`/api/blocked-dates?date=${date}`, { method: 'DELETE' });
    }
    setSelectedDates(new Set());
    setSaving(false);
    onUpdate();
  };

  const selectedBlockedCount = [...selectedDates].filter(d => blockedSet.has(d)).length;
  const selectedNewCount = [...selectedDates].filter(d => !blockedSet.has(d)).length;

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7;
    const today = new Date().toISOString().split('T')[0];

    const days: React.ReactNode[] = [];
    for (let i = 0; i < startPad; i++) {
      days.push(<div key={`pad-${i}`} className="h-14" />);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateStr < today;
      const isToday = dateStr === today;
      const isBlocked = blockedSet.has(dateStr);
      const bookingInfo = getBookingInfo(dateStr);
      const isBookedDate = !!bookingInfo;
      const isSelected = selectedDates.has(dateStr);

      let bgColor = 'transparent';
      let textColor = 'var(--color-forest)';
      let label = '';
      let cursor = 'pointer';

      if (isPast) {
        textColor = 'var(--color-sand-dark)';
        cursor = 'default';
      } else if (isSelected && isBlocked) {
        bgColor = 'var(--color-forest)';
        textColor = 'white';
        label = 'Blockerad';
        cursor = 'pointer';
      } else if (isSelected) {
        bgColor = 'var(--color-copper)';
        textColor = 'white';
        label = 'Markerad';
        cursor = 'pointer';
      } else if (bookingInfo?.status === 'approved') {
        bgColor = 'rgba(231,76,60,0.12)';
        textColor = 'var(--color-red)';
        label = bookingInfo.guest || '';
        cursor = 'not-allowed';
      } else if (bookingInfo?.status === 'pending') {
        bgColor = 'rgba(243,156,18,0.12)';
        textColor = 'var(--color-amber)';
        label = bookingInfo.guest || '';
        cursor = 'not-allowed';
      } else if (isBlocked) {
        bgColor = 'rgba(45,52,54,0.1)';
        textColor = 'var(--color-forest-light)';
        label = 'Blockerad';
      } else if (!isPast) {
        bgColor = 'rgba(74,124,89,0.06)';
        textColor = 'var(--color-green)';
        label = 'Ledig';
      }

      const handleClick = () => {
        if (isPast || isBookedDate) return;
        toggleDate(dateStr);
      };

      days.push(
        <button
          key={dateStr}
          onClick={handleClick}
          className="h-14 w-full rounded-lg flex flex-col items-center justify-center relative transition-all duration-150"
          style={{
            background: bgColor,
            cursor,
            ...(isSelected ? { boxShadow: '0 0 0 2px var(--color-copper)' } : {}),
          }}
          type="button"
          title={isPast ? 'Passerat' : isBookedDate ? `Bokad: ${bookingInfo?.guest}` : isBlocked ? 'Blockerad (klicka for att markera)' : 'Ledig (klicka for att markera)'}
        >
          <span
            className="text-sm font-medium"
            style={{
              color: textColor,
              ...(isToday ? { textDecoration: 'underline', textUnderlineOffset: '2px' } : {}),
            }}
          >
            {d}
          </span>
          {label && !isPast && (
            <span
              className="text-[9px] leading-tight truncate max-w-full px-0.5"
              style={{ color: textColor, opacity: isSelected ? 1 : 0.8 }}
            >
              {label}
            </span>
          )}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

  return (
    <div className="mb-8">
      <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
        Kalender
      </h2>
      <div className="rounded-2xl p-6" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: 'var(--color-forest-light)' }}
            type="button"
          >
            &larr;
          </button>
          <h3 className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: 'var(--color-forest-light)' }}
            type="button"
          >
            &rarr;
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
            <div key={day} className="text-center text-xs font-medium py-1" style={{ color: 'var(--color-forest-light)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendar()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--color-sand-dark)' }}>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(74,124,89,0.12)' }} /> Ledig
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(231,76,60,0.15)' }} /> Godkänd
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(243,156,18,0.15)' }} /> Inväntar
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
            <div className="w-3 h-3 rounded" style={{ background: 'rgba(45,52,54,0.1)' }} /> Blockerad
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
            <div className="w-3 h-3 rounded" style={{ background: 'var(--color-copper)', boxShadow: '0 0 0 2px var(--color-copper)' }} /> Markerad
          </div>
        </div>

        {/* Block/unblock action bar */}
        {selectedDates.size > 0 && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--color-sand-dark)' }}>
            <p className="text-sm mb-3 font-medium" style={{ color: 'var(--color-forest)' }}>
              {selectedDates.size} {selectedDates.size === 1 ? 'datum markerat' : 'datum markerade'}
              {selectedNewCount > 0 && <span style={{ color: 'var(--color-forest-light)', fontWeight: 400 }}> ({selectedNewCount} lediga)</span>}
              {selectedBlockedCount > 0 && <span style={{ color: 'var(--color-forest-light)', fontWeight: 400 }}> ({selectedBlockedCount} blockerade)</span>}
            </p>

            {selectedNewCount > 0 && (
              <div className="mb-3">
                <input
                  type="text"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  placeholder="Anledning (valfritt)"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--color-sand)', border: '1px solid var(--color-sand-dark)', color: 'var(--color-forest)' }}
                />
              </div>
            )}

            <div className="flex gap-3">
              {selectedNewCount > 0 && (
                <button
                  onClick={handleBlock}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-forest)', color: 'white' }}
                >
                  {saving ? 'Sparar...' : `Blockera ${selectedNewCount} datum`}
                </button>
              )}
              {selectedBlockedCount > 0 && (
                <button
                  onClick={handleUnblock}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--color-red)', color: 'white' }}
                >
                  {saving ? 'Sparar...' : `Avblockera ${selectedBlockedCount} datum`}
                </button>
              )}
              <button
                onClick={() => { setSelectedDates(new Set()); setBlockReason(''); }}
                className="px-5 py-3 rounded-xl text-sm font-medium"
                style={{ color: 'var(--color-forest-light)' }}
              >
                Avmarkera
              </button>
            </div>
          </div>
        )}

        {/* Hint */}
        {selectedDates.size === 0 && (
          <p className="text-center text-xs mt-4" style={{ color: 'var(--color-forest-light)' }}>
            Klicka på lediga eller blockerade datum for att markera dem, sedan blockera eller avblockera.
          </p>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
}
