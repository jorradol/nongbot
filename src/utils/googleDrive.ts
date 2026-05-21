/**
 * Google Drive Integration Utilities for NongBot AI
 * Implements high-fidelity Drive folder creation, file searches,
 * file creation, and media uploading for campaign materials.
 */

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface DriveListResponse {
  files: DriveFile[];
}

/**
 * Searches Google Drive for an existing folder by name to avoid duplicate folder creations.
 */
export async function findDriveFolder(accessToken: string, folderName: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Drive search failed: ${errorMsg}`);
    }

    const data: DriveListResponse = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error("Error finding Drive folder:", error);
    return null;
  }
}

/**
 * Creates a brand new directory folder in Google Drive.
 */
export async function createDriveFolder(accessToken: string, folderName: string): Promise<string> {
  try {
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        description: "Backups of your generated marketing posts using NongBot AI"
      })
    });

    if (!response.ok) {
      const errorMsg = await response.text();
      throw new Error(`Drive folder creation failed: ${errorMsg}`);
    }

    const folder: DriveFile = await response.json();
    return folder.id;
  } catch (error) {
    console.error("Error creating Google Drive folder:", error);
    throw error;
  }
}

/**
 * High-level lazy-creator: Resolves the centralized NongBot folder, or spawns it on demand.
 */
export async function getOrCreateNongBotFolder(accessToken: string): Promise<string> {
  const folderName = "NongBot AI Posts";
  const existingId = await findDriveFolder(accessToken, folderName);
  
  if (existingId) {
    return existingId;
  }
  
  return await createDriveFolder(accessToken, folderName);
}

/**
 * Uploads a text asset (.txt) to a specified folder inside Google Drive.
 */
export async function uploadTextToDrive(
  accessToken: string, 
  fileName: string, 
  content: string, 
  parentFolderId: string
): Promise<string> {
  try {
    // 1. Create file metadata in Drive
    const metaResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: "text/plain",
        parents: [parentFolderId]
      })
    });

    if (!metaResponse.ok) {
      const errorMsg = await metaResponse.text();
      throw new Error(`Failed to create file metadata: ${errorMsg}`);
    }

    const file: DriveFile = await metaResponse.json();

    // 2. Upload file content to the media upload endpoint
    const mediaResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "text/plain; charset=utf-8"
        },
        body: content
      }
    );

    if (!mediaResponse.ok) {
      const errorMsg = await mediaResponse.text();
      throw new Error(`Failed to upload media content to Drive: ${errorMsg}`);
    }

    return file.id;
  } catch (error) {
    console.error("Error backing up text draft to Drive:", error);
    throw error;
  }
}

/**
 * Converts standard Base64 Data URL or remote graphics URL into a rich file Binary Blob.
 */
export async function base64ToBlob(base64Data: string, mimeType = "image/jpeg"): Promise<Blob> {
  const base64Clean = base64Data.split(",")[1] || base64Data;
  const byteCharacters = atob(base64Clean);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Uploads a watermarked product graphic or advertising photo to Google Drive.
 */
export async function uploadImageToDrive(
  accessToken: string,
  fileName: string,
  base64OrBlobUrl: string,
  parentFolderId: string
): Promise<string> {
  try {
    // 1. Convert base64 data to a genuine binary blob
    const isBase64 = base64OrBlobUrl.startsWith("data:");
    let blob: Blob;

    if (isBase64) {
      const mimeMatch = base64OrBlobUrl.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      blob = await base64ToBlob(base64OrBlobUrl, mime);
    } else {
      // If it's a URL (e.g. from Firebase Storage, CDN, etc.), fetch it first
      const fetched = await fetch(base64OrBlobUrl);
      blob = await fetched.blob();
    }

    // 2. Create standard folder-nested metadata block inside Drive
    const metaResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: blob.type || "image/jpeg",
        parents: [parentFolderId]
      })
    });

    if (!metaResponse.ok) {
      const errorMsg = await metaResponse.text();
      throw new Error(`Failed to register image metadata in Drive: ${errorMsg}`);
    }

    const file: DriveFile = await metaResponse.json();

    // 3. Dispatch media update
    const mediaResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": blob.type || "image/jpeg"
        },
        body: blob
      }
    );

    if (!mediaResponse.ok) {
      const errorMsg = await mediaResponse.text();
      throw new Error(`Failed to stream binary image payload to Drive: ${errorMsg}`);
    }

    return file.id;
  } catch (error) {
    console.error("Error backing up image asset to Drive:", error);
    throw error;
  }
}
