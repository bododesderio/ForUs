import { API_BASE_URL, getAccessToken } from './api';

export const uploadFile = async (
    fileUri: string,
    fileType: string = 'image/jpeg',
    fileName: string = 'upload'
): Promise<string> => {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
    } as any);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });

    const data = await response.json();
    if (!data.success || !data.url) {
        throw new Error(data.message || 'Upload failed');
    }
    return data.url;
};

export const uploadImage = (fileUri: string, fileName?: string) =>
    uploadFile(fileUri, 'image/jpeg', fileName || 'image.jpg');

export const uploadAudio = (fileUri: string, fileName?: string) =>
    uploadFile(fileUri, 'audio/mpeg', fileName || 'audio.mp3');

export const uploadVideo = (fileUri: string, fileName?: string) =>
    uploadFile(fileUri, 'video/mp4', fileName || 'video.mp4');

export const uploadDocument = (fileUri: string, fileName?: string) =>
    uploadFile(fileUri, 'application/pdf', fileName || 'document.pdf');
