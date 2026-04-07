import React, { createContext, useContext, useState, useMemo } from "react";
import { subDays, startOfDay, isAfter, parseISO } from "date-fns";

export const PERIODS = [
  { key: "today",  label: "Hoy",      days: 1  },
  { key: "7d",     label: "7 días",   days: 7  },
  { key: "30d",    label: "30 días",  days: 30 },
  { key: "all",    label: "Todo",     days: null },
];

const PeriodContext = createContext(null);

export function PeriodProvider({ children }) {
  const [activePeriod, setActivePeriod] = useState("30d");

  const cutoffDate = useMemo(() => {
    const p = PERIODS.find(p => p.key === activePeriod);
    if (!p || p.days === null) return null;
    return startOfDay(subDays(new Date(), p.days - 1));
  }, [activePeriod]);

  function filterByPeriod(items, dateField = "date") {
    if (!cutoffDate) return items;
    return items.filter(item => {
      const raw = item[dateField];
      if (!raw) return false;
      const d = typeof raw === "string" ? parseISO(raw) : new Date(raw);
      return isAfter(d, cutoffDate) || d.getTime() === cutoffDate.getTime();
    });
  }

  return (
    <PeriodContext.Provider value={{ activePeriod, setActivePeriod, cutoffDate, filterByPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used inside PeriodProvider");
  return ctx;
}