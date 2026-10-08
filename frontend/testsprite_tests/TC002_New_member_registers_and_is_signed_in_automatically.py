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
        
        # -> Open the registration page by navigating to the Register page (the 'ลงทะเบียนเลย' / 'Register now' link).
        await page.goto("http://localhost:5500/views/auth/register.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the full name, username, password, confirm password fields and click the 'ชาย' (Male) gender button.
        # ชื่อ-นามสกุลของคุณ text field
        elem = page.locator('[id="regFullName"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee Tester")
        
        # -> Fill the full name, username, password, confirm password fields and click the 'ชาย' (Male) gender button.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the full name, username, password, confirm password fields and click the 'ชาย' (Male) gender button.
        # อย่างน้อย 8 ตัวอักษร password field
        elem = page.locator('[id="regPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the full name, username, password, confirm password fields and click the 'ชาย' (Male) gender button.
        # กรอกรหัสผ่านอีกครั้ง password field
        elem = page.locator('[id="regPasswordConfirm"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the full name, username, password, confirm password fields and click the 'ชาย' (Male) gender button.
        # ชาย button
        elem = page.get_by_role('button', name='ชาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill birth date, height (170 cm) and weight (65 kg), choose the '⚖️ รักษาน้ำหนัก' goal, and click the 'ลงทะเบียน' (Register) button.
        # date field
        elem = page.locator('[id="regBirthDate"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1990-05-05")
        
        # -> Fill birth date, height (170 cm) and weight (65 kg), choose the '⚖️ รักษาน้ำหนัก' goal, and click the 'ลงทะเบียน' (Register) button.
        # เช่น 170 number field
        elem = page.locator('[id="regHeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("170")
        
        # -> Fill birth date, height (170 cm) and weight (65 kg), choose the '⚖️ รักษาน้ำหนัก' goal, and click the 'ลงทะเบียน' (Register) button.
        # เช่น 65 number field
        elem = page.locator('[id="regWeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("65")
        
        # -> Fill birth date, height (170 cm) and weight (65 kg), choose the '⚖️ รักษาน้ำหนัก' goal, and click the 'ลงทะเบียน' (Register) button.
        # ⚖️ รักษาน้ำหนัก button
        elem = page.get_by_role('button', name='⚖️ รักษาน้ำหนัก', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill birth date, height (170 cm) and weight (65 kg), choose the '⚖️ รักษาน้ำหนัก' goal, and click the 'ลงทะเบียน' (Register) button.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Enter a new unique username into the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' (Register) button to resubmit the form.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01_20260824")
        
        # -> Enter a new unique username into the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' (Register) button to resubmit the form.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Dashboard page is displayed at /views/user/index.html.
        # Assert-outcome: passed
        # Assert: The browser navigated to the user dashboard URL.
        await expect(page).to_have_url(re.compile("/views/user/index\\.html"), timeout=15000), "The browser navigated to the user dashboard URL."
        
        # --> Signed-in user's display name 'Soydee Tester' is visible in the header, indicating an active session.
        # Assert-outcome: passed
        # Assert: The header shows the user's display name 'Soydee Tester', confirming the user is signed in.
        await expect(page.locator("xpath=/html/body/div[4]/div/header/div/a").nth(0)).to_contain_text("Soydee Tester", timeout=15000), "The header shows the user's display name 'Soydee Tester', confirming the user is signed in."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    