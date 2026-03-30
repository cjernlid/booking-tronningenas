'use client';

import { useState, useEffect, useCallback } from 'react';

const PRICE_PER_NIGHT = 800;

interface BookedRange {
  check_in: string;
  check_out: string;
  status: string;
}

export default function BookingPage() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; swishRef?: string } | null>(null);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const datesSelected = checkIn && checkOut;
  const submitted = result?.success;

  // Determine current step: 1=dates, 2=form, 3=awaiting, 4=pay, 5=done
  const currentStep = submitted ? 3 : datesSelected ? 2 : 1;

  const steps = [
    { num: 1, label: 'Välj datum' },
    { num: 2, label: 'Uppgifter' },
    { num: 3, label: 'Godkännande' },
    { num: 4, label: 'Betala' },
  ];

  const fetchUnavailable = useCallback(async () => {
    try {
      const [blockedRes, bookingsRes] = await Promise.all([
        fetch('/api/blocked-dates'),
        fetch('/api/bookings'),
      ]);
      const blocked = await blockedRes.json();
      const bookings = await bookingsRes.json();

      setBlockedDates(blocked.map((b: { date: string }) => b.date));
      setBookedRanges(
        (bookings as BookedRange[])
          .filter((b: BookedRange) => b.status !== 'denied')
          .map((b: BookedRange) => ({ check_in: b.check_in, check_out: b.check_out, status: b.status }))
      );
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnavailable();
  }, [fetchUnavailable]);

  const isDateUnavailable = (dateStr: string) => {
    if (blockedDates.includes(dateStr)) return 'blocked';
    for (const range of bookedRanges) {
      if (dateStr >= range.check_in && dateStr < range.check_out) {
        return range.status;
      }
    }
    return null;
  };

  const nights = checkIn && checkOut
    ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_name: guestName, guest_email: guestEmail, check_in: checkIn, check_out: checkOut, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, message: data.error });
      } else {
        setResult({
          success: true,
          message: `Bokningen har skickats! Vänta på godkännande.`,
          swishRef: data.swish_reference,
        });
        setGuestName('');
        setGuestEmail('');
        setCheckIn('');
        setCheckOut('');
        setNotes('');
        fetchUnavailable();
      }
    } catch {
      setResult({ success: false, message: 'Något gick fel. Försök igen.' });
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start

    const days: React.ReactNode[] = [];

    for (let i = 0; i < startPad; i++) {
      days.push(<div key={`pad-${i}`} className="h-10" />);
    }

    const today = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const status = isDateUnavailable(dateStr);
      const isPast = dateStr < today;
      const isSelected = dateStr === checkIn || dateStr === checkOut;
      const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
      const isAvailable = !isPast && !status;

      let className = 'h-10 w-full rounded-lg text-sm font-medium transition-all duration-200 ';

      if (isPast) {
        className += 'text-[var(--color-sand-dark)]/50 cursor-default opacity-40';
      } else if (status === 'blocked') {
        className += 'bg-[var(--color-forest)]/8 text-[var(--color-forest-light)]/50 cursor-not-allowed line-through opacity-50';
      } else if (status === 'approved') {
        className += 'bg-[var(--color-red)]/12 text-[var(--color-red)]/70 cursor-not-allowed';
      } else if (status === 'pending') {
        className += 'bg-[var(--color-amber)]/12 text-[var(--color-amber)]/70 cursor-not-allowed';
      } else if (isSelected) {
        className += 'bg-[var(--color-copper)] text-white cursor-pointer shadow-sm';
      } else if (isInRange) {
        className += 'bg-[var(--color-copper)]/15 text-[var(--color-forest)] cursor-pointer';
      } else {
        // Available dates - subtle green tint to signal clickability
        className += 'bg-[#4A7C59]/5 hover:bg-[var(--color-copper)]/15 text-[var(--color-forest)] cursor-pointer hover:shadow-sm';
      }

      const handleClick = () => {
        if (isPast || status) return;
        if (!checkIn || (checkIn && checkOut)) {
          setCheckIn(dateStr);
          setCheckOut('');
        } else {
          if (dateStr > checkIn) {
            const start = new Date(checkIn);
            const end = new Date(dateStr);
            let hasConflict = false;
            for (let dt = new Date(start); dt < end; dt.setDate(dt.getDate() + 1)) {
              const ds = dt.toISOString().split('T')[0];
              if (isDateUnavailable(ds)) {
                hasConflict = true;
                break;
              }
            }
            if (hasConflict) {
              setCheckIn(dateStr);
              setCheckOut('');
            } else {
              setCheckOut(dateStr);
            }
          } else {
            setCheckIn(dateStr);
            setCheckOut('');
          }
        }
      };

      days.push(
        <button
          key={dateStr}
          onClick={handleClick}
          className={className}
          type="button"
          title={isPast ? 'Passerat' : status === 'blocked' ? 'Blockerad' : status === 'approved' ? 'Bokad' : status === 'pending' ? 'Inväntar svar' : 'Ledig'}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-sand)' }}>
      {/* Header */}
      <header className="pt-12 pb-8 px-6 text-center">
        <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: 'var(--color-copper-dark)', fontFamily: 'var(--font-body)' }}>
          Trönningenäs
        </p>
        <h1 className="text-4xl md:text-5xl mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
          Viekärrsvägen 4
        </h1>
        <div className="w-16 h-0.5 mx-auto mt-4" style={{ background: 'var(--color-copper)' }} />
      </header>

      <main className="max-w-lg mx-auto px-6 pb-16">

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6 gap-1">
          {steps.map((step, i) => {
            const isCompleted = currentStep > step.num;
            const isActive = currentStep === step.num;
            const isFuture = currentStep < step.num;

            return (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={{
                      background: isCompleted ? 'var(--color-forest)' : isActive ? 'var(--color-copper)' : 'var(--color-sand-dark)',
                      color: isFuture ? 'var(--color-sand)' : 'white',
                    }}
                  >
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <span
                    className="text-[10px] font-medium whitespace-nowrap"
                    style={{ color: isFuture ? 'var(--color-sand-dark)' : isActive ? 'var(--color-forest)' : 'var(--color-forest-light)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="w-6 h-px mx-1 mt-[-14px]" style={{ background: isCompleted ? 'var(--color-forest)' : 'var(--color-sand-dark)' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Single unified card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

          {/* Calendar section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-forest-light)' }}
                type="button"
              >
                &larr;
              </button>
              <h2 className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
                style={{ color: 'var(--color-forest-light)' }}
                type="button"
              >
                &rarr;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(day => (
                <div key={day} className="text-center text-xs font-medium py-1" style={{ color: 'var(--color-forest-light)' }}>
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--color-sand-dark)' }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(74,124,89,0.12)' }} /> Ledig
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(231,76,60,0.15)' }} /> Bokad
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(243,156,18,0.15)' }} /> Inväntar svar
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-forest-light)' }}>
                <div className="w-3 h-3 rounded" style={{ background: 'rgba(45,52,54,0.08)', textDecoration: 'line-through' }} /> Blockerad
              </div>
            </div>

            {/* Help text when no dates selected */}
            {!checkIn && (
              <p className="text-center text-xs mt-4" style={{ color: 'var(--color-forest-light)' }}>
                Tryck på ett datum för att välja incheckning
              </p>
            )}
            {checkIn && !checkOut && (
              <p className="text-center text-xs mt-4" style={{ color: 'var(--color-copper-dark)' }}>
                Bra! Välj nu utcheckningsdatum
              </p>
            )}
          </div>

          {/* Date confirmation + form section */}
          {checkIn && (
            <div className="px-6 pb-6">
              {/* Divider */}
              <div className="h-px mb-6" style={{ background: 'var(--color-sand)' }} />

              {/* Selected dates summary */}
              <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--color-sand)', border: '1px solid var(--color-sand-dark)' }}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-copper-dark)' }}>Incheckning</p>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-forest)' }}>{formatDate(checkIn)}</p>
                  </div>
                  {checkOut && (
                    <>
                      <div className="text-lg" style={{ color: 'var(--color-sand-dark)' }}>&rarr;</div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-copper-dark)' }}>Utcheckning</p>
                        <p className="font-medium text-sm" style={{ color: 'var(--color-forest)' }}>{formatDate(checkOut)}</p>
                      </div>
                    </>
                  )}
                </div>
                {nights > 0 && (
                  <div className="mt-3 pt-3 flex justify-between text-sm" style={{ borderTop: '1px solid var(--color-sand-dark)' }}>
                    <span style={{ color: 'var(--color-forest-light)' }}>{nights} {nights === 1 ? 'natt' : 'nätter'} x {PRICE_PER_NIGHT} kr</span>
                    <span className="font-semibold" style={{ color: 'var(--color-forest)' }}>{(nights * PRICE_PER_NIGHT).toLocaleString('sv-SE')} kr</span>
                  </div>
                )}
              </div>

              {/* Form fields - only show when both dates are selected */}
              {checkOut && (
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-forest-light)' }}>
                        Namn *
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        required
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                        style={{
                          background: 'var(--color-sand)',
                          border: '1px solid var(--color-sand-dark)',
                          color: 'var(--color-forest)',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-copper)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-sand-dark)'}
                        placeholder="Ditt namn"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-forest-light)' }}>
                        E-post
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                        style={{
                          background: 'var(--color-sand)',
                          border: '1px solid var(--color-sand-dark)',
                          color: 'var(--color-forest)',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-copper)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-sand-dark)'}
                        placeholder="För bekräftelse (valfritt)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-forest-light)' }}>
                        Meddelande
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none"
                        style={{
                          background: 'var(--color-sand)',
                          border: '1px solid var(--color-sand-dark)',
                          color: 'var(--color-forest)',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--color-copper)'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-sand-dark)'}
                        placeholder="Något du vill meddela (valfritt)"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!guestName || nights < 1 || loading}
                    className="w-full mt-6 py-3.5 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--color-copper)',
                      color: 'var(--color-white)',
                    }}
                  >
                    {loading ? 'Skickar...' : `Skicka bokningsförfrågan (${(nights * PRICE_PER_NIGHT).toLocaleString('sv-SE')} kr)`}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 rounded-2xl overflow-hidden" style={{ background: 'var(--color-white)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {result.success ? (
              <>
                {/* Success header */}
                <div className="p-6 text-center" style={{ background: 'rgba(76,175,80,0.08)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-forest)', color: 'white', fontSize: '20px' }}>
                    ✓
                  </div>
                  <p className="font-medium text-lg mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
                    Tack for din bokning!
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-forest-light)' }}>
                    Din forfragan har skickats.
                  </p>
                </div>

                {/* What happens next */}
                <div className="p-6">
                  <p className="text-xs uppercase tracking-wider mb-4 font-medium" style={{ color: 'var(--color-copper-dark)' }}>
                    Vad händer nu?
                  </p>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-copper)', color: 'white' }}>3</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-forest)' }}>Avvakta godkännande</p>
                        <p className="text-xs" style={{ color: 'var(--color-forest-light)' }}>Vi granskar din forfragan och aterkommar via mejl.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ background: 'var(--color-sand-dark)', color: 'var(--color-sand)' }}>4</div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-forest-light)' }}>Betala via Swish</p>
                        <p className="text-xs" style={{ color: 'var(--color-forest-light)' }}>Vid godkännande far du Swish-uppgifter i mejlet.</p>
                      </div>
                    </div>
                  </div>

                  {result.swishRef && (
                    <div className="mt-5 p-4 rounded-xl" style={{ background: 'var(--color-sand)', border: '1px solid var(--color-sand-dark)' }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-copper-dark)' }}>
                        Din Swish-referens
                      </p>
                      <p className="text-2xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-forest)' }}>
                        {result.swishRef}
                      </p>
                      <p className="text-xs mt-2" style={{ color: 'var(--color-forest-light)' }}>
                        Spara denna. Du far den ocksa i bekraftelsemejlet.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6">
                <p className="font-medium mb-2" style={{ color: 'var(--color-red)' }}>Ojda</p>
                <p className="text-sm" style={{ color: 'var(--color-forest)' }}>{result.message}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
