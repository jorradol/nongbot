import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserPosts, deletePost } from "../services/firestoreService";
import { AdPost } from "../types";
import { 
  PlusSquare, 
  Trash2, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Coins, 
  Search,
  Check, 
  Share2,
  Tags,
  Zap,
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";
import { appendBranding, logCopyEvent } from "../utils/copyWithBranding";

interface DashboardProps {
  setView: (view: string) => void;
  setSelectedPost: (post: AdPost) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ setView, setSelectedPost }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<AdPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  const loadPosts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserPosts(user.uid);
      setPosts(data);
    } catch (e) {
      console.error("Error loading user posts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [user]);

  const handleDelete = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("ยืนยันที่จะลบโพสต์ประวัติการสร้างนี้?")) return;
    try {
      await deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async (post: AdPost, e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `${post.generatedPost.headline}\n\n${post.generatedPost.productDescription}\n\n${post.generatedPost.emotionalSellingText}\n\n${post.generatedPost.cta}\n\n${(post.hashtags || []).join(" ")}`;
    try {
      const brandedText = appendBranding(fullText);
      await navigator.clipboard.writeText(brandedText);
      setCopiedId(post.id);
      logCopyEvent(fullText, fullText.length);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleViewDetails = (post: AdPost) => {
    setSelectedPost(post);
    setView("post-viewer");
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.productInfo?.productType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.generatedPost?.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.generatedPost?.productDescription?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = platformFilter === "all" || post.platform.toLowerCase() === platformFilter.toLowerCase();
    
    return matchesSearch && matchesPlatform;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 font-sans">
      {/* Welcome Banner Card */}
      <div className="relative glass-card-orange rounded-3xl p-6 md:p-8 shadow-md border-orange-200/50 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative space-y-2 max-w-xl">
          <div className="text-xs bg-brand-500 text-white rounded-full px-2.5 py-0.5 w-fit font-bold font-display uppercase tracking-widest shadow-xs">
            สิทธิพิเศษสำหรับคุณ
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex flex-wrap items-center gap-2">
            สวัสดีครับ, <span className="text-brand-600">{user?.name}</span> 👋
            <span className="inline-flex items-center gap-1 text-xs font-black bg-orange-100 text-orange-700 px-3 py-1 rounded-xl border border-orange-200 shadow-2xs animate-pulse">
              ปังปุริเย่! 🍊✨
            </span>
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            ยินดีต้อนรับเข้าสู่ NongBot ผู้ช่วยส่วนตัวในการเขียนโพสต์ขายของ วันนี้ขออวยพรให้ค้าขายร่ำรวย เงินไหลมาเทมา ปังปุริเย่! 🎉 วันนี้อยากให้น้องบอทช่วยเขียนโพสต์ปังๆ สินค้าอะไรดีครับ?
          </p>
        </div>

        {/* Quick action button */}
        <button
          onClick={() => setView("generator")}
          className="relative bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-4 rounded-2xl flex items-center gap-2 shadow-lg shadow-brand-500/15 group shrink-0 active:scale-95 transition-all text-sm md:text-base cursor-pointer"
          id="btn-create-post-main"
        >
          <PlusSquare className="w-5 h-5" />
          <span>เริ่มสร้างโพสต์ใหม่</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Credit Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 shadow-2xs border border-orange-100">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-brand-500">
            <Coins className="w-6 h-6 fill-orange-200" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">เครดิตคงเหลือใช้งาน</span>
            <span className="text-xl md:text-2xl font-black text-gray-800">{user?.credits} <span className="text-sm font-semibold text-brand-600">สิทธิ์</span></span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 shadow-2xs border border-orange-100">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-brand-500">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">ประวัติการสร้างโพสต์ทั้งหมด</span>
            <span className="text-xl md:text-2xl font-black text-gray-800">{posts.length} <span className="text-sm font-semibold text-brand-600">ชิ้นงาน</span></span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4 shadow-2xs border border-orange-100">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-brand-500">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-gray-400 block font-medium">สิทธิ์สร้างแฮชแท็กฟรี</span>
            <span className="text-xl md:text-2xl font-black text-gray-800">ไม่จำกัด <span className="text-sm font-semibold text-brand-600">ครั้ง</span></span>
          </div>
        </div>
      </div>

      {/* Search & History Header */}
      <div className="border-t border-orange-100/50 pt-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <RefreshCw 
                onClick={loadPosts} 
                className={`w-4 h-4 text-gray-400 hover:text-brand-500 cursor-pointer ${loading ? "animate-spin" : ""}`}
              />
              ประวัติโพสต์โฆษณาของคุณ
            </h3>
            <p className="text-xs text-gray-500">นี่คือรายการโพสต์โฆษณาที่คุณเคยสร้างไว้พร้อมแชร์</p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหากรองโพสต์/สินค้า..."
                className="pl-9 pr-4 py-1.5 w-full md:w-56 text-xs rounded-xl border border-orange-200/50 bg-white/50 focus:border-brand-500 focus:outline-none transition-all"
              />
            </div>

            {/* Platform dropdown */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-xs text-gray-600 px-3 py-1.5 rounded-xl border border-orange-200/50 bg-white/50 focus:outline-none"
            >
              <option value="all">ทุกแพลตฟอร์ม</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="shopee">Shopee</option>
              <option value="lazada">Lazada</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
            <span className="text-xs font-semibold text-gray-500">น้องบอทกำลังโหลดประวัติโพสต์...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 bg-orange-50/20 rounded-3xl border border-dashed border-orange-250 p-8 flex flex-col items-center justify-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-brand-500">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">ยังไม่มีโพสต์ที่สร้าง</h4>
              <p className="text-xs text-gray-500 mt-1">ยังไม่พบประวัติโพสต์จากการค้นหากรองนี้ เริ่มต้นอัปโหลดรูปภาพเพื่อเปิดตัวโพสต์ขายแรกกันเลย!</p>
            </div>
            <button
              onClick={() => setView("generator")}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all text-sm shadow-xs cursor-pointer"
            >
              <PlusSquare className="w-4 h-4" />
              <span>สร้างโพสต์แรกทันที</span>
            </button>
          </div>
        ) : (
          /* Posts Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleViewDetails(post)}
                className="glass-panel rounded-2xl overflow-hidden border border-orange-100 hover:border-brand-300 hover:shadow-md transition-all duration-300 flex flex-col group cursor-pointer"
              >
                {/* Product Thumbnail Top */}
                <div className="h-44 relative bg-gray-50 overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt={post.productInfo?.productType}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* Absolute platform emblem */}
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-brand-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-orange-100 shadow-2xs">
                    {post.platform}
                  </div>
                  {/* Absolute tone indicator */}
                  <div className="absolute top-3 right-3 bg-brand-500 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-2xs">
                    {post.tone}
                  </div>
                  {/* Photo count indicator */}
                  {post.imageUrls && post.imageUrls.length > 1 && (
                    <div className="absolute bottom-2.5 right-2.5 bg-slate-900/75 backdrop-blur-xs text-white font-extrabold px-2 py-0.5 rounded-md text-[9px] flex items-center gap-1 shadow-2xs">
                      <span>📸 +{post.imageUrls.length} รูป</span>
                    </div>
                  )}
                </div>

                {/* Post body snippets */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <span className="text-[10px] text-brand-600 bg-orange-50 px-2 py-0.5 rounded-full font-bold">
                      {post.productInfo?.productType || "สินค้าโฆษณา"}
                    </span>
                    <h4 className="font-bold text-gray-800 line-clamp-1 leading-snug pt-1 text-sm md:text-base">
                      {post.generatedPost?.headline || "ไม่มีข้อความพาดหัว"}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {post.generatedPost?.productDescription || "ไม่มีข้อความบรรยาย..."}
                    </p>
                  </div>

                  {/* Actions footer bar inside card */}
                  <div className="flex items-center justify-between border-t border-gray-100/80 pt-3 text-xs">
                    <span className="text-[10px] text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Copy snippet button */}
                      <button
                        onClick={(e) => handleCopy(post, e)}
                        className={`p-1.5 rounded-lg border border-gray-100 bg-white hover:bg-orange-50/70 hover:text-brand-600 transition-colors ${
                          copiedId === post.id ? "text-green-500 border-green-200" : "text-gray-500"
                        }`}
                        title="คัดลอกโพสต์ด่วน"
                      >
                        {copiedId === post.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete button option */}
                      <button
                        onClick={(e) => handleDelete(post.id, e)}
                        className="p-1.5 rounded-lg border border-gray-100 bg-white hover:bg-red-50 hover:text-red-500 text-gray-400 transition-colors"
                        title="ลบ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
