import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Image, TextInput } from 'react-native'
import React, { useCallback, useMemo, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { DataType, data } from '../data/card-data';
import truncateWords from '../helper/truncateWords';

type CustomModal = {
    showEventModal: boolean;
    setShowEventModal: (modal: boolean) => void;
    setUpcomingEvents: React.Dispatch<React.SetStateAction<DataType[]>>;
    upcomingEvents: DataType[];
}

const CustomModal = ({showEventModal, setShowEventModal, upcomingEvents, setUpcomingEvents }:CustomModal) => {
    const [selectedEvent, setSelectedEvent] = useState<DataType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const availableEvents = useMemo(() => data, []);
    const { COLORS } = useTheme();

    // Filter events by search query
    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return availableEvents;
        const q = searchQuery.trim().toLowerCase();
        return availableEvents.filter(event =>
            event.title.toLowerCase().includes(q) ||
            event.description.toLowerCase().includes(q)
        );
    }, [availableEvents, searchQuery]);

    const handleAddEvent = useCallback((event: DataType) => {
        if (!upcomingEvents.find(e => e.id === event.id)) {
            setUpcomingEvents(prev => [...prev, event]);
        }
    }, [upcomingEvents, setUpcomingEvents]);

    const handleRemoveEvent = useCallback((event: DataType) => {
        setUpcomingEvents(prev => prev.filter(e => e.id !== event.id));
    }, [setUpcomingEvents]);

    const handleEventPress = useCallback((event: DataType) => {
        setSelectedEvent(event);
    }, []);

    const handleBackToList = useCallback(() => {
        setSelectedEvent(null);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedEvent(null);
        setShowEventModal(false);
    }, [setShowEventModal]);

    const isEventAdded = useCallback((event: DataType) => {
        return upcomingEvents.find(e => e.id === event.id);
    }, [upcomingEvents]);

    const styles = StyleSheet.create({
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#E0E0E0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textDark,
        flex: 1,
        textAlign: 'center',
    },
    closeButton: {
        padding: 8,
    },
    backButton: {
        padding: 8,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 16,
    },
    modalSubtitle: {
        fontSize: 16,
        color: COLORS.grey,
        marginVertical: 16,
        lineHeight: 22,
    },
    eventOption: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: COLORS.cardBackground,
        borderWidth: 1,
        borderColor: COLORS.border || '#E0E0E0',
        overflow: 'hidden',
        minHeight: 72,
        height: 72,
        padding: 0,
    },
    eventOptionAdded: {
        backgroundColor: COLORS.primaryLight || '#E6F0FA',
        borderColor: COLORS.primary,
    },
    eventOptionIcon: {
        width: 72,
        height: 72,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        padding: 0,
        margin: 0,
    },
    eventImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        minHeight: 72,
        minWidth: 72,
        borderRadius: 0,
    },
    eventOptionContent: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 0,
        paddingHorizontal: 16,
    },
    eventOptionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    eventOptionDescription: {
        fontSize: 14,
        color: COLORS.grey,
        marginBottom: 4,
    },
    eventOptionActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12, // Add horizontal padding to actions
        paddingVertical: 16, // Add vertical padding to actions
        minWidth: 40, // Ensures actions don't get squeezed
    },
    
    // Event Detail Styles
    eventDetailContainer: {
        paddingVertical: 0,
    },
    eventDetailImageContainer: {
        width: '100%',
        marginBottom: 24,
    },
    eventDetailImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    eventDetailContent: {
        paddingHorizontal: 8,
        paddingTop: 20,
    },
    eventDetailTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textDark,
        textAlign: 'center',
        marginBottom: 12,
    },
    eventDetailDescription: {
        fontSize: 16,
        color: COLORS.grey,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    eventDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 8,
    },
    eventDetailText: {
        fontSize: 14,
        color: COLORS.textDark,
        marginLeft: 12,
    },
    eventDetailActions: {
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border || '#E0E0E0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    addButton: {
        backgroundColor: COLORS.primary,
    },
    removeButton: {
        backgroundColor: '#FF6B6B',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
        marginLeft: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textDark,
        backgroundColor: 'transparent',
        paddingVertical: 0,
        paddingHorizontal: 0,
    },
})

    // Event List View
    const renderEventList = () => (
        <>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Wellness Event</Text>
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={handleCloseModal}
                >
                    <Ionicons name="close" size={24} color={COLORS.textDark} />
                </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={COLORS.grey} style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search events..."
                    placeholderTextColor={COLORS.grey}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                />
            </View>
            <ScrollView style={styles.modalContent}>
                <Text style={styles.modalSubtitle}>Choose events to add to your wellness routine:</Text>
                {filteredEvents.length === 0 && (
                    <Text style={{ color: COLORS.grey, textAlign: 'center', marginTop: 24 }}>No events found.</Text>
                )}
                {filteredEvents.map((event) => {
                    const isAdded = isEventAdded(event);
                    return (
                        <TouchableOpacity
                            key={event.id}
                            style={[styles.eventOption, isAdded && styles.eventOptionAdded]}
                            onPress={() => handleEventPress(event)}
                        >
                            <View style={styles.eventOptionIcon}>
                                <Image style={styles.eventImage} source={event.image} />
                            </View>
                            <View style={styles.eventOptionContent}>
                                <Text style={styles.eventOptionTitle}>{event.title}</Text>
                                <Text style={styles.eventOptionDescription}>{truncateWords({ text: event.description, maxWords: 5 })}</Text>
                            </View>
                            <View style={styles.eventOptionActions}>
                                {isAdded && (
                                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                )}
                                <Ionicons name="chevron-forward" size={20} color={COLORS.grey} style={{ marginLeft: 8 }} />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </>
    );

    // Event Detail View
    const renderEventDetail = () => {
        if (!selectedEvent) return null;
        
        const isAdded = isEventAdded(selectedEvent);
        
        return (
            <>
                <View style={styles.modalHeader}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={handleBackToList}
                    >
                        <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Event Details</Text>
                    <TouchableOpacity 
                        style={styles.closeButton}
                        onPress={handleCloseModal}
                    >
                        <Ionicons name="close" size={24} color={COLORS.textDark} />
                    </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent}>
                    <View style={styles.eventDetailContainer}>
                        <View style={styles.eventDetailImageContainer}>
                            <Image style={styles.eventDetailImage} source={selectedEvent.image} />
                        </View>
                        
                        <View style={styles.eventDetailContent}>
                            <Text style={styles.eventDetailTitle}>{selectedEvent.title}</Text>
                            <Text style={styles.eventDetailDescription}>{selectedEvent.description}</Text>
                            
                            {/* Additional event details can be added here */}
                            {selectedEvent.date && (
                                <View style={styles.eventDetailItem}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.grey} />
                                    <Text style={styles.eventDetailText}>{selectedEvent.date}</Text>
                                </View>
                            )}
                            
                            {selectedEvent.status && (
                                <View style={styles.eventDetailItem}>
                                    <Ionicons name="hourglass-outline" size={16} color={COLORS.grey} />
                                    <Text style={styles.eventDetailText}>{selectedEvent.status}</Text>
                                </View>
                            )}
                            
                            {selectedEvent.location && (
                                <View style={styles.eventDetailItem}>
                                    <Ionicons name="location-outline" size={16} color={COLORS.grey} />
                                    <Text style={styles.eventDetailText}>{selectedEvent.location}</Text>
                                </View>
                            )}
                            
                            {selectedEvent.organizer && (
                                <View style={styles.eventDetailItem}>
                                    <Ionicons name="person-outline" size={16} color={COLORS.grey} />
                                    <Text style={styles.eventDetailText}>Instructor: {selectedEvent.organizer}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </ScrollView>
                
                <View style={styles.eventDetailActions}>
                    {isAdded ? (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.removeButton]}
                            onPress={() => handleRemoveEvent(selectedEvent)}
                        >
                            <Ionicons name="remove-circle-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Remove from Schedule</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.addButton]}
                            onPress={() => handleAddEvent(selectedEvent)}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Add to Schedule</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </>
        );
    };
    
    return (
        <Modal
            visible={showEventModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseModal}
        >
            <SafeAreaView style={styles.modalContainer}>
                {selectedEvent ? renderEventDetail() : renderEventList()}
            </SafeAreaView>
        </Modal>
    )
}

export default CustomModal