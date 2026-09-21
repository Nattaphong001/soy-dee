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
        
        # -> Click the 'ผู้ดูแลระบบ' (Admin) tab to switch the form to admin login and then re-observe the page.
        # ผู้ดูแลระบบ button
        elem = page.get_by_role('tab', name='ผู้ดูแลระบบ', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Login) button.
        # กรอกชื่อผู้ใช้ผู้ดูแลระบบ text field
        elem = page.locator('[id="loginId"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Login) button.
        # กรอกรหัสผ่านของคุณ password field
        elem = page.locator('[id="loginPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Login) button.
        # เข้าสู่ระบบ button
        elem = page.locator('[id="loginSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'ประเภทอาหาร' (Food Categories) button in the left sidebar to open the Food Categories section.
        # 🍽️ ประเภทอาหาร button
        elem = page.get_by_role('button', name='ประเภทอาหาร', exact=True)
        await elem.click(timeout=10000)
        
        # -> Enter 'no-such-category-xyz' into the 'ค้นหาชื่อ...' search field, verify a no-results message appears, then click the 'ถัดไป' (Next) pagination button to go to the last page.
        # ค้นหาชื่อ... text field
        elem = page.locator('[id="searchInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("no-such-category-xyz")
        
        # -> Enter 'no-such-category-xyz' into the 'ค้นหาชื่อ...' search field, verify a no-results message appears, then click the 'ถัดไป' (Next) pagination button to go to the last page.
        # ถัดไป button
        elem = page.locator('[id="foodNextBtn"]')
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> A no-results message is shown for the search term "no-such-category-xyz".
        # Assert-outcome: passed
        # Assert: The page displays a no-results message that includes the searched term.
        await expect(page.locator("xpath=/html/body/div[4]/div/div[2]/div").nth(0)).to_contain_text("\u0e44\u0e21\u0e48\u0e1e\u0e1a \"no-such-category-xyz\"", timeout=15000), "The page displays a no-results message that includes the searched term."
        
        # --> Pagination boundary controls are visible and both Prev and Next are disabled on the only page.
        # Assert-outcome: passed
        # Assert: The 'Prev' pagination button is disabled.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[4]/button[1]").nth(0)).to_have_attribute("disabled", "true", timeout=15000), "The 'Prev' pagination button is disabled."
        # Assert-outcome: passed
        # Assert: The 'Next' pagination button is disabled.
        await expect(page.locator("xpath=/html/body/div[4]/main/section[1]/div[4]/button[2]").nth(0)).to_have_attribute("disabled", "true", timeout=15000), "The 'Next' pagination button is disabled."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    