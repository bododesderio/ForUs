import {AnimationObject} from 'lottie-react-native';


export interface OnboardingData {
  id: number;
  animation: AnimationObject;
  headline: string;
  body: string;
  textColor: string;
  backgroundColor: string;
}

const data: OnboardingData[] = [
  {
    id: 1,
    animation: require('../assets/animations/welcome.json'),
    headline: 'Your mental wellness journey starts here',
    body: 'Get personalized support and connect with a caring community.',
    textColor: '#005b4f',
    backgroundColor: '#ffa3ce',
  },
  {
    id: 2,
    animation: require('../assets/animations/therapist.json'),
    headline: 'Talk to licensed therapists anytime',
    body: 'Secure, confidential chat sessions available 24/7.',
    textColor: '#1e2169',
    backgroundColor: '#bae4fd',
  },
  {
    id: 3,
    animation: require('../assets/animations/connection.json'),
    headline: 'Connect with others like you',
    body: 'Join group workshops, support sessions, and wellness activities.',
    textColor: '#F15937',
    backgroundColor: '#faeb8a',
  },
];

export default data;
