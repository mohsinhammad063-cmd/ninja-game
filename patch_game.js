--- src/game.js
+++ src/game.js
@@ -948,7 +948,8 @@

     // Extend Lane towards camera to simulate movement
     // Use base speed of Wave 1 for visually consistent background movement
-    const visualLaneSpeed = getTargetForwardSpeed("Wooden Crate", 1) * run.speedMultiplier;
+    // Disable visualLaneSpeed updating the debugInfo since it overrides actual wave speed in debug view
+    const visualLaneSpeed = 0.48 * 5.416 * run.speedMultiplier;
     lane.position.z += visualLaneSpeed * delta;
     if (lane.position.z > 0) {
         lane.position.z -= 400;
