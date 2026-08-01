/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
// TODO: MOCK DATA — replace with API call before production
import { Ionicons } from '@expo/vector-icons';
    id: number;
    title: string;
    description: string;
    time: string;
    color: string;
    icon: IoniconsName;
}

const data: EventType[] = [ 
    {
        id: 1,
        title: 'Morning Meditation',
        description: 'Start your day with mindfulness',
        time: '7:00 AM',
        color: '#4A90E2',
        icon: 'leaf-outline'
    },
    {
        id: 2,
        title: 'Therapy Session',
        description: 'Weekly counseling appointment',
        time: '2:00 PM',
        color: '#50C878',
        icon: 'people-outline'
    },
    {
        id: 3,
        title: 'Breathing Exercise',
        description: '10-minute guided breathing',
        time: '12:00 PM',
        color: '#FF8C00',
        icon: 'heart-outline'
    },
    {
        id: 4,
        title: 'Journal Writing',
        description: 'Reflect on your thoughts',
        time: '8:00 PM',
        color: '#9B59B6',
        icon: 'book-outline'
    },
    {
        id: 5,
        title: 'Group Support',
        description: 'Connect with others',
        time: '6:00 PM',
        color: '#E74C3C',
        icon: 'chatbubbles-outline'
    },
    {
        id: 6,
        title: 'Yoga Session',
        description: 'Gentle stretching and relaxation',
        time: '5:30 PM',
        color: '#1ABC9C',
        icon: 'body-outline'
    }
];

export {data};