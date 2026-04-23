// TODO: MOCK DATA — replace with API call before production
import { ImageSourcePropType } from "react-native";

export interface ActivityType {
    type: string;
    timestamp: string;
    image: string;
}

const activities_data: ActivityType[] = [
    { type: 'Mood Logged', timestamp: '2h ago', image: 'https://example.com/mood.jpg' },
    { type: 'Meditation', timestamp: 'Yesterday', image: 'https://example.com/meditation.jpg' },
    { type: 'Journal Entry', timestamp: '2d ago', image: 'https://example.com/journal.jpg' },
    { type: 'Breathing Exercise', timestamp: '3d ago', image: 'https://example.com/breathing.jpg' },
]

export {activities_data};


