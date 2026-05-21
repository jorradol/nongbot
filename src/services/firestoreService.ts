import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  limit,
  updateDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AdPost, ProductInfo, ChatMessage, GeneratedPost } from "../types";

const POSTS_COLLECTION = "posts";

// Local storage helpers for demo mode
function getLocalPosts(): AdPost[] {
  try {
    return JSON.parse(localStorage.getItem("nongbot_local_posts") || "[]");
  } catch (e) {
    return [];
  }
}

function saveLocalPosts(posts: AdPost[]) {
  localStorage.setItem("nongbot_local_posts", JSON.stringify(posts));
}

// Update an existing generated post in history
export async function updatePost(
  postId: string,
  updatedData: {
    imageUrl?: string;
    imageUrls?: string[];
    generatedPost?: GeneratedPost;
    hashtags?: string[];
    platform?: string;
    tone?: string;
  }
): Promise<void> {
  if (postId?.startsWith("local_")) {
    const posts = getLocalPosts();
    const updated = posts.map(p => p.id === postId ? { 
      ...p, 
      ...updatedData, 
      imageUrls: updatedData.imageUrls || p.imageUrls,
      updatedAt: new Date().toISOString() 
    } : p);
    saveLocalPosts(updated);
    return;
  }

  try {
    const postDocRef = doc(db, POSTS_COLLECTION, postId);
    await updateDoc(postDocRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${POSTS_COLLECTION}/${postId}`);
    throw error;
  }
}

// Save a newly generated post to history
export async function saveGeneratedPost(
  userId: string,
  imageUrl: string,
  productInfo: ProductInfo,
  aiConversation: ChatMessage[],
  generatedPost: GeneratedPost,
  hashtags: string[],
  tone: string,
  platform: string,
  imageUrls?: string[]
): Promise<string> {
  if (userId === "demo_user_nongbot") {
    const freshId = "local_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const posts = getLocalPosts();
    const newPost: AdPost = {
      id: freshId,
      userId,
      imageUrl,
      imageUrls: imageUrls || (imageUrl ? [imageUrl] : []),
      productInfo,
      aiConversation,
      generatedPost,
      hashtags,
      tone,
      platform,
      createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    saveLocalPosts(posts);
    return freshId;
  }

  try {
    const docRef = await addDoc(collection(db, POSTS_COLLECTION), {
      userId,
      imageUrl,
      imageUrls: imageUrls || (imageUrl ? [imageUrl] : []),
      productInfo,
      aiConversation,
      generatedPost,
      hashtags,
      tone,
      platform,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, POSTS_COLLECTION);
    throw error;
  }
}

// Fetch all generated posts for a specific user
export async function getUserPosts(userId: string): Promise<AdPost[]> {
  if (userId === "demo_user_nongbot") {
    return getLocalPosts();
  }

  try {
    const q = query(
      collection(db, POSTS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const posts: AdPost[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let parsedCreatedAt = new Date().toISOString();
      if (data.createdAt) {
        if (typeof data.createdAt.seconds === "number") {
          parsedCreatedAt = new Date(data.createdAt.seconds * 1000).toISOString();
        } else if (typeof data.createdAt === "string") {
          parsedCreatedAt = data.createdAt;
        }
      }

      posts.push({
        id: doc.id,
        userId: data.userId,
        imageUrl: data.imageUrl,
        imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
        productInfo: data.productInfo,
        aiConversation: data.aiConversation || [],
        generatedPost: data.generatedPost,
        hashtags: data.hashtags || [],
        tone: data.tone || "friendly",
        platform: data.platform || "Facebook",
        createdAt: parsedCreatedAt
      });
    });
    
    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, POSTS_COLLECTION);
    throw error;
  }
}

// Delete a generated post
export async function deletePost(postId: string): Promise<void> {
  if (postId?.startsWith("local_")) {
    const posts = getLocalPosts();
    saveLocalPosts(posts.filter(p => p.id !== postId));
    return;
  }

  try {
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${POSTS_COLLECTION}/${postId}`);
    throw error;
  }
}

// Fetch general stats for Admin dashboard
export async function getAdminStats(): Promise<{
  totalUsers: number;
  totalPosts: number;
  activeUsers: number;
  creditsOverview: {
    totalCreditsAllocated: number;
    averageCreditsPerUser: number;
  }
}> {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const postsSnapshot = await getDocs(collection(db, "posts"));
    
    const totalUsers = usersSnapshot.size;
    const totalPosts = postsSnapshot.size;
    
    let totalCreditsAllocated = 0;
    usersSnapshot.forEach((doc) => {
      totalCreditsAllocated += doc.data().credits || 0;
    });
    
    const averageCreditsPerUser = totalUsers > 0 ? Math.round(totalCreditsAllocated / totalUsers) : 0;
    
    // Active users: count unique userIds in posts collection
    const activeUsersSet = new Set<string>();
    postsSnapshot.forEach((doc) => {
      if (doc.data().userId) {
        activeUsersSet.add(doc.data().userId);
      }
    });

    return {
      totalUsers,
      totalPosts,
      activeUsers: activeUsersSet.size,
      creditsOverview: {
        totalCreditsAllocated,
        averageCreditsPerUser
      }
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "admin_stats");
    throw error;
  }
}
