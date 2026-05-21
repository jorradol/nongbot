import React, { useRef, useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { saveGeneratedPost } from "../services/firestoreService";
import { ProductInfo, ChatMessage, GeneratedPost } from "../types";
import { appendBranding, logCopyEvent } from "../utils/copyWithBranding";
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Send, 
  RefreshCw, 
  Check, 
  Copy, 
  ArrowLeft, 
  AlertCircle,
  Zap,
  Volume2,
  FileText,
  MousePointerClick,
  X,
  Plus
} from "lucide-react";
import { motion } from "motion/react";

const ChatBubble: React.FC<{
  msg: ChatMessage;
  onUpdateMessage: (id: string, newContent: string) => void;
}> = ({ msg, onUpdateMessage }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);

  const handleSave = () => {
    onUpdateMessage(msg.id, editValue);
    setIsEditing(false);
  };

  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"} items-start`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-display font-bold text-xs shadow-3xs ${
        isUser ? "bg-slate-800 text-white" : "bg-brand-500 text-white"
      }`}>
        {isUser ? "U" : "NB"}
      </div>
      
      <div className="group relative space-y-1">
        <div className={`px-4 py-3 rounded-2xl text-xs text-left text-slate-705 leading-relaxed border shadow-3xs transition-all ${
          isUser 
            ? "bg-amber-50/75 border-amber-200/50 rounded-tr-none" 
            : "bg-white border-orange-100/40 rounded-tl-none"
        }`}>
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-white/85 p-2 rounded-xl border border-orange-200 focus:outline-none focus:border-brand-500 font-sans text-xs resize-y"
                rows={3}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2.5 py-1 rounded-md bg-brand-500 hover:bg-brand-600 font-bold text-white transition-colors cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
              
              <button
                type="button"
                onClick={() => {
                  setEditValue(msg.content);
                  setIsEditing(true);
                }}
                className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 p-1 text-[10px] text-brand-500 font-bold hover:underline transition-all cursor-pointer"
                title="แก้ไขข้อความ"
              >
                แก้ไข
              </button>
            </div>
          )}
        </div>
        
        <span className="text-[9px] text-gray-400 block px-1.5 font-mono text-left">
          {new Date(msg.timestamp || Date.now()).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

interface PostGeneratorViewProps {
  setView: (view: string) => void;
}

export const PostGeneratorView: React.FC<PostGeneratorViewProps> = ({ setView }) => {
  const { user, deductCredit } = useAuth();
  
  // State 1: Uploading and image selection (allowing up to 10 images)
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);

  // Computed helper for single-image backwards compatibility and main preview representation
  const image = images[featuredIndex] !== undefined ? images[featuredIndex] : (images[0] || null);

  // State 2: Chat Assistant step
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [pendingUserText, setPendingUserText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // State 3: Final settings and generated COPY results
  const [tone, setTone] = useState<string>("กันเอง");
  const [platform, setPlatform] = useState<string>("Facebook");
  const [blessingStyle, setBlessingStyle] = useState<string>("lucky-charm");
  const [generatingPost, setGeneratingPost] = useState(false);
  const [finishedPost, setFinishedPost] = useState<GeneratedPost | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // DOM Refs for scroll tracking
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat list
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, chatLoading]);

  // Update a message in the chat log (e.g. from inline editing)
  const handleUpdateMessage = (id: string, newContent: string) => {
    setChatLog((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: newContent } : msg))
    );
  };

  // Utility to resize and compress selected images down to safe, lightweight boundaries
  const resizeImageAndGetBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          
          // Downscale threshold
          const MAX_SIZE = 1024;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            } else {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.8));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Convert File list and load images concurrently up to 10
  const processImageFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const validImageFiles = list.filter((f) => f.type.startsWith("image/"));
    if (validImageFiles.length === 0) {
      alert("กรุณาอัปโหลดไฟล์รูปภาพสินค้าเท่านั้นครับ");
      return;
    }

    const currentCount = images.length;
    const slotsAvailable = 10 - currentCount;
    if (slotsAvailable <= 0) {
      alert("คุณสามารถอัปโหลดรูปภาพได้สูงสุด 10 รูปครับผม");
      return;
    }

    const filesToUse = validImageFiles.slice(0, slotsAvailable);
    if (validImageFiles.length > slotsAvailable) {
      alert(`น้องบอทรับรูปภาพได้สูงสุด 10 รูปนะครับผม โดยระบบคัดเลือก ${slotsAvailable} รูปแรกเพิ่มให้เรียบร้อยแล้วครับ 🍊`);
    }

    const processedImages: string[] = [];
    const processedFiles: File[] = [];

    for (const file of filesToUse) {
      try {
        const base64Str = await resizeImageAndGetBase64(file);
        processedImages.push(base64Str);
        processedFiles.push(file);
      } catch (err) {
        console.error("Error processing file", err);
      }
    }

    setImages((prev) => [...prev, ...processedImages]);
    setImageFiles((prev) => [...prev, ...processedFiles]);
    // Set featured image as the first item of the new batch if previously unoccupied
    if (images.length === 0 && processedImages.length > 0) {
      setFeaturedIndex(0);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToRemove);
      // Adjust featured index boundary
      if (featuredIndex >= filtered.length) {
        setFeaturedIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
    }
  };

  // Stage 1 Action: Analyze through Gemini 3.5-flash vision backend
  const handleAnalyzeImage = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);
    try {
      const imagesPayload = images.map((img) => ({
        imageBase64: img.split(",")[1],
        mimeType: img.split(";")[0].split(":")[1] || "image/jpeg",
      }));

      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesPayload }),
      });

      if (!res.ok) throw new Error("พอร์ตวิเคราะห์ภาพเซิร์ฟเวอร์ขัดข้อง");
      const analyzedData: ProductInfo = await res.json();
      setProductInfo(analyzedData);

      // Initialize chat log first greeting from NongBot summarizing analyzed stats
      const firstBotGreeting: ChatMessage = {
        id: "greet-1",
        role: "model",
        content: `กรี๊ดดดด! สวยตาแตกมากเลยค่ะคุณพี่ขาาา! 😍✨ น้องบอท 🍊 สแกนภาพสินค้าทั้งหมดของพี่จ๋าเรียบร้อยแล้วนะคะ บอกเลยว่าสไตล์ **"${analyzedData.style}"** โดดเด่นสุดปัง มีออร่าสะกดกลุ่มกลุ่มลูกค้า **"${analyzedData.targetAudience}"** ได้แบบอยู่หมัดแน่นอนค่ะ! ยิ่งโทนสีเก๋ๆ แนว **"${analyzedData.colors.join(", ")}"** คือดีงาม สวยสับสะดุดตามากกกก ปังปุริเย่! 🍊✨

