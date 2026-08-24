import imageCompression from 'browser-image-compression';

/**
 * Compress bill receipt images before uploading to Supabase Storage
 */
export async function compressBillImage(imageFile, onProgress = null) {
  if (!imageFile) return null;

  // Options for receipt compression - balanced for fast upload and legible text
  const options = {
    maxSizeMB: 0.15, // Target max ~150 KB
    maxWidthOrHeight: 1280, // Keep text crisp and readable
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.75,
    onProgress: (progress) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(progress);
      }
    },
  };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    return compressedFile;
  } catch (error) {
    console.warn('Image compression fallback to original file:', error);
    return imageFile;
  }
}

/**
 * Compress profile / avatar images before uploading
 */
export async function compressProfileImage(imageFile, onProgress = null) {
  if (!imageFile) return null;

  // Options for profile photos - super lightweight ~50-80 KB, square dimension friendly
  const options = {
    maxSizeMB: 0.08, // Target max ~80 KB
    maxWidthOrHeight: 512, // Crisp on retina displays while very small
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    onProgress: (progress) => {
      if (onProgress && typeof onProgress === 'function') {
        onProgress(progress);
      }
    },
  };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    return compressedFile;
  } catch (error) {
    console.warn('Profile image compression fallback to original file:', error);
    return imageFile;
  }
}

