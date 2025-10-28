from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Sign up a new user
    page.goto("http://localhost:3000/signup")
    page.locator('input[name="email"]').fill("testuser@example.com")
    page.locator('input[name="password"]').fill("password123")
    page.locator('button[type="submit"]').click()

    # Wait for the confirmation email to be "sent" in a dev environment
    # and then navigate to the blog editor
    time.sleep(2) # In a real scenario, you'd check for a UI change

    # Navigate to the blog editor page
    page.goto("http://localhost:3000/app/blog-admin/posts/new")

    # Wait for the editor to be visible
    editor = page.locator('.prose')
    editor.wait_for(state='visible')

    # Take the final screenshot
    page.screenshot(path="jules-scratch/verification/tiptap_editor_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
