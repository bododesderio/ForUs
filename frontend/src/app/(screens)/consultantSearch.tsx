import React, { useEffect, useState } from 'react';
import {
View,
Text,
TextInput,
TouchableOpacity,
ScrollView,
StyleSheet,
SafeAreaView,
StatusBar,
useWindowDimensions,
Image,
Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widths } from '@tamagui/config';
import { router, useNavigation } from 'expo-router';
import { useUser } from '../../context/userContext';
import { useConsultant } from '../../context/consultantContext';

import generateTimeSlots from '../../helper/timeSlot';
import { useTheme } from '../../context/ThemeContext';

export default function SearchScreen() {
    const {consultants, getConsultants} = useUser();
    const { COLORS } = useTheme();
    const { selectConsultant } = useConsultant();
    const {width} = useWindowDimensions();
const [searchQuery, setSearchQuery] = useState('');
const [favorites, setFavorites] = useState(new Set([1]));
const navigation = useNavigation();

useEffect(() => {
    getConsultants();
}, []);

console.log("Consultants: ", consultants)

const toggleFavorite = (id: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
    newFavorites.delete(id);
    } else {
    newFavorites.add(id);
    }
    setFavorites(newFavorites);
};

const filteredConsultants = consultants.filter(consultant => 
    consultant?.username?.toLowerCase().includes(searchQuery.toLowerCase())
);

const renderTimeSlot = (timeSlot: string, index : number) => (
    <View key={index} style={styles.timeSlot}>
    <Text style={styles.timeText}>{timeSlot.time}</Text>
    </View>
);

const renderPractitioner = (consultant) => {    
    const times = consultant.available_from && consultant.available_to 
        ? generateTimeSlots(consultant.available_from, consultant.available_to, 90)
        : [];

        console.log("Available from: ", consultant.available_from);
        console.log("Available to: ", consultant.available_to);

    return (
        <Pressable 
        key={consultant.id} 
        style={styles.card}
        >
           {/* First Row: Profile Picture, Name, Rating, Specialty, and Heart */}
            <Pressable 
            style={styles.topRow}
            onPress={() => {
                    // Store consultant data in context
                    selectConsultant(consultant);
                    // Navigate to details screen (no params needed)
                    router.push('(screens)/ConsultantDetailsScreen');
                }}
            >
                <Image 
                    source={{ uri: consultant.profile_image || 'https://via.placeholder.com/48' }}
                    style={styles.profilePicture}
                />
                <View style={styles.mainInfo}>
                    <View style={styles.nameRatingRow}>
                        <Text style={styles.practitionerName}>{consultant.first_name} {consultant.last_name}</Text>
                        <View style={styles.ratingContainer}>
                            <Text style={styles.rating}>{consultant.rating}</Text>
                            <Ionicons name="star" size={14} color="#FFD700" />
                        </View>
                    </View>
                    <Text style={styles.specialty}>{consultant.profession || 'General Consultant'}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(consultant.id)}>
                    <Ionicons 
                        name={favorites.has(consultant.id) ? "heart" : "heart-outline"} 
                        size={20} 
                        color={favorites.has(consultant.id) ? COLORS.error : COLORS.placeholderText} 
                    />
                </TouchableOpacity>
            </Pressable>

            {/* Availability Text */}
            <Text style={styles.availabilityText}>Available appointments for today</Text>

            {/* Time Slots and Button */}
            <View style={styles.bottomSection}>
                <ScrollView horizontal contentContainerStyle={styles.timeSlotsContainer}>
                    {times?.map((timeSlot: string, index : number) => renderTimeSlot(timeSlot, index))}
                </ScrollView>
                <TouchableOpacity 
                    style={[styles.arrowButton, {flexDirection: "row", justifyContent: "center", alignItems: "center"}]} 
                    onPress={() => {
                        // Store consultant data in context
                        selectConsultant(consultant);
                        // Navigate to details screen (no params needed)
                        router.push('(screens)/createAppointment');
                    }}
                >
                    <Text style={{fontWeight: "600", fontSize: 16, marginRight: 5, color: COLORS.white}}>Book Now</Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                </TouchableOpacity>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
container: {
    flex: 1,
    backgroundColor: COLORS.background,
},
header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 30,
    shadowColor: COLORS.primary,
    shadowOffset: {
    width: 0,
    height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
},
headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
},
backButton: {
    padding: 12,
    marginRight: 16,
},
headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '600',
},
searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
},
searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
    width: 0,
    height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
},
searchIcon: {
    marginRight: 4,
},
searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 18,
    color: COLORS.textDark,
},
filterButton: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingVertical: 13,
    padding: 13,
    shadowColor: '#000',
    shadowOffset: {
    width: 0,
    height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
},
scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginTop: -20
},
scrollContent: {
    padding: 16,
    gap: 10
},
card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
    borderWidth: 0,
    borderColor: COLORS.border,
    marginBottom: 16,
},
topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
},
profilePicture: {
    width: 48,
    height: 48,
    borderRadius: 12,
},
mainInfo: {
    flex: 1,
},
nameRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
},
practitionerName: {
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '600',
},
ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
},
rating: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '600',
},
specialty: {
    color: COLORS.textSecondary,
    fontSize: 13,
},
availabilityText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 12,
},
bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
},
timeSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    overflow: "hidden"
},
timeSlot: {
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
},
timeText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '500',
},
arrowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 8,
},
});

return (
    <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
    
    {/* Custom Header */}
    <View style={styles.header}>
        <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={COLORS.white || '#333'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>General consultants</Text>
        </View>
    </View>
    <ScrollView style={styles.scrollView}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
                <Ionicons 
                name="search" 
                size={21} 
                color={COLORS.placeholderText} 
                style={styles.searchIcon}
                />
                <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor={COLORS.placeholderText}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                enterKeyHint='search'
                />
            </View>
            <TouchableOpacity style={styles.filterButton}>
                <Ionicons name="options" size={21} color={COLORS.placeholderText} />
            </TouchableOpacity>
        </View>
        {/* Practitioners List */}
        <View style={styles.scrollContent}>
            {filteredConsultants.map(renderPractitioner)}
        </View>
    </ScrollView>

    </SafeAreaView>
);

}

