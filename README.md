diff --git a/README.md b/README.md
index f5605102a2116c609d90da8da0d86200b30d3240..01194445f1e72ea9a63d065c5fc8320eb118677e 100644
--- a/README.md
+++ b/README.md
@@ -1,2 +1,23 @@
-# Console-tower-defense-
-a tower defense game
+# Console Tower Defense (Single Copy-Paste Script)
+
+Copy `console-game.js` and paste it into Chrome DevTools Console.
+
+## New in this version
+- Added a **Home Screen** with map selection cards and a `START GAME` button.
+- Right panel now shows only **4 towers at a time** (scroll to view more).
+- Speed buttons reduced to only **2x, 5x, 10x** (as requested).
+- Added **Auto Next Wave** toggle button.
+- Fixed clicking reliability by listening on `pointerdown` at capture phase.
+
+## Controls
+- Home Screen: click a map card, then click `START GAME`.
+- In game: click `Home Screen` button to return to map select.
+- Click tower cards to select a tower.
+- Mouse wheel over the right panel to scroll the tower list.
+- Click on open ground (not on the path and not too close to another tower) to place tower.
+- Click `Auto Next` to auto-start the next round.
+- Click speed buttons (2x / 5x / 10x) to change simulation speed.
+- Click `START WAVE` to spawn enemies.
+- Click a placed tower to open upgrade and targeting controls.
+- Press `R` after game over to restart run.
+- Press `Esc` anytime to close overlay.
