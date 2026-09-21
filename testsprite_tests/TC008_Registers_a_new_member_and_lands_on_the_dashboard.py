import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5500/views/auth/welcome.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'ลงทะเบียนเลย' link (text: 'ลงทะเบียนเลย') to open the registration page.
        # ลงทะเบียนเลย link
        elem = page.get_by_role('link', name='ลงทะเบียนเลย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'ชื่อผู้ใช้ (Username)' field and complete the registration form, then click the 'ลงทะเบียน' (Register) button.
        # ชื่อ-นามสกุลของคุณ text field
        elem = page.locator('[id="regFullName"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee Test01")
        
        # -> Fill the 'ชื่อผู้ใช้ (Username)' field and complete the registration form, then click the 'ลงทะเบียน' (Register) button.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the 'ชื่อผู้ใช้ (Username)' field and complete the registration form, then click the 'ลงทะเบียน' (Register) button.
        # อย่างน้อย 8 ตัวอักษร password field
        elem = page.locator('[id="regPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the 'ชื่อผู้ใช้ (Username)' field and complete the registration form, then click the 'ลงทะเบียน' (Register) button.
        # กรอกรหัสผ่านอีกครั้ง password field
        elem = page.locator('[id="regPasswordConfirm"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the 'ชื่อผู้ใช้ (Username)' field and complete the registration form, then click the 'ลงทะเบียน' (Register) button.
        # ชาย button
        elem = page.get_by_role('button', name='ชาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the 'ระดับกิจกรรม' (Activity level) dropdown after entering birth date, height, and weight.
        # date field
        elem = page.locator('[id="regBirthDate"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1990-01-01")
        
        # -> Open the 'ระดับกิจกรรม' (Activity level) dropdown after entering birth date, height, and weight.
        # เช่น 170 number field
        elem = page.locator('[id="regHeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("170")
        
        # -> Open the 'ระดับกิจกรรม' (Activity level) dropdown after entering birth date, height, and weight.
        # เช่น 65 number field
        elem = page.locator('[id="regWeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("70")
        
        # -> Open the 'ระดับกิจกรรม' (Activity level) dropdown after entering birth date, height, and weight.
        # น้อย (นั่งทำงาน แทบไม่ออกกำลังกาย) ปานกลาง... dropdown
        elem = page.locator('[id="regActivitySelect"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'ลงทะเบียน' button to submit the registration form and create the account.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Replace the username with a unique value and click the 'ลงทะเบียน' button to submit the registration form
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01_20260824_1")
        
        # -> Replace the username with a unique value and click the 'ลงทะเบียน' button to submit the registration form
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The app navigated to the member dashboard page after registration.
        # Assert-outcome: passed
        # Assert: The current URL contains '/views/user/index.html', indicating the dashboard loaded.
        await expect(page).to_have_url(re.compile("views/user/index\\.html"), timeout=15000), "The current URL contains '/views/user/index.html', indicating the dashboard loaded."
        
        # --> A signed-in account is shown on the dashboard (profile controls and account name are visible).
        await page.locator("xpath=/html/body/div[4]/div/div/a").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: passed
        # Assert: The profile edit link ('✏️ แก้ไขข้อมูล') is visible, indicating a signed-in user session.
        await expect(page.locator("xpath=/html/body/div[4]/div/div/a").nth(0)).to_be_visible(timeout=15000), "The profile edit link ('\u270f\ufe0f \u0e41\u0e01\u0e49\u0e44\u0e02\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25') is visible, indicating a signed-in user session."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    