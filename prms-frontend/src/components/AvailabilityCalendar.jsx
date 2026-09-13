import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './AvailabilityCalendar.css';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function AvailabilityCalendar({ bookedDates = [], month: initialMonth }) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date());
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next

  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();

  const monthLabel = currentMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const bookedSet = new Set(bookedDates);

  function isBooked(date) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return bookedSet.has(key);
  }

  function isToday(date) {
    const today = new Date();
    return today.getDate() === date && today.getMonth() === monthIndex && today.getFullYear() === year;
  }

  function goPrev() {
    setDirection(-1);
    setCurrentMonth(new Date(year, monthIndex - 1, 1));
  }

  function goNext() {
    setDirection(1);
    setCurrentMonth(new Date(year, monthIndex + 1, 1));
  }

  const variants = {
    enter: (dir) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({
      x: dir > 0 ? -30 : 30,
      opacity: 0,
    }),
  };

  return (
    <div className="availability-calendar">
      {/* Header */}
      <div className="cal-header">
        <button type="button" className="cal-nav-btn" onClick={goPrev} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="cal-month">{monthLabel}</span>
        <button type="button" className="cal-nav-btn" onClick={goNext} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="cal-weekdays">
        {DAYS.map((d) => (
          <span key={d} className="cal-weekday">{d}</span>
        ))}
      </div>

      {/* Days grid with animation */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${year}-${monthIndex}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="cal-days"
        >
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="cal-day cal-day--empty" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const booked = isBooked(day);
            const today = isToday(day);
            return (
              <div
                key={day}
                className={`cal-day ${booked ? 'cal-day--booked' : ''} ${today ? 'cal-day--today' : ''}`}
              >
                {booked && <span className="cal-dot" />}
                <span className="cal-day-number">{day}</span>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-dot cal-dot--legend" /> Booked
        </span>
        <span className="cal-legend-item">
          <span className="cal-day-number-dot" /> Today
        </span>
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
