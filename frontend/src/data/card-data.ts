// TODO: MOCK DATA — replace with API call before production
import {ImageSourcePropType} from 'react-native';

export interface ActivityType {
  name: string;
  date: string;
  price: string;
  image: ImageSourcePropType;
  cardId: number;
}

export interface DataType {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  image: ImageSourcePropType;
  status: string;
}

const data: DataType[] = [ 
  {
    id: 1,
    title: 'Mindfulness & Meditation Workshop',
    description: 'Learn practical mindfulness techniques to reduce stress and anxiety. This interactive workshop will guide you through breathing exercises, body scans, and meditation practices you can use daily.',
    date: '2025-06-20',
    location: 'Community Wellness Center, Main Street',
    organizer: 'Dr. Sarah Chen - Licensed Therapist',
    image: require('../assets/images/mental1.jpeg'),
    status: 'upcoming',
  },
  {
    id: 2,
    title: 'Mental Health First Aid Training',
    description: 'Become equipped to help someone experiencing a mental health crisis. This certified course covers recognizing signs of mental health issues and providing initial support.',
    date: '2025-06-25',
    location: 'Red Cross Training Center',
    organizer: 'Mental Health First Aid Uganda',
    image: require('../assets/images/mental2.jpeg'),
    status: 'upcoming',
  },
  {
    id: 3,
    title: 'Anxiety Support Group Meeting',
    description: 'A safe space to share experiences and coping strategies with others who understand anxiety. Facilitated by a licensed counselor in a supportive group setting.',
    date: '2025-06-18',
    location: 'Hope Community Center, Room 12',
    organizer: 'Anxiety & Depression Association',
    image: require('../assets/images/mental3.jpeg'),
    status: 'upcoming',
  },
];

export {data};
