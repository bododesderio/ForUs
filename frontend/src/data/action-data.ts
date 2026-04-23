import { Ionicons } from '@expo/vector-icons';
import { 
    handleEmergencyCall, 
    handleFindTherapist, 
    handleResources, 
    handleWellnessChat 
} from '../helper/quickActions';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface ActionType {
    id: number;
    title: string;
    subtitle: string;
    icon: IoniconsName;
    backgroundColor: string;
    action: () => void;
}


const data: ActionType[] = [
    {
    id: 1,
    title: 'Mental Health Resources',
    subtitle: 'Articles & Guides',
    icon: 'book',
    backgroundColor: '#4A90E2',
    action: () => handleResources(),
},
{
    id: 2,
    title: 'Emergency Call',
    subtitle: '24/7 Crisis Support',
    icon: 'call',
    backgroundColor: '#FF4444',
    action: () => handleEmergencyCall(),
},
{
    id: 3,
    title: 'Find Therapist',
    subtitle: 'Professional Help',
    icon: 'person',
    backgroundColor: '#50C878',
    action: () => handleFindTherapist(),
},
{
    id: 4,
    title: 'Wellness Chat',
    subtitle: 'Connect with Community',
    icon: 'chatbubbles',
    backgroundColor: '#FF8C00',
    action: () => handleWellnessChat(),
},
]

export {data};
