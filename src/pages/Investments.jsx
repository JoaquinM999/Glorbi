import React from 'react'
import SectionHeader from '@/components/ui/SectionHeader'
import IolPortfolioPanel from '@/components/dashboard/IolPortfolioPanel'

export default function Investments() {
  return (
    <div className="space-y-6">
      <SectionHeader title="Inversiones" tag="IOL" />
      <p className="max-w-2xl text-xs font-mono leading-relaxed text-muted-foreground/60">
        Visualiza tu cartera, liquidez, rendimiento y operaciones de InvertirOnline en modo solo lectura.
      </p>
      <IolPortfolioPanel />
    </div>
  )
}
