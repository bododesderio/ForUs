/**
 * @author Bodo Desderio <rooiboktechltd@gmail.com>
 * @copyright 2026 Rooibok Technologies. All rights reserved.
 */
// TODO: MOCK DATA — replace with API call before production
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface PastType {
    id: number;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
    price: number;
    status: string;
    image: string;
}

const past: PastType[] = [ 
    {
        id: 3,
        doctorName: "Eleanor Padilla",
        specialty: "Dentist",
        date: "16 April",
        time: "2:00 PM",
        price: 45,
        status: "completed",
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face"
      },
      {
        id: 4,
        doctorName: "Vinny Vang",
        specialty: "Oculist",
        date: "11 May",
        time: "9:00 AM",
        price: 25,
        status: "completed",
        image: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&crop=face"
      },
      {
        id: 5,
        doctorName: "Dr. Emma Rodriguez",
        specialty: "General Practitioner",
        date: "3 May",
        time: "11:15 AM",
        price: 40,
        status: "completed",
        image: "https://images.unsplash.com/photo-1594824475520-b9e8a5f2a8a5?w=400&h=400&fit=crop&crop=face"
      }
];

export {past};