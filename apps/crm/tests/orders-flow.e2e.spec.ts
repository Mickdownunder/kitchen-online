import { expect, test, type Page } from '@playwright/test'

const crmEmail = process.env.PW_CRM_EMAIL
const crmPassword = process.env.PW_CRM_PASSWORD

const supplierOrderId = process.env.PW_ORDERS_SUPPLIER_ORDER_ID
const reservationProjectId = process.env.PW_ORDERS_PROJECT_ID
const reservationInstallerEmail = process.env.PW_ORDERS_INSTALLER_EMAIL
const reservationPlanDocumentIds = String(process.env.PW_ORDERS_PLAN_DOCUMENT_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const allowEmailSideEffects = process.env.PW_ORDERS_TEST_EMAILS_ENABLED === '1'

async function loginToCrm(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('ihre@email.de').fill(crmEmail!)
  await page.getByPlaceholder('••••••••').fill(crmPassword!)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
}

test.describe('Orders flow (e2e)', () => {
  test('orders page is reachable after login', async ({ page }) => {
    test.skip(!crmEmail || !crmPassword, 'PW_CRM_EMAIL/PW_CRM_PASSWORD not set')

    await loginToCrm(page)
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: 'Bestellungen' })).toBeVisible()
    await expect(page.getByText('Zu bestellen')).toBeVisible()
    await expect(page.getByText('Reservierung')).toBeVisible()
    await expect(page.getByText('Montagebereit')).toBeVisible()
  })

  test('mark-ordered endpoint is idempotent for same key', async ({ page }) => {
    test.skip(
      !crmEmail || !crmPassword || !supplierOrderId,
      'PW_CRM_EMAIL/PW_CRM_PASSWORD/PW_ORDERS_SUPPLIER_ORDER_ID not set',
    )

    await loginToCrm(page)

    const idempotencyKey = `pw-e2e-mark-${supplierOrderId}-${Date.now()}`
    const api = page.context().request

    const first = await api.post(`/api/supplier-orders/${supplierOrderId}/mark-ordered`, {
      data: { idempotencyKey },
    })
    expect(first.ok()).toBeTruthy()

    const second = await api.post(`/api/supplier-orders/${supplierOrderId}/mark-ordered`, {
      data: { idempotencyKey },
    })
    expect(second.ok()).toBeTruthy()

    const secondPayload = await second.json()
    expect(secondPayload?.success).toBe(true)
  })

  test('reservation request endpoint is idempotent via payload dedupe', async ({ page }) => {
    test.skip(
      !crmEmail ||
        !crmPassword ||
        !reservationProjectId ||
        !reservationInstallerEmail ||
        reservationPlanDocumentIds.length === 0 ||
        !allowEmailSideEffects,
      'Missing PW_ORDERS_* fixtures or PW_ORDERS_TEST_EMAILS_ENABLED=1',
    )

    await loginToCrm(page)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const requestedInstallationDate = tomorrow.toISOString().slice(0, 10)

    const payload = {
      installerCompany: 'E2E Installer',
      installerContact: 'E2E Contact',
      installerEmail: reservationInstallerEmail,
      requestedInstallationDate,
      requestNotes: 'E2E reservation idempotency test',
      planDocumentIds: reservationPlanDocumentIds,
      supplierOrderId: supplierOrderId || undefined,
    }

    const api = page.context().request
    const first = await api.post(`/api/installation-reservations/${reservationProjectId}/request`, {
      data: payload,
    })
    expect(first.ok()).toBeTruthy()
    const firstBody = await first.json()
    expect(firstBody?.success).toBe(true)

    const second = await api.post(`/api/installation-reservations/${reservationProjectId}/request`, {
      data: payload,
    })
    expect(second.ok()).toBeTruthy()
    const secondBody = await second.json()
    expect(secondBody?.success).toBe(true)
  })
})
