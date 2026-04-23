import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useState } from 'react'
import { DataType } from '../data/card-data';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

type CarouselItem = {
    item: DataType;
    index: number;
    setUpcomingEvents: React.Dispatch<React.SetStateAction<DataType[]>>;
}

const CarouselItem = ({ item, index, setUpcomingEvents } : CarouselItem) => {
    const handleRemoveEvent = useCallback((eventId: number) => {
        setUpcomingEvents(prev => prev.filter(e => e.id !== eventId));
    }, []);
    const { COLORS } = useTheme();

    const truncateWords = (text: string, maxWords = 5) => {
        const words = text.split(' ');
        if (words.length <= maxWords) return text;
        return words.slice(0, maxWords).join(' ') + '...';
    };

    const styles = StyleSheet.create({
        carouselItem: {
            width: screenWidth - 32,
            alignItems: 'center',
        },
        eventCard: {
            width: screenWidth * 0.8,
            height: 165,
            borderRadius: 20,
            overflow: "hidden",
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
        },
        backgroundImage: {
            flex: 1,
            padding: 16,
        },
        overlay: {
            ...StyleSheet.absoluteFillObject, 
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
        },
        content: {
            flex: 1,
            paddingHorizontal: 16,
            paddingVertical: 10,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
        },
        topSection: {
            flex: 1,
            justifyContent: 'flex-start',
        },
        eventIcon: {
            marginBottom: 12,
        },
        titleText: {
            fontSize: 24,
            fontWeight: 'bold',
            color: COLORS.white,
            marginBottom: 10,
            textShadowColor: 'rgba(0, 0, 0, 0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 3,
        },
        middleSection: {
            flex: 2,
            justifyContent: 'center',
        },
        dateText: {
            fontSize: 18,
            fontWeight: '600',
            color: COLORS.white,
            marginBottom: 4,
        },
        locationText: {
            fontSize: 16,
            color: COLORS.white,
            marginBottom: 2,
            opacity: 0.9,
        },
        organizerText: {
            fontSize: 14,
            color: COLORS.white,
            opacity: 0.8,
            marginBottom: 8,
        },
        descriptionText: {
            fontSize: 14,
            color: COLORS.white,
            opacity: 0.9,
            lineHeight: 14,
            minHeight: 0,
        },
        bottomSection: {
            flex: 1,
            justifyContent: 'flex-end',
        },
        statusContainer: {
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
        },
        statusText: {
            fontSize: 12,
            color: COLORS.white,
            fontWeight: '500',
            textTransform: 'uppercase',
        },
    });

    return (
        <View style={styles.carouselItem}>
            <TouchableOpacity 
                style={styles.eventCard}
                onPress={() => console.log('Event tapped:', item.title)}
                onLongPress={() => handleRemoveEvent(item.id)}
            >
                <ImageBackground source={item.image} resizeMode='cover' style={styles.backgroundImage}>
                    <View style={styles.overlay} />
                    <View style={styles.content}>
                        <View style={styles.topSection}>
                            <Text style={styles.titleText}>{item.title}</Text>
                        </View>
                        <View style={styles.middleSection}>
                            <Text style={styles.dateText}>{item.date}</Text>
                            <Text style={styles.locationText}>{item.location}</Text>
                            <Text style={styles.organizerText}>{item.organizer}</Text>
                            <Text style={styles.descriptionText}>{truncateWords(item.description)}</Text>
                        </View>
                        <View style={styles.bottomSection}>
                            <View style={styles.statusContainer}>
                                <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                        </View>
                    </View>
                </ImageBackground>
            </TouchableOpacity>
        </View>
    );
}

export default CarouselItem;