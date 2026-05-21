/**
 * Composes a premium, gorgeous, responsive, semi-transparent watermark badge 
 * onto an image at the bottom-right corner.
 * 
 * Supports both base64 and external standard graphics URLs securely.
 * 
 * @param imageUrl Source image string (Data URL or CORS-accessible image web path)
 * @param watermarkText Highly specialized label or attribution string
 * @returns Promise returning the high-fidelity branded JPEG base64 Data URL string
 */
export function applyWatermark(imageUrl: string, watermarkText = "NongBot AI 🍊"): Promise<string> {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve("");
      return;
    }

    const img = new Image();
    // Enable cross-origin anonymous resource sharing in case of CDN image hosting
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageUrl); // Fallback to raw copy if context creation is blocked
          return;
        }

        // Preserve native resolution exactly to prevent any blurriness or compression loss
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original background image
        ctx.drawImage(img, 0, 0);

        // Calculate proportional scale factor based on image size (2.2% of max dimension)
        const baseSize = Math.max(img.width, img.height);
        const fontSize = Math.max(12, Math.min(54, Math.round(baseSize * 0.02)));
        
        ctx.font = `600 ${fontSize}px "Inter", -apple-system, sans-serif`;

        const paddingX = fontSize * 1.5;
        const paddingY = fontSize * 1.5;

        // Measure text dimensions to scale our premium container background dynamically
        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;
        const textHeight = fontSize;

        const badgeWidth = textWidth + fontSize * 1.5;
        const badgeHeight = textHeight * 1.8;

        const badgeX = canvas.width - badgeWidth - paddingX;
        const badgeY = canvas.height - badgeHeight - paddingY;

        // Begin composition
        ctx.save();
        
        // 1. Draw modern pill backing with dark slate gloss backdrop blur simulation
        ctx.fillStyle = "rgba(15, 23, 42, 0.72)"; // Ultra slick premium translucent charcoal slate
        ctx.strokeStyle = "rgba(255, 255, 255, 0.16)"; // Micro fine border glow
        ctx.lineWidth = Math.max(1, fontSize * 0.06);
        
        const pillRadius = badgeHeight / 2;
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, pillRadius);
        } else {
          // Robust backwards compatibility fallback in case client runtime engine does not support roundRect
          ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
        }
        ctx.fill();
        ctx.stroke();

        // 2. Draw brand accent neon orange dot indicator
        const dotSize = fontSize * 0.22;
        ctx.fillStyle = "#f97316"; // NongBot Neon Sunset orange 🍊
        ctx.beginPath();
        ctx.arc(badgeX + fontSize * 0.8, badgeY + badgeHeight / 2, dotSize, 0, 2 * Math.PI);
        ctx.fill();

        // 3. Render typography text with clean anti-aliasing alignments
        ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
        ctx.font = `bold ${fontSize}px "Inter", "Space Grotesk", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(watermarkText, badgeX + fontSize * 1.25, badgeY + badgeHeight / 2);

        ctx.restore();

        // Return high-quality compressed JPEG (90% quality preservation)
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (err) {
        console.error("Watermark compositing failed. Proceeding with clean fallback:", err);
        resolve(imageUrl);
      }
    };

    img.onerror = (e) => {
      console.warn("Could not initiate watermark loading lifecycle for resource:", e);
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}
