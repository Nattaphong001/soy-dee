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
        
        # -> Open the registration page by navigating to the registration URL and load the registration form.
        await page.goto("http://localhost:5500/views/auth/register.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the registration fields (ชื่อที่แสดง, ชื่อผู้ใช้, รหัสผ่าน, ยืนยันรหัสผ่าน) and select the 'ชาย' gender button.
        # ชื่อ-นามสกุลของคุณ text field
        elem = page.locator('[id="regFullName"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee Test")
        
        # -> Fill the registration fields (ชื่อที่แสดง, ชื่อผู้ใช้, รหัสผ่าน, ยืนยันรหัสผ่าน) and select the 'ชาย' gender button.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the registration fields (ชื่อที่แสดง, ชื่อผู้ใช้, รหัสผ่าน, ยืนยันรหัสผ่าน) and select the 'ชาย' gender button.
        # อย่างน้อย 8 ตัวอักษร password field
        elem = page.locator('[id="regPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the registration fields (ชื่อที่แสดง, ชื่อผู้ใช้, รหัสผ่าน, ยืนยันรหัสผ่าน) and select the 'ชาย' gender button.
        # กรอกรหัสผ่านอีกครั้ง password field
        elem = page.locator('[id="regPasswordConfirm"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the registration fields (ชื่อที่แสดง, ชื่อผู้ใช้, รหัสผ่าน, ยืนยันรหัสผ่าน) and select the 'ชาย' gender button.
        # ชาย button
        elem = page.get_by_role('button', name='ชาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the birthdate, height, and weight fields, select the '🔻 ลดน้ำหนัก' goal button, and click the 'ลงทะเบียน' button to submit the registration.
        # date field
        elem = page.locator('[id="regBirthDate"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("1990-01-01")
        
        # -> Fill the birthdate, height, and weight fields, select the '🔻 ลดน้ำหนัก' goal button, and click the 'ลงทะเบียน' button to submit the registration.
        # เช่น 170 number field
        elem = page.locator('[id="regHeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("170")
        
        # -> Fill the birthdate, height, and weight fields, select the '🔻 ลดน้ำหนัก' goal button, and click the 'ลงทะเบียน' button to submit the registration.
        # เช่น 65 number field
        elem = page.locator('[id="regWeight"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("70")
        
        # -> Fill the birthdate, height, and weight fields, select the '🔻 ลดน้ำหนัก' goal button, and click the 'ลงทะเบียน' button to submit the registration.
        # 🔻 ลดน้ำหนัก button
        elem = page.get_by_role('button', name='🔻 ลดน้ำหนัก', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the birthdate, height, and weight fields, select the '🔻 ลดน้ำหนัก' goal button, and click the 'ลงทะเบียน' button to submit the registration.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Enter a new username in the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' button to retry registration.
        # อย่างน้อย 4 ตัวอักษร text field
        elem = page.locator('[id="regUsername"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01_2")
        
        # -> Enter a new username in the 'ชื่อผู้ใช้ (Username)' field and click the 'ลงทะเบียน' button to retry registration.
        # ลงทะเบียน button
        elem = page.locator('[id="registerSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The member dashboard is displayed showing the new member's display name.
        # Assert-outcome: passed
        # Assert: Dashboard displays the user's display name.
        await expect(page.locator("xpath=/html/body/div[4]/div/header/div/a").nth(0)).to_contain_text("Soydee Test", timeout=15000), "Dashboard displays the user's display name."
        
        # --> An authenticated session is established for the new member as the dashboard shows the member's gender.
        # Assert-outcome: passed
        # Assert: User gender 'ชาย' is visible on the dashboard, indicating the profile is loaded.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[2]/div[1]/div[2]/span").nth(0)).to_have_text("\u0e0a\u0e32\u0e22", timeout=15000), "User gender '\u0e0a\u0e32\u0e22' is visible on the dashboard, indicating the profile is loaded."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    