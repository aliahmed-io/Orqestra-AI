import { expect, test } from "@playwright/test";

test("end-to-end navigation from landing page across Orqestra AI workspace", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Understand the work behind the work." })
  ).toBeVisible();

  await page.getByRole("link", { name: "Open Live Workspace" }).first().click();
  await expect(page.getByRole("heading", { name: "Executive Overview" })).toBeVisible();
  await expect(page.getByText("Total Cases").first()).toBeVisible();

  await page.getByRole("link", { name: "Process Discovery Studio" }).click();
  await expect(page.getByRole("heading", { name: "Process Discovery Studio" })).toBeVisible();
  await expect(page.locator(".react-flow")).toBeVisible();

  await page.getByRole("link", { name: "Case Explorer" }).click();
  await expect(page.getByRole("heading", { name: "Case Explorer" })).toBeVisible();

  await page.getByRole("link", { name: "Bottleneck Intelligence" }).click();
  await expect(page.getByRole("heading", { name: "Bottleneck Intelligence" })).toBeVisible();

  await page.getByRole("link", { name: "Variant Explorer" }).click();
  await expect(page.getByRole("heading", { name: "Process Variant Explorer" })).toBeVisible();

  await page.getByRole("link", { name: "AI Delay Prediction" }).click();
  await expect(page.getByRole("heading", { name: "AI Delay Prediction" })).toBeVisible();

  await page.getByRole("link", { name: "Recommendations" }).click();
  await expect(page.getByRole("heading", { name: "Recommendation Engine" })).toBeVisible();

  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Management Reports" })).toBeVisible();
});
