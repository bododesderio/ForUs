export interface CloudinarySignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export const uploadToCloudinarySigned = async (
  fileUri: string,
  backendSignatureUrl: string
): Promise<string> => {
  // 1. Get signature and params from your backend
  const sigRes = await fetch(backendSignatureUrl);
  const { signature, timestamp, apiKey, cloudName, folder }: CloudinarySignatureResponse = await sigRes.json();

  // 2. Prepare FormData for upload
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  } as any);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  if (folder) formData.append('folder', folder);

  // 3. Upload to Cloudinary
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
};

export const uploadResource = async (
  fileUri: string,
  backendSignatureUrl: string,
  fileType: string = 'application/octet-stream',
  fileName: string = 'resource'
): Promise<string> => {
  // 1. Get signature and params from your backend
  const sigRes = await fetch(backendSignatureUrl);
  const { signature, timestamp, apiKey, cloudName, folder }: CloudinarySignatureResponse = await sigRes.json();

  // 2. Prepare FormData for upload
  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    type: fileType,
    name: fileName,
  } as any);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  if (folder) formData.append('folder', folder);

  // 3. Upload to Cloudinary
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  if (!data.secure_url) throw new Error(data.error?.message || 'Upload failed');
  return data.secure_url;
};