ว่าแต่คุณพี่ขาาา สินค้าหนีบใจสุดอลังการชิ้นนี้มีชื่อเรียกเท่ๆ หรือแบรนด์สุดปังชื่ออะไรเอ่ย? แล้วแอบบอกดีเทลความฟินที่พี่เลิฟที่สุดในชิ้นนี้ให้น้องบอทชื่นใจหน่อยเร๊ววว! 👇💖`,
        timestamp: new Date().toISOString(),
      };
      setChatLog([firstBotGreeting]);
    } catch (e: any) {
      console.error(e);
      alert("เกิดข้อผิดพลาดในการวิเคราะห์รูปสินค้า: " + (e.message || e));
    } finally {
      setAnalyzing(false);
    }
  };

  // Stage 2 Action: Send reply message to Chat assistant backend
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || pendingUserText;
    if (!textToSend.trim() || !productInfo) return;

    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setChatLog((prev) => [...prev, userMessage]);
    setPendingUserText("");
    setChatLoading(true);

    try {
      const chatConversationWithInstructions = chatLog.concat(userMessage).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch("/api/chat-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation: chatConversationWithInstructions,
          productInfo,
        }),
      });

      if (!res.ok) throw new Error("การเชื่อมต่อแชทขัดข้อง");
      const data = await res.json();

      const botReply: ChatMessage = {
        id: "bot-" + Date.now(),
        role: "model",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setChatLog((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error(err);
      alert("ติดขัดการนำเข้าแชท: " + err.message);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper inputs for instant, 1-click vendor chat suggestions
  const quickReplies = [
    { label: "ราคา 390 บาท ส่งฟรี", text: "ตัวนี้น่ารักแบบตะโกน ใส่แล้วฟินขับผิวระดับสิบค่ะพี่จ๋า ราคาดีงามแค่ 390 บาท จัดโปรพิเศษส่งพัสดุฟรีฟรีไปเลยค่า!" },
    { label: "ลดเหลือ 990 บาท เก็บปลายทาง", text: "ฮิตใน TikTok รีวิวตัวแม่แน่นมากค่ะแม่ค้าจ๋า! จัดราคาปกติ 1,290 บาท พิเศษลดตาแตกเหลือ 990 บาท มีบริการเก็บปลายทางหักลบความเสี่ยงฟรีฟิ้วจ้า" },
    { label: "ซื้อ 1 แถม 1 เฉพาะวันนี้", text: "เน้นแก้ปัญหาโลกแตก ช่วยกู้ร่างพังให้สวยพริ้งในข้ามคืน ชูโปรซื้อ 1 แถม 1 อภิสิทธิ์เฉพาะแฟนเพจที่สั่งจองวันนี้เท่านั้นนะจ๊ะ" },
    { label: "สไตล์หรูหราพรีเมียม / ส่งฟรี", text: "ตัวนี้มีความพรีเมียมหรูหราดุจลูกคุณหนูค่ะ สัมผัสเงางาม ใช้ตัวนี้แล้วหรูหราราษีจับแน่นอน ช่วยเขียนแนวนี้บวกโปรส่งฟรีให้หน่อยน้า" },
    { label: "สไตล์สนุก/รีบจองก่อนหมดเกลี้ยง", text: "อยากได้แนวเขียนสนุกๆ ชวนรีบแซวระงับกิเลสไม่อยู่ ตื่นเต้นกระฉับกระเฉง กระตุ้นให้ลูกค้าจองด่วนๆ ก่อนแม่ค้าปิดออเดอร์นะคะจ๊ะ" }
  ];

  const handleQuickClick = (replyText: string) => {
    handleSendChatMessage(replyText);
  };

  // Step 3 Action: Generate final Post consuming credit
  const handleGeneratePost = async () => {
    if (!user || !productInfo) return;

    if (user.credits <= 0) {
      alert("เครดิตหมดแล้วครับ! โปรดแอดเพิ่มที่บาร์ด้านบนทันทีเพื่อทดสอบต่อ");
      return;
    }

    setGeneratingPost(true);

    try {
      // Gather answers from dialog history
      const fullConversationText = chatLog.map(m => m.content).join("\n");
      
      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productInfo,
          conversationAnswers: {
            productName: getSpecificationValue("ชื่อสินค้า", fullConversationText) || "สินค้ายอดฮิต",
            price: getSpecificationValue("ราคา", fullConversationText) || "ราคาพิเศษสอบถามใต้คอมเมนต์",
            promotion: getSpecificationValue("โปรโมชั่น", fullConversationText) || "โปรโมชั่นพิเศษลด 50%"
          },
          conversation: chatLog.map(m => ({ role: m.role, content: m.content })),
          tone,
          platform,
          blessingStyle
        })
      });

      if (!res.ok) throw new Error("สร้างข้อความโฆษณาล้มเหลว");
      const postData: GeneratedPost = await res.json();
      setFinishedPost(postData);

      // Deduct Credit
      const creditDeducted = await deductCredit();
      if (!creditDeducted) {
        console.warn("Credit deduction bypassed (Demo sandbox check)");
      }

      // Rearrange images array so that the featured image is the first one in history
      const rearrangedImages = [...images];
      if (featuredIndex > 0 && featuredIndex < rearrangedImages.length) {
        const [featuredImg] = rearrangedImages.splice(featuredIndex, 1);
        rearrangedImages.unshift(featuredImg);
      }

      // Save to History collection with the selected featured image as the primary image URL and first in the list
      const newPostId = await saveGeneratedPost(
        user.uid,
        images[featuredIndex] || images[0] || "",
        productInfo,
        chatLog,
        postData,
        postData.hashtags || [],
        tone,
        platform,
        rearrangedImages
      );
      setPostId(newPostId);

    } catch (e: any) {
      console.error(e);
      alert("ไม่สามารถรังสรรค์โพสต์เขียนขายได้: " + e.message);
    } finally {
      setGeneratingPost(false);
    }
  };

  // Helper parser from chat history to extract basic specs
  const getSpecificationValue = (specLabel: string, text: string): string => {
    // Basic regex checks for demo intelligence
    if (specLabel === "ราคา") {
      const match = text.match(/(\d{3,4})\s*(บาท|฿)/);
      return match ? match[0] : "";
    }
    return "";
  };

  // Helper section copies to Clipboard with smart branding features
  const handleCopySection = async (title: string, content: string) => {
    try {
      const brandedText = appendBranding(content);
      await navigator.clipboard.writeText(brandedText);
      setCopiedSection(title);
      logCopyEvent(content, content.length);
      setTimeout(() => setCopiedSection(null), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyAll = async () => {
    if (!finishedPost) return;
    const allText = `${finishedPost.headline}\n\n${finishedPost.productDescription}\n\n${finishedPost.emotionalSellingText}\n\n${finishedPost.cta}\n\n${finishedPost.hashtags.join(" ")}`;
    handleCopySection("all", allText);
  };

  // Reset work stage
  const handleReset = () => {
    setImages([]);
    setImageFiles([]);
    setFeaturedIndex(0);
    setProductInfo(null);
    setChatLog([]);
    setFinishedPost(null);
    setPostId(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 font-sans">
      
      {/* Step Progress Top bar */}
      <div className="flex items-center justify-between border-b border-orange-100/60 pb-5 mb-6">
        <button
          onClick={() => setView("dashboard")}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors cursor-pointer font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ยกเลิกและย้อนกลับ</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <span className={image ? "text-brand-600" : ""}>1. เลือกรูปภาพ</span>
          <span>→</span>
          <span className={productInfo ? "text-brand-600" : ""}>2. คุยโต้ตอบ</span>
          <span>→</span>
          <span className={finishedPost ? "text-brand-600 font-extrabold" : ""}>3. โพสต์โพลงสำเร็จ</span>
        </div>
      </div>

      {/* Main Container switch states */}
      {!image ? (
        /* ================= STATE 1: UPLOAD & CROP IMAGE ================= */
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 font-display">
              อัปโหลดรูปภาพผลิตภัณฑ์ของคุณ 🍊
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
              ลากรูปภาพมาวาง ถ่ายรูป หรืออัปโหลดจากคลังพร้อมกันได้สูงสุด 10 รูปเพื่อวิเคราะห์รวมภาพทั้งหมดทันที
            </p>
          </div>

          {/* Upload card dragbox */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-3 border-dashed rounded-3xl p-10 md:p-16 flex flex-col items-center justify-center text-center space-y-4 transition-all duration-300 ${
              isDragOver 
                ? "border-brand-500 bg-orange-50/55 scale-[1.01]" 
                : "border-orange-200/55 bg-white/50 hover:border-brand-400 hover:bg-orange-50/10"
            }`}
            id="drag-drop-zone"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-brand-500 shadow-md shadow-brand-500/5">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-gray-800 text-sm md:text-base">เลือกไฟล์รูปภาพจากอุปกรณ์</h3>
              <p className="text-xs text-gray-500">เลือกทีละหลายรูปหรือลากมาปล่อยลงที่นี่ (สูงสุด 10 รูป, รองรับ JPG, PNG, WEBP)</p>
            </div>
          </div>
        </motion.div>
      ) : !productInfo ? (
        /* ================= STATE 2: PRE-VISUAL & VISION PREPARATION ================= */
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <div className="text-center space-y-1.5">
            <h3 className="text-xl font-bold text-gray-800">ยืนยันรูปภาพสินค้าตัวปัง ({images.length}/10 รูป)</h3>
            <p className="text-xs text-gray-500">รูปภาพเหล่านี้จะถูกประมวลผลพร้อมกันร่วมกับ AI Vision เพื่อดึงจุดเด่นองค์รวม</p>
          </div>

          <div className="rounded-3xl border border-orange-150/65 overflow-hidden shadow-xs relative aspect-square bg-gray-50 max-w-sm mx-auto">
            <img 
              src={image} 
              alt="Uploaded workspace" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 bg-slate-900/70 text-white rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md">
              รูปที่ {featuredIndex + 1} จาก {images.length}
            </div>
          </div>

          {/* Interactive Thumbnails tray */}
          <div className="max-w-md mx-auto space-y-3 bg-white/40 p-4 rounded-2xl border border-orange-100/40">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-500 font-bold">แกลเลอรีภาพสินค้า (คลิกดูภาพเด่น - ลากรูปมาวางเพื่อเพิ่มได้)</span>
              <span className="text-xs text-brand-650 font-extrabold">{images.length} / 10 รูป</span>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setFeaturedIndex(idx)}
                  className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-200 group shrink-0 ${
                    featuredIndex === idx ? "border-brand-500 shadow-sm scale-105" : "border-gray-200 hover:border-brand-300"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  
                  {/* Overlay delete cross */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(idx);
                    }}
                    disabled={analyzing}
                    className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 bg-red-650 hover:bg-red-700 text-white rounded-full transition-transform cursor-pointer shadow-sm"
                    title="ลบรูปภาพนี้"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              
              {images.length < 10 && (
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={analyzing}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-orange-200 hover:border-brand-500 flex flex-col items-center justify-center text-orange-400 hover:text-brand-500 bg-white hover:bg-orange-50/10 transition-all cursor-pointer outline-none shrink-0"
                  title="เพิ่มรูปภาพเพิ่มเติม"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleReset}
              disabled={analyzing}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50/50 disabled:opacity-40 cursor-pointer"
            >
              เลือกรูปใหม่ทั้งหมด
            </button>

            <button
              onClick={handleAnalyzeImage}
              disabled={analyzing}
              className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white px-6 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-brand-500/10 cursor-pointer"
              id="btn-analyze-image"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังวิเคราะห์รูปภาพทั้งหมด ({images.length} รูป)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-white/20" />
                  <span>วิเคราะห์รูปภาพทั้งหมดด้วย AI 🍊</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : !finishedPost ? (
        /* ================= STATE 3: INTERACTIVE CHATBOT STEP ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Product Specs Bento Sidecard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-orange-100 shadow-sm aspect-video sm:aspect-square bg-gray-100 relative">
              <img 
                src={image} 
                alt="Product preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 bg-slate-900/60 text-white rounded-full px-2 py-0.5 text-[9px] font-semibold backdrop-blur-md">
                รูปที่ {featuredIndex + 1} จาก {images.length}
              </div>
            </div>

            {images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto py-1 justify-center scrollbar-none">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFeaturedIndex(idx)}
                    className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      featuredIndex === idx ? "border-brand-500 scale-102" : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            {/* Vision Analysis Bento Box */}
            <div className="glass-card-orange rounded-2xl p-5 border border-orange-200/50 space-y-4">
              <div className="inline-flex items-center gap-1 text-[10px] bg-brand-500 text-white font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3 h-3 fill-white/30" /> ข้อมูลลึกจาก AI Vision
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-[10px] text-gray-400 font-extrabold uppercase">1. ชนิดและแนวประเภทวิทยา</span>
                  <span className="font-extrabold text-slate-800 text-sm block mt-0.5">{productInfo.productType}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-gray-400 font-extrabold uppercase">2. สไตล์สินค้า</span>
                  <span className="font-bold text-gray-700 block mt-0.5">{productInfo.style}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-gray-400 font-extrabold uppercase">3. กลุ่มเป้าหมาย</span>
                  <span className="font-bold text-gray-700 block mt-0.5">{productInfo.targetAudience}</span>
                </div>

                <div>
                  <span className="block text-[10px] text-gray-400 font-extrabold uppercase">4. จุดเด่นสกัดได้</span>
                  <ul className="list-disc list-inside mt-1 font-medium text-gray-600 space-y-1 pl-1">
                    {productInfo.sellingPoints.map((pt, index) => (
                      <li key={index}>{pt}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Prompt Tone and Platform Controls before Generate */}
            <div className="glass-panel p-5 rounded-2xl border border-orange-100 shadow-2xs space-y-4 text-xs">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b border-orange-100/50 pb-2">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                ตั้งค่าโพสต์โฆษณาปลายทาง
              </h4>

              {/* Tone Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-600 block">โทนเสียงเขียนโพสต์ (Tone):</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-xs text-gray-600 p-2.5 rounded-xl border border-orange-200/50 bg-white focus:outline-none"
                >
                  <option value="มืออาชีพ">💼 มืออาชีพ (น่าเชื่อถือ ข้อมูลแน่น)</option>
                  <option value="กันเอง">🍊 กันเอง (เป็นมิตร ชวนคุย น่าคล้อยตาม)</option>
                  <option value="ปิดการขายแรง">🔥 ปิดการขายแรง (เน้นโปรไฟลุก ต้องตัดสินใจด่วน)</option>
                  <option value="สายมินิมอล">🌿 สายมินิมอล (เรียบหรู ดูแพง น้อยแต่มาก)</option>
                  <option value="TikTok Viral">🚀 TikTok Viral (เน้นความไวรัลสั้นๆ เกาะเทรนด์)</option>
                </select>
              </div>

              {/* Blessing Style Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-600 block">สไตล์คำอวยพรปิดท้าย (Blessing):</label>
                <select
                  value={blessingStyle}
                  onChange={(e) => setBlessingStyle(e.target.value)}
                  className="w-full text-xs text-gray-600 p-2.5 rounded-xl border border-orange-200/50 bg-white focus:outline-none"
                >
                  <option value="lucky-charm">🔮 เครื่องรางนำโชค (สายมู ค้าขายร่ำรวย เฮงๆ)</option>
                  <option value="funny-seller">🤪 แม่ค้าสุดฮา (ขำขัน หยิกแกมหยอก ชวนยิ้ม)</option>
                  <option value="viral-tiktok">🚀 TikTok ตัวแม่ (วัยรุ่นติ๊กต็อก สวยสะบัด ตะกร้าแตก)</option>
                  <option value="cute-emotional">🥺 อ้อนละมุนใจ (ใจเหลวเป๋ว อบอุ่น ฟินๆ จ๋า)</option>
                  <option value="thai-market">🛍️ เจ๊ตลาดนัดออนไลน์ (คึกคัก เรียกแขก แชทแตกเรียกลูกค้า)</option>
                  <option value="confident-millionaire">💎 เศรษฐีร้อยล้าน (ทรงพลัง หรูหรา มั่งคั่ง ยอดพุ่งกระฉูด)</option>
                </select>
              </div>

              {/* Target Channel */}
              <div className="space-y-1.5">
                <label className="font-semibold text-gray-600 block">ลงภาพขายในช่องทางใด (Platform):</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Facebook", "TikTok", "Instagram", "Shopee", "Lazada"].map((plt) => (
                    <button
                      key={plt}
                      onClick={() => setPlatform(plt)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        platform === plt
                          ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                          : "border-orange-100 bg-white/50 text-gray-600 hover:bg-orange-50/40"
                      }`}
                    >
                      {plt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Modern ChatGPT-like Chat logs workspace */}
          <div className="lg:col-span-8 bg-white/80 rounded-3xl border border-orange-100 shadow-sm p-4 md:p-6 flex flex-col h-[650px] justify-between relative overflow-hidden">
            {/* Glowing top hint */}
            <div className="border-b border-orange-100/40 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-ping" />
                <span className="text-xs font-bold text-gray-700">กำลังคุยกับ น้องบอท (บรีฟข้อมูลเพิ่มเติม)</span>
              </div>

              {/* Rapid generate button */}
              <button
                onClick={handleGeneratePost}
                disabled={chatLog.length <= 1 || generatingPost}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                id="btn-generate-post-quick"
              >
                {generatingPost ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>สร้างโพสต์ทันที 🍊</span>
              </button>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scroll-smooth">
              {chatLog.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  msg={msg}
                  onUpdateMessage={handleUpdateMessage}
                />
              ))}

              {/* Typing Animation */}
              {chatLoading && (
                <div className="flex gap-3 mr-auto items-center max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-display font-bold text-xs">
                    NB
                  </div>
                  <div className="bg-orange-50/75 border border-orange-200/30 px-5 py-3 rounded-2xl text-xs rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Answer Suggestion Buttons */}
            {chatLog.length > 0 && !chatLoading && (
              <div className="border-t border-orange-100/30 pt-3 pb-2">
                <span className="text-[10px] text-gray-400 font-extrabold flex items-center gap-1 uppercase mb-2">
                  <MousePointerClick className="w-3 h-3 text-brand-400 animate-bounce" /> แตะไอเดียตอบด่วน (คุยลื่นไหลสไตล์แม่ค้ามืออาชีพ):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((qr, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickClick(qr.text)}
                      className="text-[11px] text-slate-700 bg-orange-50/40 border border-orange-200/40 hover:bg-orange-100/50 hover:border-brand-500 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* User Input Input bar */}
            <div className="border-t border-gray-100/80 pt-3 flex gap-2 items-center">
              <input
                type="text"
                placeholder="พิมพ์ตอบน้องบอท หรือระบุข้อมูลโปรโมชั่นสินค้าขายที่อยากใส่ลงไปได้เลย..."
                value={pendingUserText}
                onChange={(e) => setPendingUserText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                disabled={chatLoading}
                className="flex-1 bg-gray-50 border border-gray-200/70 p-3 rounded-xl text-xs md:text-sm focus:border-brand-500 focus:outline-none focus:bg-white transition-all disabled:opacity-50"
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={chatLoading || !pendingUserText.trim()}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 p-3 rounded-xl text-white shadow-xs select-none cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STATE 4: GRAPHIC COPYS PREVIEW GENERATED ================= */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto space-y-6"
        >
          {/* Post Generation completion success bar */}
          <div className="bg-green-500 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="font-extrabold text-sm md:text-base">รังสรรค์โพสต์ขายของเรียบร้อยแล้วครับ! ปังปุริเย่! 🍊✨</h4>
                <p className="text-[11px] text-green-100/90 leading-normal">น้องบอทเขียนสไตล์โพสต์สำหรับลง **{platform}** ด้วยโทน **{tone}** ออกมางดงามเสร็จสรรพ ขออวยพรให้สินค้าขายดีเทน้ำเทท่า ได้เงินมาใช้กันไวไว ร่ำรวย ปังปุริเย่! 🎉💰</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="bg-white text-green-700 font-bold px-4 py-2 rounded-xl text-xs hover:bg-green-50 active:scale-95 transition-all outline-none cursor-pointer"
              >
                {copiedSection === "all" ? "คัดลอกหมดแล้ว!" : "คัดลอกข้อความทั้งหมด"}
              </button>

              <button
                onClick={handleReset}
                className="bg-green-600 hover:bg-green-700 text-white border border-green-550/50 font-bold px-3.5 py-2 rounded-xl text-xs active:scale-95 transition-all cursor-pointer"
              >
                เขียนโพสต์หมวดตูมใหม่
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left preview aspect */}
            <div className="md:col-span-5 space-y-4">
              <div className="rounded-3xl overflow-hidden shadow-md border border-orange-100/50 relative bg-gray-50 aspect-square">
                <img 
                  src={image} 
                  alt="Product final preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 bg-slate-900/60 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold backdrop-blur-md">
                  รูปที่ {featuredIndex + 1} จาก {images.length}
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-1 justify-center scrollbar-none">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFeaturedIndex(idx)}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        featuredIndex === idx ? "border-brand-500 scale-102" : "border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}

              {/* Meta tags card info */}
              <div className="glass-panel p-4 rounded-2xl border border-orange-100/40 text-xs text-gray-500">
                <span className="font-extrabold text-slate-700 block uppercase text-[10px] pb-2 border-b border-orange-100/50">วิสัยทัศน์ที่ระบบตรวจเลือก:</span>
                
                <div className="space-y-2 mt-3 font-medium">
                  <p>ประเภท: <strong className="text-gray-800">{productInfo.productType}</strong></p>
                  <p>สไตล์: <strong className="text-gray-800">{productInfo.style}</strong></p>
                  <p>สีสันหลัก: <strong className="text-gray-800">{productInfo.colors.join(", ")}</strong></p>
                </div>
              </div>
            </div>

            {/* Right finalized copy tabs */}
            <div className="md:col-span-7 bg-white/70 rounded-3xl border border-orange-100/50 p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100/40 rounded-full blur-2xl" />
              
              <div className="border-b border-orange-100/40 pb-4">
                <h4 className="text-lg font-bold text-gray-800">สำเนาชุดจำหน่ายหลัก</h4>
                <p className="text-xs text-gray-400">คัดลอกส่วนโต้ตอบหรือโพสต์ด้านล่างทีละส่วนได้ง่ายๆ</p>
              </div>

              {/* Output block lists */}
              <div className="space-y-5">
                {/* Headline Hook */}
                <div className="bg-amber-50/20 rounded-2xl p-4 border border-amber-200/35 relative group space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-amber-700 font-extrabold tracking-wide uppercase">⚡  1. พาดหัวยึดสายตา (Headline / Hook)</span>
                    <button
                      onClick={() => handleCopySection("headline", finishedPost.headline)}
                      className="p-1 px-2.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-[10px] font-bold text-amber-700 flex items-center gap-1"
                    >
                      {copiedSection === "headline" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "headline" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">{finishedPost.headline}</p>
                </div>

                {/* Description */}
                <div className="bg-orange-50/15 rounded-2xl p-4 border border-orange-200/20 relative group space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-orange-700 font-extrabold tracking-wide uppercase">📦 2. คำอธิบายเอกลักษณ์สินค้า (Item Description)</span>
                    <button
                      onClick={() => handleCopySection("description", finishedPost.productDescription)}
                      className="p-1 px-2.5 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-[10px] font-bold text-orange-700 flex items-center gap-1"
                    >
                      {copiedSection === "description" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "description" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{finishedPost.productDescription}</p>
                </div>

                {/* Emotional Value */}
                <div className="bg-pink-50/10 rounded-2xl p-4 border border-pink-200/15 relative group space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-pink-700 font-extrabold tracking-wide uppercase">❤️ 3. คำพูดเร่งเร้าคลานเข่า (Emotional Pitch)</span>
                    <button
                      onClick={() => handleCopySection("emotional", finishedPost.emotionalSellingText)}
                      className="p-1 px-2.5 rounded-lg border border-pink-200 bg-white hover:bg-pink-50 text-[10px] font-bold text-pink-700 flex items-center gap-1"
                    >
                      {copiedSection === "emotional" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "emotional" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{finishedPost.emotionalSellingText}</p>
                </div>

                {/* Call to Action */}
                <div className="bg-teal-50/15 rounded-2xl p-4 border border-teal-200/15 relative group space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-teal-700 font-extrabold tracking-wide uppercase">🛒 4. สั่งซื้อเพื่อความเร่งรัด (Call to Action)</span>
                    <button
                      onClick={() => handleCopySection("cta", finishedPost.cta)}
                      className="p-1 px-2.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-[10px] font-bold text-teal-700 flex items-center gap-1"
                    >
                      {copiedSection === "cta" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSection === "cta" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-teal-800 leading-relaxed whitespace-pre-line">{finishedPost.cta}</p>
                </div>

                {/* Hashtags output */}
                {finishedPost.hashtags && finishedPost.hashtags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-400 font-extrabold tracking-wide uppercase">#️⃣ 5. คัดสรรกลุ่มแฮชแท็กติดชาร์ต (Hot Hashtags)</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {finishedPost.hashtags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md hover:border-brand-300 hover:text-brand-600 transition-colors cursor-pointer"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
