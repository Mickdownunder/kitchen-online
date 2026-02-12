'use client'

import React from 'react'
import type { CustomerProject } from '@/types'
import type { AccountingDataState } from '@/components/useAccountingData'
import SupplierInvoicesView from '@/components/accounting/SupplierInvoicesView'
import BankReconciliationView from '@/components/accounting/BankReconciliationView'
import { AccountingControls } from '@/components/accounting/AccountingControls'
import { AccountingOverviewTab } from '@/components/accounting/AccountingOverviewTab'
import { AccountingOutgoingTab } from '@/components/accounting/AccountingOutgoingTab'
import InboundDocumentInboxView from '@/components/accounting/InboundDocumentInboxView'

interface AccountingViewContentProps extends AccountingDataState {
  projects: CustomerProject[]
}

const AccountingViewContent: React.FC<AccountingViewContentProps> = ({
  projects,
  activeTab,
  setActiveTab,
  timeRange,
  setTimeRange,
  selectedMonth,
  setSelectedMonth,
  selectedQuarter,
  setSelectedQuarter,
  selectedYear,
  setSelectedYear,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  periodLabel,
  availableMonths,
  availableYears,
  filteredInvoices,
  supplierInvoices,
  missingInvoices,
  uvaData,
  totals,
  inputTaxData,
  inputTaxTotals,
  zahllast,
  showDetails,
  setShowDetails,
  handleExport,
  isExporting,
  loadSupplierInvoices,
}) => {
  return (
    <div className="animate-in fade-in space-y-8 duration-700">
      <AccountingControls
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedQuarter={selectedQuarter}
        setSelectedQuarter={setSelectedQuarter}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        periodLabel={periodLabel}
        availableMonths={availableMonths}
        availableYears={availableYears}
        outgoingInvoiceCount={filteredInvoices.length}
        incomingInvoiceCount={supplierInvoices.length}
      />

      {activeTab === 'bank' && <BankReconciliationView />}

      {activeTab === 'incoming' && (
        <SupplierInvoicesView projects={projects} onStatsChange={() => loadSupplierInvoices()} />
      )}

      {activeTab === 'inbound' && <InboundDocumentInboxView projects={projects} />}

      {activeTab === 'overview' && (
        <AccountingOverviewTab
          periodLabel={periodLabel}
          totals={totals}
          inputTaxTotals={inputTaxTotals}
          zahllast={zahllast}
          showDetails={showDetails}
          setShowDetails={setShowDetails}
          uvaData={uvaData}
          inputTaxData={inputTaxData}
          supplierInvoices={supplierInvoices}
          filteredInvoices={filteredInvoices}
          handleExport={handleExport}
          isExporting={isExporting}
        />
      )}

      {activeTab === 'outgoing' && (
        <AccountingOutgoingTab
          periodLabel={periodLabel}
          missingInvoices={missingInvoices}
          filteredInvoices={filteredInvoices}
          totals={totals}
          uvaData={uvaData}
          showDetails={showDetails}
          setShowDetails={setShowDetails}
          handleExport={handleExport}
          isExporting={isExporting}
        />
      )}
    </div>
  )
}

export default AccountingViewContent
