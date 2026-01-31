import { test, expect } from '@playwright/test'

const crmEmail = process.env.PW_CRM_EMAIL
const crmPassword = process.env.PW_CRM_PASSWORD
const portalAccessCode = process.env.PW_PORTAL_ACCESS_CODE
const portalEmail = process.env.PW_PORTAL_EMAIL
const portalPassword = process.env.PW_PORTAL_PASSWORD

test.describe('Unauthenticated guards', () => {
  test('CRM and Portal redirects', async ({ page, request }) => {
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/portal\/login/)
    await expect(page.getByRole('heading', { name: 'Kundenportal' })).toBeVisible()

    await page.goto('/tickets')
    await expect(page).toHaveURL(/\/login/)

    const apiResponse = await request.get('/api/tickets')
    expect(apiResponse.status()).toBe(401)
  })
})

test.describe('CRM login', () => {
  test('login succeeds', async ({ page }) => {
    test.skip(!crmEmail || !crmPassword, 'PW_CRM_EMAIL/PW_CRM_PASSWORD not set')

    await page.goto('/login')
    await page.getByPlaceholder('ihre@email.de').fill(crmEmail!)
    await page.getByPlaceholder('••••••••').fill(crmPassword!)
    await page.getByRole('button', { name: 'Anmelden' }).click()

    const errorAlert = page.locator('div.border-red-200')
    await Promise.race([
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
      errorAlert.waitFor({ state: 'visible', timeout: 20_000 }),
    ])

    if (await errorAlert.isVisible()) {
      const message = (await errorAlert.textContent())?.trim() || 'Login fehlgeschlagen'
      throw new Error(`CRM login failed: ${message}`)
    }
  })
})

test.describe('Portal login', () => {
  test('login succeeds', async ({ page }) => {
    const hasAccessCode = Boolean(portalAccessCode)
    const hasEmailLogin = Boolean(portalEmail && portalPassword)

    test.skip(!hasAccessCode && !hasEmailLogin, 'Portal credentials not set')

    await page.goto('/portal/login')

    if (hasAccessCode) {
      await page.getByLabel('Projektcode').fill(portalAccessCode!)
    } else {
      await page.getByRole('button', { name: 'E-Mail Login' }).click()
      await page.getByLabel('E-Mail Adresse').fill(portalEmail!)
      await page.getByLabel('Passwort').fill(portalPassword!)
    }

    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page).toHaveURL(/\/portal(\/setup-password)?/, { timeout: 20_000 })
  })
})
