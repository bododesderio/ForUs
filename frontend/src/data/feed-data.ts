// TODO: MOCK DATA — replace with API call before production
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface UserType {
    name: string;
    avatar: string;
    username: string;
}

export interface FeedType {
    id: number;
    user: UserType;
    content: string;
    timestamp: string;
    likes: number;
    reposts: number;
    isLiked: boolean;
    isReposted: boolean;
    image: string | null;
}

const data: FeedType[] = [
    {
        id: 1,
        user: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c1cd?w=150&h=150&fit=crop&crop=face',
        username: '@sarah_j',
        },
        content: 'Just finished my morning meditation. Feeling so much more centered and ready for the day! 🧘‍♀️✨',
        timestamp: '2h ago',
        likes: 12,
        reposts: 3,
        isLiked: false,
        isReposted: false,
        image: null,
    },
    {
        id: 2,
        user: {
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        username: '@mike_c',
        },
        content: 'Remember: It\'s okay to not be okay. Taking care of your mental health is just as important as your physical health. 💙',
        timestamp: '4h ago',
        likes: 28,
        reposts: 8,
        isLiked: true,
        isReposted: false,
        image: null,
    },
    {
        id: 3,
        user: {
        name: 'Emma Wilson',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        username: '@emma_w',
        },
        content: 'Beautiful sunset walk today. Nature really is the best therapy sometimes 🌅',
        timestamp: '6h ago',
        likes: 15,
        reposts: 2,
        isLiked: false,
        isReposted: true,
        image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    },
    {
        id: 4,
        user: {
        name: 'Dr. Alex Kumar',
        avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        username: '@dr_alex',
        },
        content: 'Pro tip: Try the 4-7-8 breathing technique when feeling anxious. Inhale for 4, hold for 7, exhale for 8. Simple but effective! 🌬️',
        timestamp: '8h ago',
        likes: 42,
        reposts: 15,
        isLiked: true,
        isReposted: false,
        image: null,
    },
]

export {data};