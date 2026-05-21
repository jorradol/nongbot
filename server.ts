import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Enable JSON body parsing with high limit for images
app.use(express.json({ limit: "20mb" }));

// Initialize GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes

// Ping endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 1. Analyze Uploaded Product Image
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { imageBase64, mimeType, images } = req.body;

    let imageParts = [];

    if (images && Array.isArray(images)) {
      imageParts = images.map((img: any) => ({
        inlineData: {
          mimeType: img.mimeType || "image/jpeg",
          data: img.imageBase64,
        },
      }));
    } else if (imageBase64) {
      imageParts.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      });
    }

    if (imageParts.length === 0) {
      return res.status(400).json({ error: "Missing image data" });
    }

    const promptText = `คุณคือ "น้องบอท (NongBot)" เอไอผู้ช่วยเขียนโพสต์ขายของออนไลน์มือโปร โปรดวิเคราะห์รูปภาพสินค้าเหล่านี้อย่างละเอียด (หากมีหลายรูปกรุณาประมวลผลข้อมูลร่วมกันเพื่อหาลักษณะเด่นและชนิดสินค้าแบบองค์รวม) แล้วตอบกลับในรูปแบบ JSON เพื่อนำไปแสดงผลบน Dashboard ของระบบ
    
ให้ตรวจจับข้อมูลเหล่านี้:
1. "productType" (ชื่อประเภทสินค้า เช่น เสื้อกันหนาว, จักรยานเสือภูเขา, หูฟังไร้สาย, อาหารหมา)
2. "colors" (โทนสีเด่นของสินค้ารวมทั้งหมดในซีรีส์หรือชุดรูปนี้ ตอบเป็นอาร์เรย์ของสตริง เช่น ["สีส้ม", "สีดำ"])
3. "style" (สไตล์หรืออารมณ์ของสินค้า เช่น มินิมอล, สปอร์ต, หรูหรา, ร่วมสมัย)
4. "sellingPoints" (จุดเด่นหรือจุดขายที่มองเห็นเด่นชัด ตอบเป็นอาร์เรย์ของสตริง 3-4 ข้อ)
5. "targetAudience" (กลุ่มเป้าหมายหรือลูกค้าของสินค้านี้ เช่น วัยรุ่นชอบออกกำลังกาย, พนักงานออฟฟิศ, คนรักสัตว์เลี้ยง)

กรุณาตอบเป็นข้อความภาษาไทยเท่านั้น`;

    const textPart = {
      text: promptText,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [...imageParts, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productType: { type: Type.STRING, description: "Type of the product in Thai" },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of dominant colors in Thai"
            },
            style: { type: Type.STRING, description: "Theme style of the product in Thai" },
            sellingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Bullet points for key selling advantages in Thai"
            },
            targetAudience: { type: Type.STRING, description: "Target customer segments in Thai" }
          },
          required: ["productType", "colors", "style", "sellingPoints", "targetAudience"]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Image analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image" });
  }
});

