/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
// TODO: MOCK DATA — replace with API call before production
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface UpcomingType {
    id: number;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    location: string;
    price: number;
    status: string;
    image: string;
}

const upcoming: UpcomingType[] = [ 
    {
        id: 1,
        doctorName: "Dr. Sarah Wilson",
        specialty: "Cardiologist",
        date: "7 June",
        time: "9:00 AM",
        location: "Berlin, Kurfürstendamm 23",
        price: 35,
        status: "confirmed",
        image: "https://images.unsplash.com/photo-1594824475520-b9e8a5f2a8a5?w=400&h=400&fit=crop&crop=face"
    },
    {
        id: 2,
        doctorName: "Dr. Michael Chen",
        specialty: "Dermatologist",
        date: "8 June",
        time: "2:30 PM",
        location: "Munich, Maximilianstraße 15",
        price: 45,
        status: "pending",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
    }
    ,
    {
        id: 6,
        doctorName: "Dr. Michael Chen",
        specialty: "Dermatologist",
        date: "8 June",
        time: "2:30 PM",
        location: "Munich, Maximilianstraße 15",
        price: 45,
        status: "pending",
        image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"
    }
];

export {upcoming};