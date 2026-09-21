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
        
        # -> Open the Activity Record page by navigating to /views/user/activity-record.html
        await page.goto("http://localhost:5500/views/user/activity-record.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Fill the username and password fields and click the 'เข้าสู่ระบบ' (Login) button to sign in.
        # กรอกชื่อผู้ใช้ของคุณ text field
        elem = page.locator('[id="loginId"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the username and password fields and click the 'เข้าสู่ระบบ' (Login) button to sign in.
        # กรอกรหัสผ่านของคุณ password field
        elem = page.locator('[id="loginPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the username and password fields and click the 'เข้าสู่ระบบ' (Login) button to sign in.
        # เข้าสู่ระบบ button
        elem = page.locator('[id="loginSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Open the 'Activity Record' page.
        await page.goto("http://localhost:5500/views/user/activity-record.html")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'วันนี้' (Today) button to set the selected date to today and let the UI update.
        # 📍 วันนี้ button
        elem = page.locator('[id="todayBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'ออกกำลังกาย' activity button to select it and allow the UI to update.
        # 🏃 ออกกำลังกาย button
        elem = page.get_by_role('option', name='🏃 ออกกำลังกาย', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the '+ เพิ่มลงบันทึก' (Add to log) button to save the selected activity and duration for today.
        # + เพิ่มลงบันทึก button
        elem = page.locator('[id="addEntryBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> A new activity entry appears in today's 'บันทึกของวันนี้' list for the selected day.
        await page.locator("xpath=/html/body/div[4]/main/section[4]/div[2]/div[1]/div[2]/button[1]").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: passed
        # Assert: An entry's edit (✏️) button is visible in today's entries list, indicating an activity entry is present.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[4]/div[2]/div[1]/div[2]/button[1]").nth(0)).to_be_visible(timeout=15000), "An entry's edit (\u270f\ufe0f) button is visible in today's entries list, indicating an activity entry is present."
        
        # --> The summary updated to show 2 activities and a total duration of 1 ชม.
        # Assert-outcome: passed
        # Assert: The activities count displays '2'.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[1]/div[2]/span").nth(0)).to_have_text("2", timeout=15000), "The activities count displays '2'."
        # Assert-outcome: passed
        # Assert: The total duration displays '1 ชม'.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[2]/div[2]/span").nth(0)).to_have_text("1 \u0e0a\u0e21", timeout=15000), "The total duration displays '1 \u0e0a\u0e21'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    