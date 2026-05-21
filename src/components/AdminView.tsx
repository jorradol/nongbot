import React, { useEffect, useState } from "react";
import { getAdminStats } from "../services/firestoreService";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Users, 
  FileText, 
  Heart, 
  Coins, 
  TrendingUp, 
  PlusCircle, 
  RefreshCw, 
  Search,
  CheckCircle,
  ShieldCheck,
  Award,
  Zap,
  Share2,
  Copy
} from "lucide-react";
import { motion } from "motion/react";

export const AdminView: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [actionSuccessUid, setActionSuccessUid] = useState<string | null>(null);
  
  // High-fidelity Copy Brand Attribution analytics tracking states
  const [totalCopies, setTotalCopies] = useState<number>(0);
  const [recentCopies, setRecentCopies] = useState<any[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Load general aggregate stats
      const statsData = await getAdminStats();
      setStats(statsData);

      // Load deep users list to manage
      const usersSnapshot = await getDocs(collection(db, "users"));
      const users: any[] = [];
      usersSnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(users);

      // Query live Firestore Copy Attribution logs dynamically
      try {
        const copiesSnapshot = await getDocs(collection(db, "copyAnalytics"));
        setTotalCopies(copiesSnapshot.size);
        const copiesList: any[] = [];
        copiesSnapshot.forEach((doc) => {
          copiesList.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort desc based on server timestamp
        copiesList.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });
        setRecentCopies(copiesList.slice(0, 5));
      } catch (err) {
        console.warn("Could not query Firestore copy records directly, loading Local fallbacks:", err);
        const localCount = localStorage.getItem("nongbot_copy_count") || "0";
        setTotalCopies(parseInt(localCount));
        const localHistory = JSON.parse(localStorage.getItem("nongbot_copy_history") || "[]");
        setRecentCopies(localHistory.slice(-5).reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const handleAddCredits = async (userUid: string, currentCredits: number) => {
    const userDocRef = doc(db, "users", userUid);
    const updatedCredits = Number(currentCredits) + Number(topupAmount);
    
    try {
      await updateDoc(userDocRef, {
        credits: updatedCredits
      });
      
      // Update local state
      setUsersList(usersList.map(u => u.uid === userUid ? { ...u, credits: updatedCredits } : u));
      if (stats) {
        setStats({
          ...stats,
          creditsOverview: {
            ...stats.creditsOverview,
            totalCreditsAllocated: stats.creditsOverview.totalCreditsAllocated + topupAmount
          }
        });
      }

      setActionSuccessUid(userUid);
      setTimeout(() => setActionSuccessUid(null), 2000);
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถเติมเครดิตได้เนื่องจากติดสิทธิ์ความปลอดภัย");
    }
  };

  const filteredUsers = usersList.filter(user => {
    return (
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.uid?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8 font-sans">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-brand-500" />
            ผู้ดูแลระบบ (Admin Control Board)
          </h2>
          <p className="text-gray-500 text-sm">ตรวจสอบประสิทธิภาพการเติบโต สถิติระบบ และบริหารเครดิตลูกค้า</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-orange-50 hover:bg-orange-100 border border-orange-200/50 text-brand-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>ดึงข้อมูลล่าสุด</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw className="w-10 h-10 text-brand-500 animate-spin" />
          <span className="text-xs font-semibold text-gray-500">กำลังประมวลผลสถิติหลังบ้าน...</span>
        </div>
      ) : (
        <>
          {/* Bento Stats Aggregates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="glass-panel p-6 rounded-2xl shadow-2xs border border-orange-100/60 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-orange-200"><Users className="w-8 h-8" /></div>
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase block">ผู้ใช้ทั้งหมด</span>
              <span className="text-3xl font-black text-gray-800 block mt-2">{stats?.totalUsers || 0}</span>
              <span className="text-[10px] text-brand-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full mt-2 inline-block">รวมบัญชีทดสอบ</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-2xs border border-orange-100/60 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-orange-200"><FileText className="w-8 h-8" /></div>
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase block">โพสต์ทั้งหมด</span>
              <span className="text-3xl font-black text-gray-800 block mt-2">{stats?.totalPosts || 0}</span>
              <span className="text-[10px] text-green-600 font-medium bg-green-550/10 px-2 py-0.5 rounded-full mt-2 inline-block">พร้อมใช้งาน</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-2xs border border-orange-100/60 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-orange-200"><TrendingUp className="w-8 h-8" /></div>
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase block">ผู้ใช้ที่สร้างผลงาน</span>
              <span className="text-3xl font-black text-gray-800 block mt-2">{stats?.activeUsers || 0}</span>
              <span className="text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full mt-2 inline-block">Active Creators</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-2xs border border-orange-100/60 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-orange-200"><Coins className="w-8 h-8" /></div>
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase block">เครดิตแจกจ่ายแล้ว</span>
              <span className="text-3xl font-black text-gray-800 block mt-2">{stats?.creditsOverview?.totalCreditsAllocated || 0}</span>
              <span className="text-[10px] text-brand-700 font-medium bg-orange-50 px-2 py-0.5 rounded-full mt-2 inline-block">เฉลี่ย {stats?.creditsOverview?.averageCreditsPerUser || 0}</span>
            </div>

            <div className="glass-panel p-6 rounded-2xl shadow-2xs border border-brand-200 bg-brand-50/5 relative overflow-hidden animate-fade-in">
              <div className="absolute top-4 right-4 text-brand-300"><Share2 className="w-8 h-8 animate-pulse" /></div>
              <span className="text-xs text-brand-700 font-black tracking-wide uppercase block">ความตระหนักรู้แบรนด์</span>
              <span className="text-3xl font-black text-brand-600 block mt-2">{totalCopies}</span>
              <span className="text-[10px] text-orange-750 font-bold bg-orange-100/50 px-2 py-0.5 rounded-full mt-2 inline-block">แชร์แบรนด์สำเร็จ ⚡</span>
            </div>
          </div>

          {/* Smart Branding Live Attribution Sharing Feed */}
          <div className="glass-panel rounded-3xl border border-orange-100/75 p-6 md:p-8 space-y-4 shadow-3xs animate-fade-in">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-brand-500" />
                ประสิทธิภาพแคมเปญ Smart Branding Attribution
              </h3>
              <p className="text-xs text-gray-400">ประวัติทราฟฟิกคอนเทนต์โฆษณาที่ผู้ใช้คัดลอกจากระบบไปแพร่กระจายพร้อมแอมบาสเดอร์ลิงก์</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Left side: Highlights */}
              <div className="space-y-3.5 bg-orange-50/20 border border-orange-100/40 p-5 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-orange-100/50 pb-2">
                  <Award className="w-4 h-4 text-brand-500" /> ประโยชน์และสถิติสะสมของระบบ
                </h4>
                <ul className="text-xs text-slate-500 space-y-2 list-disc list-inside leading-relaxed">
                  <li><strong className="text-slate-700">SEO เติบโตออร์แกนิก</strong>: ระบบสุ่มแนบเครดิตแบรนด์แบบไม่ซ้ำกันเพื่อสร้าง Backlink</li>
                  <li><strong className="text-slate-700">ประสบการณ์พรีเมียม (UX)</strong>: ปล่อยให้สลัดคัดลอกได้อย่างอิสระโดยไม่สะดุด</li>
                  <li><strong className="text-slate-700">แท็กสตรีมแชริง</strong>: แนบ hashtags แบรนด์พาดพิงเพื่ออ้างอิงนำลูกค้าใหม่กลับมาสู่ระบบ</li>
                </ul>
                <div className="bg-white/90 p-3 rounded-xl border border-orange-150/40 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">สถานะแคมเปญ:</span>
                  <span className="text-green-600 font-semibold flex items-center gap-1">● ระบบรันสมบูรณ์ (Active)</span>
                </div>
              </div>

              {/* Right side: Live Feed */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-brand-400" /> คำโฆษณาจำพวกเสรี 5 รายการล่าสุดที่ถูกคัดลอกไปใช้งาน
                </h4>
                {recentCopies.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-xs text-gray-400">
                    ยังไม่มีการตรวจพบการคัดลอกคำเสนอขายสินค้าในประวัติหลังเซสชันนี้
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[160px] overflow-y-auto scrollbar-none pr-1">
                    {recentCopies.map((copyObj, idx) => (
                      <div key={copyObj.id || idx} className="bg-white border border-orange-100/20 hover:border-orange-200/50 p-3 rounded-xl text-xs space-y-1 transition-all shadow-3xs">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>ความยาว: {copyObj.length} อักษร</span>
                          <span>
                            {copyObj.timestamp?.seconds 
                              ? new Date(copyObj.timestamp.seconds * 1000).toLocaleTimeString("th-TH") 
                              : new Date(copyObj.timestamp || Date.now()).toLocaleTimeString("th-TH")}
                          </span>
                        </div>
                        <p className="text-slate-600 italic font-mono truncate leading-none">
                          "{copyObj.textSnippet || "คัดลอกข้อมูลคำเสนอขายสินค้า..."}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Credit Management Panel */}
          <div className="glass-panel rounded-3xl border border-orange-100/75 p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-orange-100/50 pb-4">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-500" />
                  จัดการเครดิตผู้ใช้งานรายบุคคล
                </h3>
                <p className="text-xs text-gray-400">ระบุจำนวนเครดิตแอดออนเพื่อเติมให้พ่อค้าแม่ค้าด้านล่าง</p>
              </div>

              {/* Set Topup amount config */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-semibold text-gray-500 shrink-0">จำนวนที่จะเติม:</span>
                <input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(Math.max(1, Number(e.target.value)))}
                  className="px-3 py-1.5 border border-orange-250/55 rounded-xl text-xs w-20 text-center bg-white/50 focus:border-brand-500 focus:outline-none"
                  min="1"
                />
                <span className="text-xs text-gray-500 font-semibold">เครดิต</span>
              </div>
            </div>

            {/* Stats filtering input */}
            <div className="flex items-center gap-2 relative max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหากรองผู้ขายด้วย ชื่อ / อีเมล / UID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-orange-200/50 bg-white/50 focus:border-brand-500 focus:outline-none transition-all"
              />
            </div>

            {/* User List Table */}
            <div className="overflow-x-auto rounded-xl border border-orange-50">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-orange-50/50 border-b border-orange-100/55 text-brand-800 font-bold">
                    <th className="p-4 rounded-tl-xl">ผู้ขายสินค้า</th>
                    <th className="p-4">ข้อมูลผู้ติดต่อ</th>
                    <th className="p-4">เครดิตคงเหลือ</th>
                    <th className="p-4">สมัครสมาชิกเมื่อ</th>
                    <th className="p-4 text-right rounded-tr-xl">จัดการสิทธิ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400 text-xs">
                        ไม่มีชื่อผู้เข้าเกณฑ์การค้นหากรองนี้
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((userObj) => (
                      <tr key={userObj.id} className="hover:bg-orange-50/10 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-orange-150/50 text-brand-700 font-bold flex items-center justify-center text-xs">
                              {userObj.name?.substring(0, 1) || "P"}
                            </div>
                            <div>
                              <span className="font-semibold block text-gray-800">{userObj.name || "SME Store"}</span>
                              <span className="text-[9px] text-gray-400 block font-mono uppercase">{userObj.uid?.substring(0, 12)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-gray-500 font-medium">
                          {userObj.email || "demo@nongbot.app"}
                        </td>
                        <td className="p-4">
                          <span className="font-black text-gray-800 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-300" />
                            {userObj.credits}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-xs">
                          {(() => {
                            if (!userObj.createdAt) return "-";
                            if (typeof userObj.createdAt.seconds === "number") {
                              return new Date(userObj.createdAt.seconds * 1000).toLocaleDateString("th-TH");
                            }
                            return new Date(userObj.createdAt).toLocaleDateString("th-TH");
                          })()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleAddCredits(userObj.uid, userObj.credits)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1 shadow-xs border transition-all cursor-pointer ${
                              actionSuccessUid === userObj.uid
                                ? "bg-green-550 border-green-250 text-white"
                                : "bg-brand-500 hover:bg-brand-600 border-brand-600 text-white active:scale-95"
                            }`}
                          >
                            {actionSuccessUid === userObj.uid ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>บวกสำเร็จ!</span>
                              </>
                            ) : (
                              <>
                                <PlusCircle className="w-3.5 h-3.5 animate-pulse" />
                                <span>แอดเพิ่ม +{topupAmount}</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
