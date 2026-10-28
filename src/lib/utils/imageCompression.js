import imageCompression from 'browser-image-compression';

/**
 * Compress bill receipt images before uploading to Firebase Storage
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
    console.error('Bill image compression error, using original file:', error);
    return imageFile;
  }
}

/**
 * Compress customer profile photos (~80KB target)
 */
export async function compressProfileImage(imageFile) {
  if (!imageFile) return null;

  const options = {
    maxSizeMB: 0.08, // Target max ~80 KB
    maxWidthOrHeight: 512, // Square profile avatar size
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    return compressedFile;
  } catch (error) {
    console.error('Profile image compression error, using original file:', error);
    return imageFile;
  }
}
