interface ItemTotalsPanelProps {
  calculations: {
    netTotal: number
    taxTotal: number
    grossTotal: number
    totalPurchaseNet: number
    profitNet: number | null
    marginPercent: number | null
    taxByRate: Record<number, number>
  }
  canViewPurchasePrices: boolean
  canViewMargins: boolean
  formatNumber: (value: number | undefined | null, showZero?: boolean) => string
}

export function ItemTotalsPanel({
  calculations,
  canViewPurchasePrices,
  canViewMargins,
  formatNumber,
}: ItemTotalsPanelProps) {
  return (
    <div className="rounded-xl bg-slate-900 p-6 text-white">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Netto</div>
          <div className="text-lg font-black text-white">
            {formatNumber(calculations.netTotal)
              ? `${formatNumber(calculations.netTotal)} €`
              : '0,00 €'}
          </div>
        </div>
        {Object.entries(calculations.taxByRate).map(([rate, amount]) => (
          <div key={rate}>
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              MwSt. {rate}%
            </div>
            <div className="text-lg font-black text-white">
              {formatNumber(amount) ? `${formatNumber(amount)} €` : '0,00 €'}
            </div>
          </div>
        ))}
        <div>
          <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Brutto</div>
          <div className="text-2xl font-black text-amber-500">
            {formatNumber(calculations.grossTotal)
              ? `${formatNumber(calculations.grossTotal)} €`
              : '0,00 €'}
          </div>
        </div>
        {canViewPurchasePrices && (
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
              EK-Gesamt
            </div>
            <div className="text-lg font-black text-slate-300">
              {formatNumber(calculations.totalPurchaseNet) ? (
                `${formatNumber(calculations.totalPurchaseNet)} €`
              ) : (
                <span className="text-sm italic text-slate-500">noch nicht erfasst</span>
              )}
            </div>
          </div>
        )}
        {canViewMargins && (
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">Gewinn</div>
            {calculations.totalPurchaseNet > 0 &&
            calculations.profitNet != null &&
            calculations.marginPercent != null ? (
              <>
                <div
                  className={`text-lg font-black ${calculations.profitNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatNumber(calculations.profitNet)
                    ? `${formatNumber(calculations.profitNet)} €`
                    : '0,00 €'}
                </div>
                <div
                  className={`mt-1 text-xs font-bold ${calculations.marginPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  Marge: {formatNumber(calculations.marginPercent, true)}%
                </div>
              </>
            ) : (
              <div className="text-sm italic text-slate-500">
                Wird angezeigt, sobald EK-Preise erfasst wurden
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