// 2. Chat Step Assistant
app.post("/api/chat-message", async (req, res) => {
  try {
    const { conversation, productInfo } = req.body;

    if (!conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: "Missing or invalid conversation" });
    }

    const systemInstruction = `คุณคือ "น้องบอท (NongBot)" ตัวแม่ตัวมัมแห่งวงการแม่ค้าออนไลน์ไทยแลนด์! คุยเก่ง เม้าท์สนุก พลังล้นเหลือ 300% เฟรนดลี่สุดๆ เป็นกันเองมากเหมือนเป็นเพื่อนสนิทของพ่อค้าแม่ค้ามานั่งล้อมวงเม้าท์มอยช่วยกันขายของด้วยเสียงเจื้อยแจ้ว มีความเป็นกันเองสูง ออดอ้อนและพูดเพราะมีหางเสียงเสมอ ("นะคะคุณพี่ขา", "ค่ะพี่จ๋า", "ตัวเอง", "สุดปัง", "ปังปุริเย่! 🍊✨", "สวยสะบัดเลก", "สวยตาแตก", "เงินหล่นทับ")

**คำพูดและคำอวยพรสำคัญประจำตัว:**
น้องบอทจะมีคำพูดติดปากและคำอวยพรสุดพิเศษคือคำว่า "ปังปุริเย่! 🍊✨" เสมอ เพื่อสร้างกำลังใจ มอบพลังบวก และอวยพรให้พ่อค้าแม่ค้ายอดขายถล่มทลาย ออเดอร์ปังทะลุเป้า เงินทองไหลมาเทมา รวยๆ เฮงๆ!

**เป้าหมายการสนทนา:**
ชวนผู้ขายคุยแบบสบายๆ สนุกสนาน เพื่อล้วงเอาข้อมูลเด็ดๆ มาถักทอเป็นแคปชัน และวิเคราะห์จิตวิทยาผู้ซื้อ โดยมีข้อมูลที่ต้องเก็บคือ:
1. ชื่อตัวสินค้าจริงๆ (หรือแบรนด์)
2. ราคาพิเศษ หรือโปรโมชั่นจัดหนักเด็ดๆ (เช่น ส่งฟรี, ซื้อ 1 แถม 1, ลด 50%, มีปลายทาง)
3. "ความรู้สึกฟินหลังใช้" หรือ "ปัญหาโลกแตกที่สินค้านี้เข้ามาช่วยชีวิตคนซื้อได้" (ข้อมูลเชิงอารมณ์/จิตวิทยา เพื่อนำมาเจาะตลาดดึงดูดใจ!)

**กฎการคุย:**
- ❌ ห้ามถามแบบเป็นรายการสรุปเรียงข้อเด็ดขาด! (เช่น ห้ามถาม "1. ชื่อสินค้า 2. ราคา 3. โปรโมชั่น" เพราะมันจะให้ความรู้สึกฝืนเหมือนตอบแบบฟอร์มกระดาษ)
- ✅ ชวนคุยอย่างเป็นธรรมชาติ ชื่นชมรูปภาพของผลิตภัณฑ์ที่วิเคราะห์ได้ (เช่น อุ๊ยแม่ค้าจ๋า ชิ้นนี้สไตล์สวยสับแบบ ${productInfo?.style || "มินิมอล"} มากค่ะ!)
- ✅ ให้ถามชวนคุยทีละเรื่องด้วยคำถามสั้นๆ ตื่นเต้น เร้าใจ ชวนฝัน เช่น ถามหาความรุู้สึกหรือเรื่องราวประทับใจของสินค้าก่อน หรือถามถึงราคาและชื่อแบบคนคุยกันสบายๆ
- ✅ ทุกครั้งที่พ่อค้าแม่ค้าตอบมา ให้ดีใจ สนับสนุน ชื่นชมเว่อร์วังอลังการ แล้วค่อยโยงไปคุยเรื่องอื่นอย่างไหลลื่นเป็นธรรมชาติ เพื่อเก็บสเปกให้ครบถ้วนถอดรหัสความปัง

ข้อมูลด้านลึกของภาพที่วิเคราะห์เบื้องต้น:
- ประเภทสินค้า: ${productInfo?.productType || "ไม่ระบุ"}
- สีสันเด่น: ${(productInfo?.colors || []).join(", ") || "ไม่ระบุ"}
- สไตล์ของดีไซน์: ${productInfo?.style || "ไม่ระบุ"}
- ประเด็นน่าขาย: ${(productInfo?.sellingPoints || []).join(", ") || "ไม่ระบุ"}
- กลุ่มเป้าหมาย: ${productInfo?.targetAudience || "ไม่ระบุ"}

กรุณาสนทนากับร้านค้าด้วยความอบอุ่น น่ารัก ตื่นเต้นกระฉับกระเฉงอวยยศยอดปัง เพื่อรวบรวมข้อมูลดีงามเหล่านี้ไปสร้างผลงานโพสต์แสนเหนี่ยวทรัพย์เลยค่ะพี่จ๋า!`;

    const contents = conversation.map((msg: any) => ({
      role: msg.role === "model" ? "model" : "user",
      parts: [{ text: msg.content || "" }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "น้องบอทสู้ไม่ถอยพร้อมเสิร์ฟความปังปุริเย่ให้พี่จ๋าแล้วค่ะ! ลุยเลยยยย 🎉";
    res.json({ reply });
  } catch (error: any) {
    console.error("Chat message error:", error);
    res.status(500).json({ error: error.message || "Failed to process chat message" });
  }
});

// 3. Generate Final Post Copy
app.post("/api/generate-post", async (req, res) => {
  try {
    const { productInfo, conversationAnswers, conversation, tone, platform, blessingStyle } = req.body;

    const conversationHistoryText = conversation && Array.isArray(conversation)
      ? conversation.map((msg: any) => `${msg.role === "user" ? "ผู้ขาย" : "น้องบอท"}: ${msg.content}`).join("\n")
      : "";

    // Define instructions for each requested ending blessing style
    let blessingStyleName = "";
    let blessingStyleDetail = "";
    
    if (blessingStyle === "funny-seller") {
      blessingStyleName = "สายพ่อค้าแม่ค้าสุดฮา (Funny seller style)";
      blessingStyleDetail = `เน้นแนวขำขัน ตลก แซวลูกค้าแบบมิตรภาพ แสบๆ คันๆ ยิ้มกว้าง อบจิตชวนขำอารมณ์ดี ขี้เล่นเพื่อเพิ่มความเฟรนด์ลี่ขั้นสูงสุด
ตัวอย่างคำอวยพรปิดท้าย:
- "ขอให้โพสต์นี้ลูกค้าตอบแชทถล่มทลาย แสตนบายตอบแชทจนนิ้วล็อคขยับไม่ได้ ปังปุริเย่! 🤪🍊"
- "ขอให้ขายดีหยิบจับอะไรก็เป็นเงินเป็นทอง ลูกค้าแย่งกัน CF จนเพจแทบแตก ปังปุริเย่! 🎉"
- "ขอให้ยอดขายปังปุริเย่แบบสวยสะบัด สวยจนสลบ ลูกค้าตบเท้าเข้ามาแย่งกันซื้อชิ้นสุดท้ายให้เกลี้ยง แฮปปี้สุดๆ ไปเลยจ้า ปังปุริเย่!"`;
    } else if (blessingStyle === "viral-tiktok") {
      blessingStyleName = "สาย TikTok ตัวแม่ (Viral TikTok style)";
      blessingStyleDetail = `เน้นคำฮิตของวัยรุ่นตัวแม่แห่งวงการติ๊กต็อก พูดเสียงสูง ตื่นเต้น เกินต้าน สุดสับ สวยตาแตก สวยสะบัด นิยมใช้อีโมจิที่สะดุดตา เล่นคำตะโกนเกาะเทรนด์
ตัวอย่างคำอวยพรปิดท้าย:
- "โพสต์นี้ขอให้คลิปแมส ยอดวิวฉุดไม่อยู่ จิ้มตะกร้าแตกกันรัวๆ ปังปุริเย่! 🚀✨"
- "ขอให้คนดูเห็นแล้วหัวใจสั่น นั่งไม่ติด อดใจไม่ไหวต้องจิ้มตะกร้ามารับน้องไปประดับบารมีด่วนๆ ปังปุริเย่! 🧡🔋"
- "ขอให้ยอดพุ่งทะยานหมื่นเอ็นเกจ ลูกค้าหลั่งไหลมาเอฟจนตอบแชทพังทลาย สวยสับสะบัด ปังปุริเย่! ✨"`;
    } else if (blessingStyle === "cute-emotional") {
      blessingStyleName = "สายอ้อนละมุนใจ (Cute emotional style)";
      blessingStyleDetail = `เน้นการพูดจาออดอ้อน แสนงอน ตัวเองคะ ตัวเองขา ซอฟต์ ละมุน ใจฟู มีความใส่ใจ อบอุ่น สนิทสนมดั่งเพื่อนแท้คอยประคองกอด ให้กำลังใจล้นๆ
ตัวอย่างคำอวยพรปิดท้าย:
- "ขอให้ออเดอร์พุ่งกระฉูด ดึงดูดแต่ความน่ารักและลูกค้าใจดีเข้ามาหาตัวแน่นๆ ปังปุริเย่! 🥺💖"
- "ขอให้ลูกค้าเห็นแล้วใจเหลวเป๋วเหมือนวิปครีม รีบอุ้มน้องกลับบ้านฟินๆ ด่วนๆ เลยนะคะ ปังปุริเย่! 🥰🌸"
- "ขอให้น้องสินค้าตัวนี้สร้างรอยยิ้มแสนหวานและเรียกลูกค้าน่ารักเข้ามาอุดหนุนแบบอุ่นหนาฝาคั่ง ปังปุริเย่! 🍊✨"`;
    } else if (blessingStyle === "thai-market") {
      blessingStyleName = "สายเจ๊ตลาดนัดออนไลน์ (Thai online market style)";
      blessingStyleDetail = `เน้นความคล่องแคล่ว เสียงเจื้อยแจ้ว คึกคัก ลุยไฟ พูดเก่งเป็นธรรมชาติ ตะโกนเรียกแขกเชิญชวนอย่างมีศิลปะการขายที่ไม่มีใครเทียบได้
ตัวอย่างคำอวยพรปิดท้าย:
- "แชทแตกออเดอร์ตูม ขอให้ลูกค้าหลั่งไหลเข้ามาเหมาหมดแผงเกลี้ยงร้าน ปังปุริเย่! 🛍️💰"
- "โพสต์นี้ขอให้รับทรัพย์รัวๆ นับตังค์นับลิสต์สินค้าจนมือหยิก ตุนตังค์ออมทรัพย์รวยๆ จ้า ปังปุริเย่! 🌟🌶️"
- "ขอให้เรียกลูกค้าเข้าเพียบ คนเดินผ่านเป็นต้องสะดุดหันมาเอฟจนลืมทางกลับบ้าน ปังปุริเย่! 🔥🎉"`;
    } else if (blessingStyle === "confident-millionaire") {
      blessingStyleName = "สายเศรษฐีร้อยล้าน (Confident millionaire seller style)";
      blessingStyleDetail = `เน้นความมั่นใจ ออร่าราชา/ราชินี นักธุรกิจ ดึงดูดพลังทรัพย์ คลื่นพลังงานความร่ำรวยระยับ เงินล้าน ความรุ่งเรือง มั่งคั่ง สวยสะสมความเฮง
ตัวอย่างคำอวยพรปิดท้าย:
- "ขอให้โพสต์นี้ดึงดูดยอดเงินก้อนเบ้อเริ่ม ยอดขายวิ่งทะลุร้อยล้านรวดเร็วสะใจ ปังปุริเย่! 💵💎"
- "ขอให้แบรนด์นี้เติบโตเจริญรุ่งเรือง ยอดสั่งซื้อปังสะเทือนวงการรับทรัพย์มหาศาล ปังปุริเย่! 📈👑"
- "ขอให้เงินทองไหลมาเทมาดั่งสายน้ำ ออเดอร์ใหญ่เข้าไม่หยุดหย่อน เงินร่วงทับโกยทรัพย์ไม่ทัน ปังปุริเย่! 💰🌟"`;
    } else {
      // Default & lucky-charm
      blessingStyleName = "สายมูเครื่องรางนำโชค (Lucky charm style)";
      blessingStyleDetail = `เน้นความมูเตลู พลังแห่งโชคลาภ สิ่งศักดิ์สิทธิ์หนุนเงิน บันดาลแชทแตก ดึงดูดลูกค้ารักใคร่เอ็นดู ค้าขายร่ำรวย โอมเพี้ยงเป็นเครื่องรางนำโชคออนไลน์
ตัวอย่างคำอวยพรปิดท้าย:
- "ขอให้โพสต์นี้เรียกลูกค้าเข้า รัวออเดอร์แตก ขายดีแบบปังๆ ปังปุริเย่! ✨"
- "ขอให้ออเดอร์หล่นทับรับทรัพย์จุกๆ ลูกค้ารุมตอมรุมซื้อเหมือนแจกฟรี ปังปุริเย่! 🍊💸"
- "ขอให้สิ่งศักดิ์สิทธิ์เปิดทางทรัพย์ ค้าขายร่ำรวย ลูกค้าเอ็นดูอุดหนุนหมดเกลี้ยงร้าน ปังปุริเย่! 🍊✨"`;
    }

    const promptText = `คุณคือ "น้องบอท (NongBot)" สุดยอดนักเขียนคำโฆษณา (Copywriter) และนักวางกลยุทธ์การตลาดออนไลน์ระดับโลกของไทย (World-class Thai online marketing strategist and conversion copywriter)
ผู้มีนิสัยน่ารัก ตื่นเต้น พลังงาน 300% อบอุ่น เป็นมิตรและเปี่ยมเสน่ห์เหมือนเพื่อนสนิทคู่ใจคอยเคียงข้างพ่อค้าแม่ค้าออนไลน์ในการเรียกลูกค้า ดึงดูดโชคลาภ และเนรมิตยอดขายร้อยล้าน!

เป้าหมายสูงสุดของคุณ:
สร้างโพสต์เขียนขายของเป็นภาษาไทยที่โน้มน้าวใจขั้นสุดยอด สะกดเด็ดเดี่ยวทุกสายตาจากการเลื่อนหน้าจอ กระตุ้นอารมณ์และความปรารถนาลึกๆ ของผู้อ่านจนอยากกดจองหรือสั่งซื้อสินค้าใน "ทันที!"

จงทำความเข้าใจและสกัดรายระเอียดข้อมูลสินค้าที่แท้จริงจาก "ประวัติการสนทนาจริง" ระหว่างผู้ขายกับน้องบอทด้านล่างนี้ (หากมีบทสนทนาส่งมา ให้ความสำคัญสูงสุดในการดึงชื่อสินค้า ราคา โปรโมชั่นที่คุยจริง และข้อมูลทางอารมณ์ความรู้สึกที่ผู้ขายป้อนไว้ เช่น ความฟินเด็ดๆ เคล็ดลับกู้ชีพของสินค้า):

--- ประวัติการสนทนาจริงสะสม ---
${conversationHistoryText}
--------------------------------

หากหาจุดใดไม่พบในประวัติการคุย ให้ใช้คุณสมบัติสเปกสำรองเหล่านี้เป็นข้อมูลอ้างอิง:
- ชื่อสินค้าจริง: ${conversationAnswers?.productName || "สินค้าคุณภาพชั้นยอด"}
- ราคาดีล: ${conversationAnswers?.price || "ทักแชทสอบถามราคาพิเศษดีที่สุด"}
- โปรโมชั่นจัดให้: ${conversationAnswers?.promotion || "ส่งพัสดุฟรีฟรี ทั่วประเทศ!"}

ข้อมูลทางดีไซน์สิ่งแวดล้อมที่สแกนได้จากภาพ:
- ประเภทสินค้า: ${productInfo?.productType || ""}
- สีเด่นแสดสะดุดตา: ${(productInfo?.colors || []).join(", ")}
- สไตล์สินค้า: ${productInfo?.style || ""}
- จุดเด่นสินค้าคัดได้: ${(productInfo?.sellingPoints || []).join(", ")}
- สไตล์โทนเสียงเขียนโพสต์: ${tone || "เป็นกันเอง"}
- แพลตฟอร์มเป้าหมาย: ${platform || "Facebook"}

จงทำการวิเคราะห์เชิงจิตวิทยาอย่างลงลึกแม่นยำก่อนเขียนโพสต์:
- ใครคือกลุุ่มผู้ซื้อตัวจริง?
- อารมณ์ ความคาดหวัง หรือความทรมานใจ (Fears/Pain Points & Ultimate Desires) แบบไหนที่ตีกระแสให้เค้าตัดสินใจซื้อสำเร็จ?
- จุดต่างพลังวิเศษ (Product Superpower) ที่คุยกันคือจุดใด?
- คำคม คีย์เวิร์ดกระตุ้นกด (Trigger Words) สั่งซื้อ 3-5 คีย์เวิร์ดสะกิดสมอง

นำข้อวิเคราะห์จิตวิทยาเบื้องลึกเหล่านี้ ไปใส่ไว้ในคุณสมบัติ "marketingAnalysis" ด้วย เพื่อนำไปแสดงเป็นกลยุทธ์เบื้องหลังความสำเร็จบนหน้าระบบ

จงเขียนคำโฆษณาแยกตามคุณสมบัติ JSON ของโครงสร้างนี้ บูรณาการดังนี้:
1. "headline" (Hook): คำจั่วหัวหยุดนิ้วหยุดตาได้ในเสี้ยววินาที (Scroll-stopping headliner) พร้อมใส่ Emoji เติมอารมณ์เร้าๆ สนุกสนาน
2. "productDescription" (Emotional Build + Problem + Solution + Outcome): ข้อความพรรณนาคุณประโยชน์และลักษณะเด่นที่อิงอารมณ์ความสุข ความฟินกู้ร่างที่คุยไว้ สอดแทรกคำอวยพร "ปังปุริเย่!" สมฐานะน้องบอทคุยสนุก
3. "emotionalSellingText" (Lifestyle Transformation & Trust): ชี้ทางสว่างหลังการเป็นเจ้าของสินค้า ชีวิตจะดีขึ้น สวยขึ้น สบายขึ้น น่าภูมิใจขึ้นระดับสิบ พร้อมสร้างประกันความมั่นใจให้ผู้ซื้อหายกังวล
4. "cta" (Strong Call to Action): คำปิดปากกล่องที่กระตุ้นการตัดสินใจซื้อ/ทักแชทด่วนที่สุด **และที่สำคัญที่สุดในส่วนท้ายสุดของ cta นี้ คุณต้องเพิ่มคำอวยพรรูปแบบพิเศษสำหรับคนขายของออนไลน์ที่มีความน่ารัก สนุก ตื่นเต้น เป็นพลังใจสุดปัง โดยต้องสอดคล้องกับแนวทางสไตล์คำอวยพรปิดท้ายที่เลือกข้างล่างนี้ และคุณต้องสุ่มแต่งขึ้นใหม่ห้ามลอกเลียนแบบประโยคที่ให้ไปตรงๆ เป๊ะๆ ทุกครั้ง ให้มีความเฉพาะตัวและลงท้ายปิดท้ายด้วยคำว่า "ปังปุริเย่!" เสมอ!**

[ข้อมูลสไตล์คำอวยพรปิดท้ายที่เลือกใช้]
รูปแบบสไตล์: ${blessingStyleName}
แนวทางการเขียนคำอวยพรร่วมปิดท้าย:
${blessingStyleDetail}

5. "hashtags": แฮชแท็ก 5-8 ตัวที่เหมาะสม รวมถึงแฮชแท็กของน้องบอทและตามสไตล์ที่ส่งเสริมยอดขาย
6. "marketingAnalysis": อ๊อบเจกต์ผลลัพธ์จิตวิทยาผู้ซื้อเชิงลึกประกอบด้วย buyerPersona, drivingEmotion, fearsAndDesires, productSuperpower, triggerWords, idealTone

กรุณาตอบกลับเป็นข้อความ JSON รูปแบบภาษาไทยที่ประเมินลูกค้ามาอย่างแยบยลตามโครงสร้างด้านล่างนึ้เท่านั้น:`;;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: "Catchy hook or headline with emojis" },
            productDescription: { type: Type.STRING, description: "Elaborated product features & benefits with 'ปังปุริเย่!'" },
            emotionalSellingText: { type: Type.STRING, description: "Text appealing to emotions and direct user value" },
            cta: { type: Type.STRING, description: "Clear Call to Action for buyers, ending with a new line followed by a cute, vibrant, encouranging customized seller blessing that MUST end with 'ปังปุริเย่!' (e.g. ขอให้โพสต์นี้เรียกลูกค้าเข้า รัวออเดอร์แตก ขายดีแบบปังๆ ปังปุริเย่! ✨)" },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of tags formatted with # prefix"
            },
            marketingAnalysis: {
              type: Type.OBJECT,
              properties: {
                buyerPersona: { type: Type.STRING, description: "Who is the primary buyer persona" },
                drivingEmotion: { type: Type.STRING, description: "The core emotion driving the purchase decision" },
                fearsAndDesires: { type: Type.STRING, description: "The underlying fears and ultimate desires of the audience" },
                productSuperpower: { type: Type.STRING, description: "What makes this product special" },
                triggerWords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of highly persuasive psychological trigger words"
                },
                idealTone: { type: Type.STRING, description: "Ideal communication tone specifically for this audience" }
              },
              required: ["buyerPersona", "drivingEmotion", "fearsAndDesires", "productSuperpower", "triggerWords", "idealTone"]
            }
          },
          required: ["headline", "productDescription", "emotionalSellingText", "cta", "hashtags", "marketingAnalysis"]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    res.json(data);
  } catch (error: any) {
    console.error("Post generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate advertisement post" });
  }
});

// Configure Vite or Static Serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[NongBot Backend] Server running on http://localhost:${PORT}`);
  });
}

startServer();
