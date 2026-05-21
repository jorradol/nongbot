import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Sparkles, Camera, ArrowRight, MessageCircle, Smartphone } from "lucide-react";
import { motion } from "motion/react";

export const AuthView: React.FC = () => {
  const { loginWithGoogle, loginDemo } = useAuth();
  const [loading, setLoading] = useState<"google" | "demo" | null>(null);

  const handleGoogleLogin = async () => {
    setLoading("google");
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const handleDemoLogin = async () => {
    setLoading("demo");
    try {
      await loginDemo();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Marketing Hook */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 bg-[#ff5300] border border-orange-650 text-white px-3.5 py-1 rounded-full text-xs font-bold w-fit"
          >
            <Sparkles className="w-3.5 h-3.5 text-white bg-[#fb6b03] rounded-xs p-0.5" />
            ผู้ช่วย AI สร้างคอนเทนต์โพสต์ขายของที่ดีที่สุด
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl font-extrabold font-display leading-[1.15] text-slate-900 tracking-tight"
          >
            NongBot (น้องบอท) 🤖 <br />
            AI สร้างโพสต์ขายของออนไลน์<span className="text-orange-550">สุดปังปุริเย่!</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-base md:text-lg leading-relaxed max-w-lg"
          >
            แค่อัปโหลดรูปสินค้าเพียง 1 รูป <br />
            น้องบอทจะช่วยคิดแคปชัน ดึงจุดขาย และสร้างโพสต์พร้อมขายให้ทันที <br />
            ง่าย เร็ว ขายดี เหมือนมีแอดมินมือโปรช่วย 24 ชั่วโมง ✨ปังปุริเย่!🚀
          </motion.p>

          {/* Benefits Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                <Camera className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">ใส่รูปเริ่มต้นได้ทันที</h4>
                <p className="text-xs text-slate-500">แค่อัปโหลดรูปภาพสินค้าที่มี สแกนจุดขายเสร็จด่วน</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                <MessageCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">คุยง่ายไม่ต้องกรอก</h4>
                <p className="text-xs text-slate-500">ตอบคำถามเป็นสเต็ปสบายๆ ไม่เบื่อกรอกฟอร์มยาว</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                <Sparkles className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">เลือกสไตล์และช่องทางได้ครบ</h4>
                <p className="text-xs text-slate-500">TikTok, FB, IG, Shopee ปรับแต่งได้ตามช่องทาง</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 border border-orange-200 shadow-2xs">
                <Smartphone className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">เหมาะกับใช้บนมือถือ</h4>
                <p className="text-xs text-slate-500">ดีไซน์เน้นใช้งานแบบไร้สะดุดด้วยหน้าจอแนวตั้ง</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right column: Login Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-12 xl:col-span-5 w-full bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100 relative overflow-hidden"
          id="login-card"
        >
          <div className="relative text-center space-y-4">
            <div className="w-14 h-14 bg-orange-500 border border-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-100 text-white font-display font-black text-2xl animate-float">
              NB
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold font-display text-slate-800">เข้าใช้งาน NongBot</h2>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">เริ่มต้นเขียนโพสต์ขายของง่ายๆ ได้ทันที</p>
            </div>

            {/* Separator */}
            <div className="w-full h-px bg-slate-200 my-4" />

            <div className="space-y-3 pt-2">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm px-4 py-3 rounded-xl border border-slate-200 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                id="btn-login-google"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google icon" 
                  className="w-5 h-5"
                />
                <span>{loading === "google" ? "กำลังเข้าสู่ระบบ..." : "เชื่อมต่อด้วยบัญชี Google"}</span>
              </button>

              {/* Demo Mode Fallback */}
              <button
                onClick={handleDemoLogin}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-3 rounded-xl shadow-md shadow-orange-100 active:scale-[0.99] transition-all cursor-pointer border border-transparent"
                id="btn-login-demo"
              >
                <span>{loading === "demo" ? "กำลังสร้างบัญชีทดสอบ..." : "เข้าใช้งานโหมดทดลองฟรี 🍊"}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="text-[11px] text-slate-500 font-medium leading-relaxed pt-3">
              ระบบใช้งานการล็อกอินผ่าน <strong>Firebase Authentication</strong> ที่ปลอดภัย <br />
              โหมดทดลองใช้งานฟรีจะมอบเครดิตเริ่มต้น <strong>50 เครดิต</strong> ทันที เพื่อทดสอบคุณสมบัติทั้งหมดของน้องบอท
            </div>

            {/* Quick stats bar */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-3 flex justify-around text-center mt-6">
              <div>
                <span className="block text-lg font-bold text-orange-600">วิเคราะห์ด่วน</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">สแกนรูปทันควัน</span>
              </div>
              <div className="w-px bg-slate-200 h-8 my-auto" />
              <div>
                <span className="block text-lg font-bold text-orange-600">สร้างด่วน</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">แชร์โพสต์ได้ด่วน</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
