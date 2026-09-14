import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "owner@salonpiloto.demo";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "ChangeMe123!";

test("la dueña puede iniciar sesión y ver el dashboard del salón piloto", async ({
  page,
}) => {
  await page.goto("/es/login");

  await page.getByLabel("Correo electrónico").fill(DEMO_EMAIL);
  await page.getByLabel("Contraseña").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/es\/dashboard/);
  await expect(page.getByText("Salón Piloto Georgetown")).toBeVisible();
});

test("el portal funciona en viewport móvil", async ({ page }) => {
  await page.goto("/es/login");
  await expect(page.getByRole("heading", { name: "Inicia sesión" })).toBeVisible();
});
