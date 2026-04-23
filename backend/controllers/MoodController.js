import { getUserMood, setUserMood } from '../services/MoodServices.js';

// GET /api/mood?date=YYYY-MM-DD
export const getMood = async (req, res) => {
    const user_id = req.user.id;
    const { date } = req.query;
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }
    try {
        const mood = await getUserMood(user_id, date);
        if (mood === null) {
        return res.status(404).json({ message: 'No mood set for this date' });
        }
        return res.json({ mood });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};

// POST /api/mood { date, mood }
export const setMood = async (req, res) => {
    const user_id = req.user.id;
    const { date, mood } = req.body;
    if (!date || typeof mood !== 'number') {
        return res.status(400).json({ message: 'Date and mood (number) are required' });
    }
    try {
        await setUserMood(user_id, date, mood);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
};
