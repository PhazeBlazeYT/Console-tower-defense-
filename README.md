diff --git a/README.md b/README.md
index f5605102a2116c609d90da8da0d86200b30d3240..7150cb200b1cf11f28121a63b029a03f7ed6699b 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,40 @@
-# Console-tower-defense-
-a tower defense game
+# Console Tower Defense (Single Copy-Paste Script)
+
+Copy `console-game.js` and paste it into Chrome DevTools Console.
+
+## New in this version
+- Added a **Home Screen** with map selection cards and a `START GAME` button.
+- Added **Easy / Medium / Hard / Impoppable** difficulty selection on Home Screen.
+- Added persistent **coin bank + Monkey Money** progression saved in `localStorage`.
+- Added premium towers in SHOP: **Super**, **Laser**, **Plasma**, and **Sun God**, unlocked with coins (not level).
+- Added a separate **Home Screen premium unlock section** for purchasing premium towers.
+- Added expanded upgrade logic with crosspath limits, named upgrade tiers, **PRO** and **PRO Mastery** tiers.
+- Added true **3-path upgrades** (P1/P2/P3), Tier 1–5, with path-lock rules.
+- Added targeting mode **Last** in addition to First/Strong/Close.
+- Added new towers: **Farm** (passive income) and **Support** (non-village aura support).
+- Removed Agents UI and simplified controls for cleaner panel interaction.
+- Right panel now shows only **4 towers at a time** (scroll to view more).
+- Speed buttons reduced to only **2x, 5x, 10x** (as requested).
+- Added **Auto Next Wave** toggle button.
+- Added password-protected **Admin Panel** (Ctrl+Shift+A or Admin button) with debug economy/wave/spawn tools.
+- Fixed clicking reliability by listening on `pointerdown` at capture phase.
+
+## Controls
+- Home Screen: click a map card, then click `START GAME`.
+- Pick **Easy/Medium/Hard/Impoppable** before starting a run.
+- Home Screen shows estimated win coin rewards for Easy/Medium/Hard.
+- In game: click `Home Screen` button to return to map select.
+- Buy premium tower unlocks from the **Home Screen premium section**.
+- Click tower cards in SHOP to select already-unlocked towers.
+- Mouse wheel over the right panel to scroll the tower list.
+- Click on open ground (not on the path and not too close to another tower) to place tower.
+- Click `Auto Next` to auto-start the next round.
+- Click speed buttons (2x / 5x / 10x) to change simulation speed.
+- Use Admin Login to open the admin console for testing/debug and extra spawn controls.
+- Press `P` to buy Pro Mastery for the selected eligible tower.
+- Click `START WAVE` to spawn enemies.
+- Click a placed tower to open upgrade and targeting controls.
+- Selected tower panel includes a **Sell Tower** button (refund).
+- Beat wave 45 to win and bank coins + Monkey Money.
+- Press `R` after game over to restart run.
+- Press `Esc` anytime to close overlay.
