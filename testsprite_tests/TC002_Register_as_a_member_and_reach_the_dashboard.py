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
        
        # -> Click the 'ลงทะเบียนเลย' (Register) link shown on the login page to open the member registration form.
        # ลงทะเบียนเลย link
        elem = page.get_by_role('link', name='ลงทะเบียนเลย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the display name, username, password, confirm password fields and select the 'ชาย' (male) gender option.
        # ชื่อ-นามสกุลของคุณ text field
        elem = page.locator('[id="regFullName"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Test User")
        
        # -> Fill the display name, username, password, confirm password fields and select the 'ชาย' (male) gender option.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the display name, username, password, confirm password fields and select the 'ชาย' (male) gender option.
        # อย่างน้อย 8 ตัวอักษร password field
        elem = page.locator('[id="regPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the display name, username, password, confirm password fields and select the 'ชาย' (male) gender option.
        # กรอกรหัสผ่านอีกครั้ง password field
        elem = page.locator('[id="regPasswordConfirm"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the display name, username, password, confirm password fields and select the 'ชาย' (male) gender option.
        # ชาย button
        elem = page.get_by_role('button', name='ชาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'วันเกิด' (birth date), 'ส่วนสูง (ซม.)' (height), and 'น้ำหนัก (กก.)' (weight) fields, select goal '💪 เพิ่มกล้ามเนื้อ', then click the 'ลงทะเบียน' (Register) button.
        # date field
        elem = page.locator('[id="regBirthDate"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1990-01-01")
        
        # -> Fill the 'วันเกิด' (birth date), 'ส่วนสูง (ซม.)' (height), and 'น้ำหนัก (กก.)' (weight) fields, select goal '💪 เพิ่มกล้ามเนื้อ', then click the 'ลงทะเบียน' (Register) button.
        # เช่น 170 number field
        elem = page.locator('[id="regHeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("170")
        
        # -> Fill the 'วันเกิด' (birth date), 'ส่วนสูง (ซม.)' (height), and 'น้ำหนัก (กก.)' (weight) fields, select goal '💪 เพิ่มกล้ามเนื้อ', then click the 'ลงทะเบียน' (Register) button.
        # เช่น 65 number field
        elem = page.locator('[id="regWeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("70")
        
        # -> Fill the 'วันเกิด' (birth date), 'ส่วนสูง (ซม.)' (height), and 'น้ำหนัก (กก.)' (weight) fields, select goal '💪 เพิ่มกล้ามเนื้อ', then click the 'ลงทะเบียน' (Register) button.
        # 💪 เพิ่มกล้ามเนื้อ button
        elem = page.get_by_role('button', name='💪 เพิ่มกล้ามเนื้อ', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'วันเกิด' (birth date), 'ส่วนสูง (ซม.)' (height), and 'น้ำหนัก (กก.)' (weight) fields, select goal '💪 เพิ่มกล้ามเนื้อ', then click the 'ลงทะเบียน' (Register) button.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Enter a new username into the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' (Register) button to retry registration.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01_1")
        
        # -> Enter a new username into the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' (Register) button to retry registration.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Member dashboard page is displayed (navigated to /views/user/index.html).
        # Assert-outcome: passed
        # Assert: The browser URL contains /views/user/index.html, indicating the dashboard is shown.
        await expect(page).to_have_url(re.compile("/views/user/index\\.html"), timeout=15000), "The browser URL contains /views/user/index.html, indicating the dashboard is shown."
        
        # --> Member profile summary is visible showing the gender value 'ชาย'.
        # Assert-outcome: passed
        # Assert: The profile gender element displays 'ชาย'.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[2]/div[1]/div[2]/span").nth(0)).to_have_text("\u0e0a\u0e32\u0e22", timeout=15000), "The profile gender element displays '\u0e0a\u0e32\u0e22'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    