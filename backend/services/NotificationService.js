import fetch from 'node-fetch';

export const sendPushNotificationAsync = async (pushToken, title, body, data = {}) => {
    if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
        throw new Error('Invalid Expo push token');
    }
    const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
    };
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
    const result = await response.json();
    if (result.data && result.data.status === 'ok') {
        return { success: true, message: 'Notification sent', result };
    } else {
        throw new Error(result.data?.message || 'Failed to send notification');
    }
};
