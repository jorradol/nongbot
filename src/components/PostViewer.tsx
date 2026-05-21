import React, { useState, useEffect } from "react";
import { AdPost } from "../types";
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Calendar, 
  Tag, 
  Layers, 
  MessageSquare, 
  ExternalLink,
  Pencil,
  Trash2,
  Upload,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { updatePost } from "../services/firestoreService";
import { useCopyBranding } from "../hooks/useCopyBranding";
import { applyWatermark } from "../lib/watermark";
import { useAuth } from "../context/AuthContext";
import { getOrCreateNongBotFolder, uploadTextToDrive, uploadImageToDrive } from "../utils/googleDrive";

interface PostViewerProps {
  post: AdPost;
  onBack: () => void;
  onUpdatePost?: (updatedPost: AdPost) => void;
}

export const PostViewer: React.FC<PostViewerProps> = ({ post, onBack, onUpdatePost }) => {
  const { copied, copyAndBrand } = useCopyBranding();
  const [showBrandingToast, setShowBrandingToast] = useState(false);
  const [isWatermarking, setIsWatermarking] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Google Drive integration states
  const { accessToken, loginWithGoogle } = useAuth();
  const [isDriveBusy, setIsDriveBusy] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState("");
  const [driveErrorMsg, setDriveErrorMsg] = useState("");

  const imageUrlsList = post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls : (post.imageUrl ? [post.imageUrl] : []);
  const displayedImage = imageUrlsList[viewerIndex] || post.imageUrl || "";

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editHeadline, setEditHeadline] = useState(post.generatedPost?.headline || "");
  const [editProductDescription, setEditProductDescription] = useState(post.generatedPost?.productDescription || "");
  const [editEmotionalSellingText, setEditEmotionalSellingText] = useState(post.generatedPost?.emotionalSellingText || "");
  const [editCta, setEditCta] = useState(post.generatedPost?.cta || "");
  const [editHashtags, setEditHashtags] = useState((post.hashtags || []).join(" "));
  const [editImageUrls, setEditImageUrls] = useState<string[]>(imageUrlsList);
  const [editPrimaryImageUrl, setEditPrimaryImageUrl] = useState<string>(post.imageUrl || "");

  // Update edit states when post updates values
  useEffect(() => {
    setEditHeadline(post.generatedPost?.headline || "");
    setEditProductDescription(post.generatedPost?.productDescription || "");
    setEditEmotionalSellingText(post.generatedPost?.emotionalSellingText || "");
    setEditCta(post.generatedPost?.cta || "");
    setEditHashtags((post.hashtags || []).join(" "));
    setEditImageUrls(imageUrlsList);
    setEditPrimaryImageUrl(post.imageUrl || "");
    setIsEditing(false);
  }, [post]);

  const fullText = `${post.generatedPost?.headline || ""}\n\n${post.generatedPost?.productDescription || ""}\n\n${post.generatedPost?.emotionalSellingText || ""}\n\n${post.generatedPost?.cta || ""}\n\n${(post.hashtags || []).join(" ")}`;

  const handleCopy = async () => {
    const success = await copyAndBrand(fullText);
    if (success) {
      setShowBrandingToast(true);
      setTimeout(() => setShowBrandingToast(false), 3500);
    }
  };

  const handleDownloadImageWithWatermark = async () => {
    if (!displayedImage) return;
    setIsWatermarking(true);
    try {
      const markedUrl = await applyWatermark(displayedImage, "NongBot AI 🍊");
      const link = document.createElement("a");
      link.href = markedUrl;
      link.download = `nongbot-branded-${post.id || Date.now()}.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Watermark download sequence encountered warning, downloading fallback unmodified canvas image:", err);
      const link = document.createElement("a");
      link.href = displayedImage;
      link.download = `nongbot-original.jpeg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsWatermarking(false);
    }
  };

  const handleSaveTextToDrive = async () => {
    if (!accessToken) {
      setDriveErrorMsg("กรุณาเชื่อมต่อ Google Drive ก่อนใช้งานครับ");
      return;
    }
    
    const confirmBackup = window.confirm(
      "คุณต้องการบันทึกข้อความโฆษณานี้ไปยัง Google Drive ของคุณหรือไม่?\nระบบจะสร้างเอกสารในโฟลเดอร์ 'NongBot AI Posts' โดยอัตโนมัติ"
    );
    if (!confirmBackup) return;

    setIsDriveBusy(true);
    setDriveSuccessMsg("");
    setDriveErrorMsg("");
    try {
      const folderId = await getOrCreateNongBotFolder(accessToken);
      const postName = `${post.productInfo?.productType || "Product"}-ad-copy-${Date.now()}.txt`;
      
      // Ensure we append branding to the saved Drive copy, keeping it highly compliant
      const textToSave = `${fullText}\n\n— Backup Created on Google Drive of NongBot AI User`;
      
      await uploadTextToDrive(accessToken, postName, textToSave, folderId);
      setDriveSuccessMsg(`สำรองข้อมูลข้อความสำเร็จ! (จัดเก็บในไฟล์: "${postName}") 🎉`);
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg("เกิดข้อผิดพลาดในการสำรองข้อความ โปรดลองอีกครั้งหรือเชื่อมต่อระบบใหม่ครับ");
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleSaveImageToDrive = async () => {
    if (!accessToken) {
      setDriveErrorMsg("กรุณาเชื่อมต่อ Google Drive ก่อนใช้งานครับ");
      return;
    }
    if (!displayedImage) {
      setDriveErrorMsg("ไม่พบรูปภาพสำหรับการสำรองข้อมูล");
      return;
    }

    const confirmBackup = window.confirm(
      "คุณต้องการบันทึกรูปภาพโฆษณาพร้อมลายน้ำไปยัง Google Drive ของคุณหรือไม่?\nระบบจะจัดเก็บไฟล์รูปภาพพรีเมียมในโฟลเดอร์ 'NongBot AI Posts'"
    );
    if (!confirmBackup) return;

    setIsDriveBusy(true);
    setDriveSuccessMsg("");
    setDriveErrorMsg("");
    try {
      // 1. Generate premium watermarked picture
      const watermarkedBase64 = await applyWatermark(displayedImage, "NongBot AI 🍊");
      
      // 2. Fetch or create central directory block
      const folderId = await getOrCreateNongBotFolder(accessToken);
      const imageName = `${post.productInfo?.productType || "Product"}-ad-graphic-${Date.now()}.jpeg`;
      
      // 3. Dispatch stream
      await uploadImageToDrive(accessToken, imageName, watermarkedBase64, folderId);
      setDriveSuccessMsg(`สำรองรูปวาดและลายน้ำสำเร็จ! (บันทึกภาพ: "${imageName}") 🎉`);
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพพร้อมลายน้ำ โปรดลองเชื่อมต่อใหม่อีกครั้งครับ");
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleBackupBundleToDrive = async () => {
    if (!accessToken) {
      setDriveErrorMsg("กรุณาเชื่อมต่อ Google Drive ก่อนใช้งานครับ");
      return;
    }

    const confirmBackup = window.confirm(
      "คุณต้องการสั่งแพ็กคู่ด่วน (Bundle)! สำรองทั้งข้อความและโฆษณารูปภาพในปุ่มเดียวเลยหรือไม่?\nระบบจะจัดเก็บไฟล์ทั้งหมดเข้าสู่ 'NongBot AI Posts' ทันที"
    );
    if (!confirmBackup) return;

    setIsDriveBusy(true);
    setDriveSuccessMsg("");
    setDriveErrorMsg("");
    try {
      const folderId = await getOrCreateNongBotFolder(accessToken);
      const uniqueSuffix = Date.now();
      const baseName = post.productInfo?.productType || "Product";
      
      // 1. Save Text Ads
      const postName = `${baseName}-ad-copy-${uniqueSuffix}.txt`;
      const textToSave = `${fullText}\n\n— Generated with pride by NongBot AI 🍊`;
      await uploadTextToDrive(accessToken, postName, textToSave, folderId);
      
      // 2. Save Image Ads if available
      let imgStatus = "";
      if (displayedImage) {
        const watermarkedBase64 = await applyWatermark(displayedImage, "NongBot AI 🍊");
        const imageName = `${baseName}-ad-graphic-${uniqueSuffix}.jpeg`;
        await uploadImageToDrive(accessToken, imageName, watermarkedBase64, folderId);
        imgStatus = " และรูปภาพโฆษณาพร้อมลายน้ำ";
      }

      setDriveSuccessMsg(`แพ็กเกจสำรองข้อมูลคู่ (ข้อความ${imgStatus}) เรียบร้อยภายในโฟลเดอร์คุณแล้ว! ✨`);
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg("ไม่สำเร็จในการสำรองแคมเปญแบบควิกคู่ โปรดลองทำการเชื่อมต่อระบบใหม่อีกครั้ง");
    } finally {
      setIsDriveBusy(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsDriveBusy(true);
    setDriveSuccessMsg("");
    setDriveErrorMsg("");
    try {
      await loginWithGoogle();
      setDriveSuccessMsg("เชื่อมต่อสำเร็จ! บัญชี Google ของคุณผูกเข้าร่วมเพื่อจัดการเอกสาร Google Drive แล้วครับ 🍊");
    } catch (err: any) {
      console.error(err);
      setDriveErrorMsg("เกิดปัญหาเชื่อมต่อระบบรับรองสิทธิ์ความปลอดภัย: " + (err.message || err));
    } finally {
      setIsDriveBusy(false);
    }
  };

  // Utility to resize and compress photos down safely
  const resizeImageAndGetBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
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

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    
    // Safety check check image limit
    if (editImageUrls.length + list.length > 10) {
      alert("คุณสามารถบันทึกรูปภาพประวัติโพสต์สะสมได้สูงสุด 10 รูปครับผม 🍊");
      return;
    }

    const processedImages: string[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const base64Str = await resizeImageAndGetBase64(file);
        processedImages.push(base64Str);
      } catch (err) {
        console.error("Error processing file:", err);
      }
    }
    
    if (processedImages.length > 0) {
      setEditImageUrls((prev) => [...prev, ...processedImages]);
      if (!editPrimaryImageUrl) {
        setEditPrimaryImageUrl(processedImages[0]);
      }
    }
  };

  const handleRemoveEditImage = (idxToRemove: number) => {
    const itemToRemove = editImageUrls[idxToRemove];
    const filtered = editImageUrls.filter((_, idx) => idx !== idxToRemove);
    setEditImageUrls(filtered);
    
    if (editPrimaryImageUrl === itemToRemove) {
      setEditPrimaryImageUrl(filtered[0] || "");
    }
  };

  const handleMoveImageLeft = (idx: number) => {
    if (idx === 0) return;
    setEditImageUrls((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const handleMoveImageRight = (idx: number) => {
    if (idx === editImageUrls.length - 1) return;
    setEditImageUrls((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  const handleSetPrimaryImage = (url: string) => {
    setEditPrimaryImageUrl(url);
    // Push cover image to index 0 of the photos collection
    setEditImageUrls(prev => {
      const filtered = prev.filter(u => u !== url);
      return [url, ...filtered];
    });
    setViewerIndex(0);
  };

  const handleSaveChanges = async () => {
    if (!post.id) return;
    setIsSaving(true);
    try {
      const tagsArray = editHashtags
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(t => t.startsWith("#") ? t : `#${t}`);

      const updatedGeneratedPost = {
        ...post.generatedPost,
        headline: editHeadline,
        productDescription: editProductDescription,
        emotionalSellingText: editEmotionalSellingText,
        cta: editCta,
      } as any;

      const finalPrimaryUrl = editPrimaryImageUrl || editImageUrls[0] || "";

      await updatePost(post.id, {
        imageUrl: finalPrimaryUrl,
        imageUrls: editImageUrls,
        generatedPost: updatedGeneratedPost,
        hashtags: tagsArray,
      });

      if (onUpdatePost) {
        onUpdatePost({
          ...post,
          imageUrl: finalPrimaryUrl,
          imageUrls: editImageUrls,
          generatedPost: updatedGeneratedPost,
          hashtags: tagsArray,
        });
      }

      setViewerIndex(0);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด คัดลอกข้อมูลหรืออัปเดตไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ 🍊");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6 font-sans">
      {/* Header action bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors cursor-pointer animate-fade-in"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปยังหน้าแรก</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Edit mode toggle switch buttons */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 bg-white border border-orange-200 text-slate-700 hover:bg-orange-50/50 cursor-pointer transition-transform hover:scale-102 active:scale-95 shadow-2xs"
              id="btn-edit-post-history"
              type="button"
            >
              <Pencil className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
              <span>แก้ไขโพสต์ประวัติ</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  // Revert states
                  setEditHeadline(post.generatedPost?.headline || "");
                  setEditProductDescription(post.generatedPost?.productDescription || "");
                  setEditEmotionalSellingText(post.generatedPost?.emotionalSellingText || "");
                  setEditCta(post.generatedPost?.cta || "");
                  setEditHashtags((post.hashtags || []).join(" "));
                  setEditImageUrls(imageUrlsList);
                  setEditPrimaryImageUrl(post.imageUrl || "");
                  setIsEditing(false);
                }}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                type="button"
              >
                <X className="w-3.5 h-3.5" />
                <span>ยกเลิก</span>
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                type="button"
              >
                {isSaving ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? "ตรวจรับการแก้ไข..." : "บันทึกการแก้ไข"}</span>
              </button>
            </div>
          )}

          {!isEditing && (
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 border shadow-xs transition-transform ${
                copied
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-brand-500 border-brand-500 text-white hover:bg-brand-600 cursor-pointer active:scale-95"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "คัดลอกลงคลิปบอร์ดแล้ว" : "คัดลอกโพสต์ทั้งหมด"}</span>
            </button>
          )}
        </div>
      </div>

      {!isEditing ? (
        /* Main post layout split */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left column: Image & Metadata */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-2xl overflow-hidden shadow-xs border border-orange-100 bg-gray-50 relative aspect-square">
              <img
                src={displayedImage}
                alt={post.productInfo?.productType}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Overlay indicators */}
              <div className="absolute bottom-3 left-3 bg-white/95 text-brand-600 font-bold px-3 py-1 rounded-xl text-xs border border-orange-100 shadow-2xs">
                {post.platform}
              </div>

              {imageUrlsList.length > 1 && (
                <div className="absolute top-3 left-3 bg-slate-900/60 text-white rounded-full px-2.5 py-0.5 text-[9px] font-semibold backdrop-blur-md">
                  รูปที่ {viewerIndex + 1} จาก {imageUrlsList.length}
                </div>
              )}
            </div>

            {/* Interactive thumb selection slider */}
            {imageUrlsList.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto py-1 justify-center scrollbar-none">
                {imageUrlsList.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setViewerIndex(idx)}
                    className={`relative w-10 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      viewerIndex === idx ? "border-brand-500 scale-102" : "border-slate-200 hover:border-brand-300"
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}

            {/* Smart Image Watermark Download Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadImageWithWatermark}
                disabled={isWatermarking}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100/50 active:scale-98 text-brand-700 border border-orange-200/60 text-xs font-black transition-all cursor-pointer disabled:opacity-60 shadow-2xs hover:shadow-sm"
              >
                {isWatermarking ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                    <span>กำลังฝังลายน้ำสิทธิบัตรแบรนด์...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                    <span>ดาวน์โหลดรูปสินค้าพร้อมลายน้ำพรีเมียม 🍊</span>
                  </>
                )}
              </button>
            </div>

            {/* Google Drive Integration Panel */}
            <div className="glass-panel p-5 rounded-2xl border border-orange-100/60 bg-gradient-to-br from-white to-orange-50/20 space-y-4">
              <div className="flex items-center justify-between border-b border-orange-100/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-brand-600 font-bold text-xs">
                    📁
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-gray-800 leading-none">สำรองแคมเปญสู่ Google Drive</h4>
                    <p className="text-[10px] text-gray-400 mt-1">เก็บไฟล์ในโฟลเดอร์ NongBot AI Posts</p>
                  </div>
                </div>
                {accessToken ? (
                  <span className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ● เชื่อมต่ออยู่
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    ยังไม่เชื่อมต่อ
                  </span>
                )}
              </div>

              {!accessToken ? (
                <div className="space-y-3 pt-0.5 text-left">
                  <p className="text-[11px] text-slate-500 leading-normal">
                    คุณยังไม่ได้ผูกบัญชี Google Drive ของคุณ บันทึกสำรองข้อมูลคำเสนอขายและแบนเนอร์สินค้าโดยตรงไปยังคลาวด์ได้ด้วยปุ่มเดียว
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    disabled={isDriveBusy}
                    className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.05 3.1v2.58h3.3c1.93-1.78 3.04-4.4 3.04-7.48c0-.61-.06-1.21-.17-1.72z"
                      />
                      <path
                        fill="currentColor"
                        d="m12 21.9c2.67 0 4.91-.89 6.55-2.4L15.25 16.9c-.89.6-2.02.95-3.25.95c-2.5 0-4.6-1.69-5.35-3.95H3.25v2.66c1.62 3.23 4.97 5.34 8.75 5.34z"
                      />
                      <path
                        fill="currentColor"
                        d="M6.65 13.9c-.2-.6-.31-1.24-.31-1.9s.11-1.3.31-1.9V7.44H3.25C2.5 8.94 2.1 10.62 2.1 12.38c0 1.76.4 3.44 1.15 4.94z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 6.1c1.45 0 2.76.5 3.79 1.48l2.84-2.84c-1.71-1.6-3.95-2.58-6.63-2.58C8.22 2.16 4.87 4.27 3.25 7.5L6.65 10.2c.75-2.27 2.85-3.95 5.35-3.95z"
                      />
                    </svg>
                    <span>เชื่อมต่อ Google Drive 🍊</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-0.5 text-left">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveTextToDrive}
                      disabled={isDriveBusy}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-orange-100 bg-white hover:bg-orange-50/30 text-slate-700 hover:border-brand-300 transition-all cursor-pointer disabled:opacity-50 text-center space-y-1.5"
                    >
                      <span className="text-xl">📝</span>
                      <span className="text-[10px] font-bold">สำรองไฟล์ข้อความ (.txt)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveImageToDrive}
                      disabled={isDriveBusy || !displayedImage}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-orange-100 bg-white hover:bg-orange-50/30 text-slate-700 hover:border-brand-300 transition-all cursor-pointer disabled:opacity-50 text-center space-y-1.5"
                    >
                      <span className="text-xl">🖼️</span>
                      <span className="text-[10px] font-bold">สำรองรูปภาพสิทธิบัตร</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackupBundleToDrive}
                    disabled={isDriveBusy}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  >
                    <span>⚡ สำรองแพ็กคู่ด่วน (Text + Image)</span>
                  </button>
                </div>
              )}

              {/* Status Feedbacks */}
              {isDriveBusy && (
                <div className="flex items-center gap-1.5 justify-center py-1 text-[10px] text-brand-600 font-bold animate-pulse">
                  <span className="h-3 w-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจข้อมูลสารสารบัญและจัดไฟล์ขึ้นคลาวด์...</span>
                </div>
              )}

              {driveSuccessMsg && (
                <div className="p-3 bg-green-50 border border-green-250 text-green-700 rounded-xl text-[10px] leading-relaxed text-left animate-fade-in font-medium">
                  {driveSuccessMsg}
                </div>
              )}

              {driveErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-150 text-red-600 rounded-xl text-[10px] leading-relaxed text-left animate-fade-in font-medium">
                  {driveErrorMsg}
                </div>
              )}
            </div>

            {/* Metadata info cards */}
            <div className="glass-panel p-4 rounded-xl space-y-3.5 border border-orange-100/40 text-xs">
              <h4 className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">เอกสารสรุปสินค้า</h4>
              
              <div className="flex justify-between items-center bg-orange-50/40 p-2.5 rounded-lg">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-400" /> สไตล์รูปสินค้า
                </span>
                <span className="font-bold text-gray-800">{post.productInfo?.style || "-"}</span>
              </div>

              <div className="flex justify-between items-center bg-orange-50/40 p-2.5 rounded-lg">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-orange-400" /> กลุ่มลูกค้าเป้าหมาย
                </span>
                <span className="font-bold text-gray-800 line-clamp-1 max-w-[150px]">{post.productInfo?.targetAudience || "-"}</span>
              </div>

              <div className="flex justify-between items-center bg-orange-50/40 p-2.5 rounded-lg">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" /> วันที่ผลิตประวัติ
                </span>
                <span className="font-bold text-gray-800">
                  {new Date(post.createdAt).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Right column: Generated post copies */}
          <div className="md:col-span-7 bg-white/60 rounded-3xl border border-orange-100/70 p-6 shadow-sm space-y-6">
            <div className="border-b border-orange-100/40 pb-4">
              <span className="text-xs text-brand-600 font-bold bg-orange-100 px-2.5 py-0.5 rounded-full inline-block">
                {post.tone} Mode
              </span>
              <h3 className="text-xl font-bold text-slate-800 mt-2">ผลลัพธ์คำโฆษณาฉบับเต็ม</h3>
            </div>

            {/* Elements copy box items */}
            <div className="space-y-5">
              {/* Hook / Headline */}
              <div className="space-y-1 bg-amber-50/20 p-3 rounded-xl border border-amber-100/40">
                <span className="text-[10px] text-amber-700 font-extrabold tracking-wide uppercase">1. พาดหัวหลัก (Headline Hook)</span>
                <p className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">{post.generatedPost?.headline}</p>
              </div>

              {/* Product description */}
              <div className="space-y-1 bg-orange-50/10 p-3.5 rounded-xl border border-orange-100/30">
                <span className="text-[10px] text-orange-700 font-extrabold tracking-wide uppercase">2. คำระบุจุดยืน (Product Features)</span>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{post.generatedPost?.productDescription}</p>
              </div>

              {/* Emotional words */}
              <div className="space-y-1 bg-pink-50/10 p-3.5 rounded-xl border border-pink-100/20">
                <span className="text-[10px] text-pink-700 font-extrabold tracking-wide uppercase">3. เติมเต็มอารมณ์ความคลั่งรัก (Value Proposition)</span>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{post.generatedPost?.emotionalSellingText}</p>
              </div>

              {/* CTA */}
              <div className="space-y-1 bg-teal-50/10 p-3.5 rounded-xl border border-teal-100/20">
                <span className="text-[10px] text-teal-700 font-extrabold tracking-wide uppercase">4. เรียกร้องความสนใจซื้อ (Call to Action)</span>
                <p className="text-xs font-semibold text-teal-800 leading-relaxed whitespace-pre-line">{post.generatedPost?.cta}</p>
              </div>

              {/* Hashtags list */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-extrabold tracking-wide uppercase">5. คอลเลกชันแฮชแท็ก (Hashtags)</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.hashtags.map((tag, idx) => (
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

            {/* Single preview quote template copy block */}
            <div className="bg-orange-50/30 rounded-2xl p-4 border border-orange-100 border-dashed space-y-2">
              <h4 className="text-xs font-bold text-slate-800">แนะนำวิธีใช้งาน:</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                สไตล์โพสต์ขายและหัวข้อนี้ถูกปรับจูนสไตล์สำหรับแพลตฟอร์ม **{post.platform}** เรียบร้อยแล้ว สไตล์ที่รังสรรค์เหมาะสำหรับการดึงคะแนนระบบ Search / SEO แพลตฟอร์มนั้นๆ เพียงกดคัดลอกแล้วนำไปแปะลงช่องรายละเอียดโพสต์ของคุณได้ทันที!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Edit Mode Interactive Form Workspace */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-orange-100/80 p-5 md:p-7 shadow-xs space-y-6"
        >
          <div className="border-b border-orange-100/40 pb-4">
            <h3 className="text-lg font-bold text-slate-800">เครื่องมือจัดการแก้ไขคำโฆษณาและภาพสินค้า 🍊✨</h3>
            <p className="text-xs text-gray-400 mt-1">อัปเดตแคปชันโปรโมเดลของคุณ และจัดการรูปภาพพร้อมกำหนดรูปหลักอย่างเป็นเอกภาพ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Edit Left Container: Product Images */}
            <div className="md:col-span-12 lg:col-span-5 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  รูปภาพผลงานทั้งหมด ({editImageUrls.length}/10 รูป)
                </label>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  * แนะนำคลิกรูปที่คุณต้องการเพื่อแต่งตั้งขึ้นเป็น <span className="text-brand-600 font-bold">🌟 รูปหน้าปกหลัก</span> ประจำโพสต์ขาย
                </p>

                {/* File input widget button */}
                {editImageUrls.length < 10 && (
                  <label className="relative mt-2 p-4 border-2 border-dashed border-orange-100 hover:border-brand-500 bg-orange-50/5 hover:bg-orange-50/20 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer">
                    <Upload className="w-5 h-5 text-brand-500 mb-1" />
                    <span className="text-xs font-bold text-slate-700">อัปโหลดภาพเพิ่ม</span>
                    <span className="text-[9px] text-gray-400">รองรับรูปแบบ JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadImages}
                      disabled={isSaving}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Thumbnails list with delete / select cover action */}
                {editImageUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    {editImageUrls.map((url, idx) => {
                      const isPrimary = editPrimaryImageUrl === url;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSetPrimaryImage(url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                            isPrimary ? "border-brand-500 ring-2 ring-brand-500/10 scale-102" : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          
                          {/* Trash Delete Action */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveEditImage(idx);
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-600 rounded-lg text-white shadow-xs cursor-pointer z-10"
                            title="ลบภาพนี้"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>

                          {/* Reordering Controls */}
                          {editImageUrls.length > 1 && (
                            <div className="absolute inset-x-0 bottom-1 flex justify-between px-1 z-10">
                              {idx > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveImageLeft(idx);
                                  }}
                                  className="p-1 bg-slate-950/70 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white rounded-md backdrop-blur-xs transition-colors cursor-pointer"
                                  title="เลื่อนรูปไปก่อนหน้า"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              ) : (
                                <div className="w-5" />
                              )}

                              {idx < editImageUrls.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveImageRight(idx);
                                  }}
                                  className="p-1 bg-slate-950/70 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white rounded-md backdrop-blur-xs transition-colors cursor-pointer"
                                  title="เลื่อนรูปไปถัดไป"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              ) : (
                                <div className="w-5" />
                              )}
                            </div>
                          )}

                          {isPrimary && (
                            <div className="absolute top-1 left-1 bg-brand-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-md shadow-sm z-10">
                              🌟 ปกหลัก
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400 border border-slate-100 rounded-xl font-medium">
                    ไม่มีรูปภาพใดๆ ในประวัติโพสต์ขณะนี้
                  </div>
                )}
              </div>
            </div>

            {/* Edit Right Container: Form Copy Texts */}
            <div className="md:col-span-12 lg:col-span-7 space-y-4">
              <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider border-b border-slate-100 pb-1">
                รายละเอียดคำโปรโมตสื่อความหมายสินค้า
              </label>

              {/* Headline block */}
              <div className="space-y-1">
                <span className="text-[10px] text-amber-900 font-extrabold tracking-wide uppercase">1. พาดหัวหลัก (Headline Hook)</span>
                <textarea
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  className="w-full p-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/50 text-slate-800 leading-relaxed font-semibold font-sans"
                  rows={2}
                  placeholder="แก้ไขวลีพาดหัวเด็ด..."
                />
              </div>

              {/* Product description block */}
              <div className="space-y-1">
                <span className="text-[10px] text-orange-900 font-extrabold tracking-wide uppercase">2. คำระบุจุดยืน (Product Features)</span>
                <textarea
                  value={editProductDescription}
                  onChange={(e) => setEditProductDescription(e.target.value)}
                  className="w-full p-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/50 text-slate-700 leading-relaxed font-sans"
                  rows={4}
                  placeholder="เขียนบรรยายคุณประโยชน์หรือโปรโมชัน..."
                />
              </div>

              {/* Value Proposition / Emotional */}
              <div className="space-y-1">
                <span className="text-[10px] text-pink-900 font-extrabold tracking-wide uppercase">3. เติมเต็มอารมณ์ความคลั่งรัก (Value Proposition)</span>
                <textarea
                  value={editEmotionalSellingText}
                  onChange={(e) => setEditEmotionalSellingText(e.target.value)}
                  className="w-full p-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/50 text-slate-700 leading-relaxed font-sans"
                  rows={3}
                  placeholder="เขียนปิดช่องว่าง ขยี้ปัญหาผู้บริโภค..."
                />
              </div>

              {/* CTA call to action */}
              <div className="space-y-1">
                <span className="text-[10px] text-teal-900 font-extrabold tracking-wide uppercase">4. เรียกร้องความสนใจซื้อ (Call to Action)</span>
                <textarea
                  value={editCta}
                  onChange={(e) => setEditCta(e.target.value)}
                  className="w-full p-3 text-xs md:text-sm rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/50 text-teal-900 font-bold leading-relaxed font-sans"
                  rows={3}
                  placeholder="เขียนเชิญชวนพิมพ์ CF หรือทักแชทพร้อมบอกโปรจำกัดเวลา..."
                />
              </div>

              {/* Hashtags list */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-extrabold tracking-wide uppercase">5. คอลเลกชันแฮชแท็ก (Hashtags)</span>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none bg-slate-50/50 text-slate-700 font-mono"
                  placeholder="เช่น #บิวตี้ #กู้หน้าพัง #ปังปุริเย่"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Deep Psychological Consumer Analysis */}
      {post.generatedPost?.marketingAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden mt-6"
        >
          {/* Decorative glowing background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 relative z-10">
            <div>
              <span className="text-xs text-orange-400 font-extrabold bg-orange-400/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Consumer Psychology Analysis
              </span>
              <h3 className="text-xl md:text-2xl font-bold font-sans mt-2 tracking-tight text-white">
                กลยุทธ์จิตวิทยาพฤติกรรมผู้บริโภคเชิงลึก 🧠✨
              </h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                วิเคราะห์จิตวิทยาเบื้องลึกเบื้องหลังของผู้ซื้อจริง เพื่อประกอบการกระตุ้นและรังสรรค์แคปชันปิดการขายอย่างต่อเนื่อง
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {/* Buyer Persona */}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] text-orange-400 font-extrabold tracking-wide uppercase block mb-1">
                  👥 ผู้ซื้อที่แท้จริง (Buyer Persona)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {post.generatedPost.marketingAnalysis.buyerPersona}
                </p>
              </div>
            </div>

            {/* Driving Emotion */}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] text-pink-400 font-extrabold tracking-wide uppercase block mb-1">
                  💖 อารมณ์แรงขับเคลื่อนหลัก (Driving Emotion)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {post.generatedPost.marketingAnalysis.drivingEmotion}
                </p>
              </div>
            </div>

            {/* Fears & Desires */}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] text-teal-400 font-extrabold tracking-wide uppercase block mb-1">
                  🔥 ความปรารถนา/ปมปัญหา (Fears & Desires)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {post.generatedPost.marketingAnalysis.fearsAndDesires}
                </p>
              </div>
            </div>

            {/* Product Superpower */}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3 md:col-span-2 lg:col-span-2">
              <div>
                <span className="text-[10px] text-amber-400 font-extrabold tracking-wide uppercase block mb-1">
                  ⚡ พลังวิเศษ of ผลิตภัณฑ์ (Product Superpower)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {post.generatedPost.marketingAnalysis.productSuperpower}
                </p>
              </div>
            </div>

            {/* Ideal Tone */}
            <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] text-purple-400 font-extrabold tracking-wide uppercase block mb-1">
                  📣 โทนเสียงสื่อสารที่ดีที่สุด (Ideal Tone)
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {post.generatedPost.marketingAnalysis.idealTone}
                </p>
              </div>
            </div>
          </div>

          {/* Psychological Trigger Words */}
          {post.generatedPost.marketingAnalysis.triggerWords && post.generatedPost.marketingAnalysis.triggerWords.length > 0 && (
            <div className="pt-4 border-t border-slate-800 relative z-10 space-y-2">
              <span className="text-[10px] text-slate-400 font-extrabold tracking-wide uppercase block">
                🎯 แนะนำคีย์เวิร์ดกระตุ้นกดสั่งซื้อสะกิดใจลูกค้า (Persuasive Trigger Words)
              </span>
              <div className="flex flex-wrap gap-2">
                {post.generatedPost.marketingAnalysis.triggerWords.map((word, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-orange-400 font-mono bg-orange-400/10 border border-orange-500/30 px-3 py-1 rounded-xl"
                  >
                    "{word}"
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Floating Mini Premium Toast Notification for direct copy feedback */}
      <AnimatePresence>
        {showBrandingToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3.5 backdrop-blur-md"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-brand-400 font-bold border border-orange-500/30 text-xs">
              🍊
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none text-left">Copied from NongBot AI</p>
              <p className="text-[10px] text-slate-400 mt-1">คัดลอกข้อความเป็นประโยคโฆษณาพร้อมลิงก์แบรนด์แล้วครับ ✨</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
