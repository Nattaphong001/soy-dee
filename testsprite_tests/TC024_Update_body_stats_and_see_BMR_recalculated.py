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
        
        # -> Fill the username field with 'soydee_test01', fill the password field with 'Soydee123', then click the 'เข้าสู่ระบบ' (Log in) button.
        # กรอกชื่อผู้ใช้ของคุณ text field
        elem = page.locator('[id="loginId"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the username field with 'soydee_test01', fill the password field with 'Soydee123', then click the 'เข้าสู่ระบบ' (Log in) button.
        # กรอกรหัสผ่านของคุณ password field
        elem = page.locator('[id="loginPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the username field with 'soydee_test01', fill the password field with 'Soydee123', then click the 'เข้าสู่ระบบ' (Log in) button.
        # เข้าสู่ระบบ button
        elem = page.locator('[id="loginSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the '✏️  แก้ไขข้อมูล' (Edit) button to open the body stats editor.
        # ✏️ แก้ไขข้อมูล link
        elem = page.get_by_role('link', name='แก้ไขข้อมูลร่างกาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Change the Weight field to '75' and click the 'บันทึกการเปลี่ยนแปลง' (Save changes) button.
        # เช่น 65 number field
        elem = page.locator('[id="weightInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("75")
        
        # -> Change the Weight field to '75' and click the 'บันทึกการเปลี่ยนแปลง' (Save changes) button.
        # บันทึกการเปลี่ยนแปลง button
        elem = page.locator('[id="saveProfileBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The profile body tab shows the updated weight value of 75.
        # Assert-outcome: passed
        # Assert: The weight input's value is 75.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[2]/div[1]/label[3]/input").nth(0)).to_have_value("75", timeout=15000), "The weight input's value is 75."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    