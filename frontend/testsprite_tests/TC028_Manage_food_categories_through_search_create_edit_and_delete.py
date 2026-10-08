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
        
        # -> Click the 'ผู้ดูแลระบบ' (Admin) tab to switch to the admin login context.
        # ผู้ดูแลระบบ button
        elem = page.get_by_role('tab', name='ผู้ดูแลระบบ', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Log in) button to sign in as admin.
        # กรอกชื่อผู้ใช้ผู้ดูแลระบบ text field
        elem = page.locator('[id="loginId"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("soydee_test01")
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Log in) button to sign in as admin.
        # กรอกรหัสผ่านของคุณ password field
        elem = page.locator('[id="loginPassword"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Soydee123")
        
        # -> Fill the admin username and password fields and click the 'เข้าสู่ระบบ' (Log in) button to sign in as admin.
        # เข้าสู่ระบบ button
        elem = page.locator('[id="loginSubmitBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'ประเภทอาหาร' (Food Categories) button in the left sidebar to open the Food Categories section.
        # 🍽️ ประเภทอาหาร button
        elem = page.get_by_role('button', name='ประเภทอาหาร', exact=True)
        await elem.click(timeout=10000)
        
        # -> Enter 'qa-temp-category-2026-08-24' into the search field labeled 'ค้นหาชื่อ...' and press Enter to run the search.
        # ค้นหาชื่อ... text field
        elem = page.locator('[id="searchInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("qa-temp-category-2026-08-24")
        
        # -> Click the '+ เพิ่ม' (Add) button to open the create food category form.
        # ＋ เพิ่ม button
        elem = page.locator('[id="addItemBtn"]')
        await elem.click(timeout=10000)
        
        # -> Fill the 'ชื่อประเภทอาหาร' field with 'qa-temp-category-2026-08-24', select the '🟢 เขียว' color, and click the 'บันทึก' (Save) button to create the new category.
        # เช่น ผัก / สลัด text field
        elem = page.locator('[id="itemNameInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("qa-temp-category-2026-08-24")
        
        # -> Fill the 'ชื่อประเภทอาหาร' field with 'qa-temp-category-2026-08-24', select the '🟢 เขียว' color, and click the 'บันทึก' (Save) button to create the new category.
        # 🟢 เขียว button
        elem = page.get_by_role('button', name='🟢 เขียว', exact=True)
        await elem.click(timeout=10000)
        
        # -> Fill the 'ชื่อประเภทอาหาร' field with 'qa-temp-category-2026-08-24', select the '🟢 เขียว' color, and click the 'บันทึก' (Save) button to create the new category.
        # บันทึก button
        elem = page.locator('[id="itemSaveBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the 'ถัดไป' (Next) button to go to the second page of food categories and locate 'qa-temp-category-2026-08-24'.
        # ถัดไป button
        elem = page.locator('[id="foodNextBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the '✏️' Edit button for the created category 'qa-temp-category-2026-08-24' to open the edit form.
        # แก้ไข button
        elem = page.get_by_text('qa-temp-category-2026-08-24 🟢 เขียว', exact=True).locator("xpath=ancestor-or-self::*[.//button][1]").get_by_role('button', name='แก้ไข', exact=True)
        await elem.click(timeout=10000)
        
        # -> Change the category name to 'qa-temp-category-2026-08-24-updated', select the 'เหลือง' (Yellow) color, and click the 'บันทึก' (Save) button.
        # เช่น ผัก / สลัด text field
        elem = page.locator('[id="itemNameInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("qa-temp-category-2026-08-24-updated")
        
        # -> Change the category name to 'qa-temp-category-2026-08-24-updated', select the 'เหลือง' (Yellow) color, and click the 'บันทึก' (Save) button.
        # 🟡 เหลือง button
        elem = page.get_by_role('button', name='🟡 เหลือง', exact=True)
        await elem.click(timeout=10000)
        
        # -> Change the category name to 'qa-temp-category-2026-08-24-updated', select the 'เหลือง' (Yellow) color, and click the 'บันทึก' (Save) button.
        # บันทึก button
        elem = page.locator('[id="itemSaveBtn"]')
        await elem.click(timeout=10000)
        
        # -> Click the '🗑️' (delete) button for the 'qa-temp-category-2026-08-24-updated' row to open the deletion confirmation.
        # 🗑️ button
        elem = page.get_by_text('qa-temp-category-2026-08-24-updated', exact=True).locator("xpath=ancestor-or-self::*[.//button][1]").get_by_role('button', name='ลบ', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the red 'ลบรายการ' (Delete item) button in the confirmation dialog to confirm deletion of 'qa-temp-category-2026-08-24-updated'.
        # ลบรายการ button
        elem = page.locator('[id="confirmBtnYes"]')
        await elem.click(timeout=10000)
        
        # -> Search for 'qa-temp-category-2026-08-24-updated' in the search box and verify that no results are returned (confirm deletion).
        # ค้นหาชื่อ... text field
        elem = page.locator('[id="searchInput"]')
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("qa-temp-category-2026-08-24-updated")
        
        # --> Assertions to verify final state
        
        # --> The search input contains the searched name "qa-temp-category-2026-08-24-updated".
        # Assert-outcome: passed
        # Assert: Search input value equals the searched name.
        await expect(page.locator("xpath=/html/body/div[4]/div/div[2]/div/input").nth(0)).to_have_value("qa-temp-category-2026-08-24-updated", timeout=15000), "Search input value equals the searched name."
        
        # --> The food category list shows no results for "qa-temp-category-2026-08-24-updated".
        # Assert-outcome: passed
        # Assert: The list area contains the not-found message with the searched name.
        await expect(page.locator("xpath=/html/body/div[4]/div/div[2]/div").nth(0)).to_contain_text("\u0e44\u0e21\u0e48\u0e1e\u0e1a \"qa-temp-category-2026-08-24-updated\"", timeout=15000), "The list area contains the not-found message with the searched name."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    