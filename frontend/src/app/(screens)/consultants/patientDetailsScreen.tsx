import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../../context/ThemeContext';
import { Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { calculateAge } from '../../../helper/calculateAge';
import truncateWords from '../../../helper/truncateWords';
import { convertToLocalDate } from '../../../helper/convertDateTime';
import { getUserAppointments } from '../../../services/api'; // adjust path if needed

const { width: screenWidth } = Dimensions.get('window');

const PatientCardScreen = () => {
    const params = useLocalSearchParams();
    const { COLORS } = useTheme();
    let patientData = {
        name: "Sarah Hasten",
        age: "24",
        condition: "Anxiety & Depression",
        avatar: "https://i.pravatar.cc/150?img=1",
        moodScore: 7.2,
        sessionsCompleted: 8,
        nextSession: "Tomorrow, 2:00 PM",
        therapyType: "CBT",
        weight: "50 Kg",
        wellnessScore: 75,
        gender: "Female",
        startDate: "18 May, 2025",
        lastAssessment: "19 June, 2025",
        dateOfBirth: "March 15, 1999",
        bloodType: "O+",
        height: "165 cm",
        phoneNumber: "+256 701 234 567",
        email: "sarah.hasten@email.com",
        address: "Kampala, Central Region",
        emergencyContact: "John Hasten - +256 702 345 678",
        occupation: "Marketing Coordinator",
        medications: ["Sertraline 50mg", "Lorazepam 0.5mg"]
    };
    if (params.patient) {
        try {
            const parsed = JSON.parse(params.patient as string);
            console.log('Patient Data: ', parsed)
            patientData = {
                ...patientData,
                ...parsed,
                name: parsed.user_name || parsed.name || patientData.name,
                // age: parsed.age || patientData.age,
                condition: parsed.condition || patientData.condition,
                avatar: parsed.profile_image || patientData.avatar,
                age: parsed.dob || patientData.age,
                gender: parsed.gender || patientData.gender,
                email: parsed.user_email || patientData.email,
                phone: parsed.user_phone || '+256 000 000 000',
            };
        } catch (e) {}
    }

    const [activeTab, setActiveTab] = useState('information');
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const tabs = [
        { id: 'information', label: 'Information' },
        { id: 'sessions', label: 'Sessions' },
        // { id: 'progress', label: 'Progress' }
    ];

    const renderTabBar = () => (
        <View style={styles.tabContainer}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.id}
                    style={[
                        styles.tab,
                        activeTab === tab.id && styles.activeTab
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === tab.id && styles.activeTabText
                    ]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderMetricCard = (icon, label, value, unit, color = COLORS.primary, bgColor = COLORS.primaryLight) => (
        <View style={[styles.metricCard, { borderColor: color + '30' }]}>
            <View style={[styles.metricIcon, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.metricLabel}>{label}</Text>
            <View style={styles.metricValueContainer}>
                <Text style={[styles.metricValue, { color }]}>{value}</Text>
                <Text style={styles.metricUnit}>{unit}</Text>
            </View>
        </View>
    );

    const renderInformationRow = (label, value, icon = null) => (
        <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
                {icon && (
                    <View style={styles.infoIcon}>
                        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
                    </View>
                )}
                <Text style={styles.infoLabel}>{label}</Text>
            </View>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );

    const renderSessionCard = (session, idx) => (
        <View key={idx} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
                <View style={[styles.sessionTypeIcon, { backgroundColor: COLORS.primaryLight }]}>
                    <Ionicons name="people" size={16} color={COLORS.primary} />
                </View>
                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.type}</Text>
                    <Text style={styles.sessionDate}>{session.date}</Text>
                </View>
                <View style={[styles.sessionStatus, { backgroundColor: session.completed ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Text style={[styles.sessionStatusText, { color: session.completed ? COLORS.success : COLORS.warning }]}>
                        {session.completed ? 'Completed' : 'Upcoming'}
                    </Text>
                </View>
            </View>
            <Text style={styles.sessionNotes}>{session.notes}</Text>
        </View>
    );

    useEffect(() => {
        if (!patientData.user_id) return;
        setLoadingSessions(true);
        const fetchSessions = async () => {
            try {
                // Fetch both confirmed and completed appointments
                console.log('UserId: ', patientData.user_id)
                const result = await getUserAppointments(patientData.user_id, { status: 'confirmed,completed', limit: 50 });
                console.log('Session: ', result)
                if (result.success && result.appointments) {
                    setSessions(result.appointments);
                } else {
                    setSessions([]);
                }
            } catch (e) {
                setSessions([]);
            } finally {
                setLoadingSessions(false);
            }
        };
        fetchSessions();
    }, [patientData.user_id]);

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    contentContainer: {
        flex: 1,
    },
    // Header Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGrey,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
    },
    moreButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Patient Card Styles
    patientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    patientAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    patientInfo: {
        flex: 1,
    },
    patientName: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 4,
    },
    patientDetails: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    patientActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Metrics Styles
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 24,
        gap: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
    },
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        marginBottom: 8,
    },
    metricValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricUnit: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    // Next Session Styles
    nextSessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBackground,
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    nextSessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    nextSessionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    nextSessionInfo: {
        flex: 1,
    },
    nextSessionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    nextSessionDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    nextSessionActions: {
        flexDirection: 'row',
        gap: 8,
    },
    nextSessionActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.lightGrey,
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: COLORS.white,
        fontWeight: '600',
    },
    // Tab Content Styles
    tabContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 16,
    },
    infoContainer: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGrey,
    },
    infoLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoIcon: {
        marginRight: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '600',
        flex: 1,
        textAlign: 'right',
    },
    // Medications Styles
    medicationsContainer: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    medicationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGrey,
    },
    medicationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medicationText: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '500',
    },
    // Sessions Styles
    sessionsContainer: {
        gap: 16,
    },
    sessionCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sessionTypeIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textDark,
        marginBottom: 2,
    },
    sessionDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    sessionStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sessionStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    sessionNotes: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        fontStyle: 'italic',
    },
    // Progress Styles
    progressContainer: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.lightGrey,
    },
    progressItem: {
        marginBottom: 20,
    },
    progressLabel: {
        fontSize: 14,
        color: COLORS.textDark,
        fontWeight: '600',
        marginBottom: 8,
    },
    progressBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarFull: {
        flex: 1,
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        minWidth: 60,
    },
});

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient Profile</Text>
                <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.contentContainer}>
                {/* Patient Info Card */}
                <View style={styles.patientCard}>
                    <Image source={{ uri: patientData.avatar }} style={styles.patientAvatar} />
                    <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{patientData.name}</Text>
                        <Text style={styles.patientDetails}>{calculateAge(patientData.age)} years • {truncateWords({text: patientData.description, maxWords: 5})}</Text>
                    </View>
                    <View style={styles.patientActions}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Ionicons name="call" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                            <MaterialCommunityIcons name="android-messages" size={20} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Mental Health Metrics */}
                <View style={styles.metricsContainer}>
                    {renderMetricCard("happy", "Mood", patientData.mood, "/10", COLORS.success, COLORS.success + '20')}
                    {renderMetricCard("checkmark-circle", "Sessions", patientData.sessionsCompleted, "Done", COLORS.primary, COLORS.primaryLight)}
                </View>

                {/* Next Session Card */}
                {/* <View style={styles.nextSessionCard}>
                    <View style={styles.nextSessionHeader}>
                        <View style={[styles.nextSessionIcon, { backgroundColor: COLORS.warning + '20' }]}>
                            <Ionicons name="calendar" size={20} color={COLORS.warning} />
                        </View>
                        <View style={styles.nextSessionInfo}>
                            <Text style={styles.nextSessionTitle}>Next Session</Text>
                            <Text style={styles.nextSessionDate}>{patientData.nextSession}</Text>
                        </View>
                    </View>
                    <View style={styles.nextSessionActions}>
                        <TouchableOpacity style={styles.nextSessionActionButton}>
                            <Ionicons name="notifications" size={18} color={COLORS.warning} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextSessionActionButton}>
                            <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View> */}

                {/* Tab Bar */}
                {renderTabBar()}

                {/* Tab Content */}
                {activeTab === 'information' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                        <View style={styles.infoContainer}>
                            {renderInformationRow("Full Name", patientData.name, "person")}
                            {renderInformationRow("Date of Birth", convertToLocalDate(patientData.age), "calendar")}
                            {renderInformationRow("Age", `${calculateAge(patientData.age)} years`, "time")}
                            {renderInformationRow("Gender", patientData.gender, "male-female")}
                        </View>

                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <View style={styles.infoContainer}>
                            {renderInformationRow("Phone Number", patientData.phone, "call")}
                            {renderInformationRow("Email", patientData.email, "mail")}
                            {renderInformationRow("Address", patientData.address, "location")}
                        </View>

                        <Text style={styles.sectionTitle}>Professional Information</Text>
                        <View style={styles.infoContainer}>
                            {renderInformationRow("Occupation", patientData.occupation, "briefcase")}
                        </View>

                        {/* <Text style={styles.sectionTitle}>Current Medications</Text>
                        <View style={styles.medicationsContainer}>
                            {patientData.medications.map((medication, index) => (
                                <View key={index} style={styles.medicationItem}>
                                    <View style={[styles.medicationIcon, { backgroundColor: COLORS.error + '20' }]}>
                                        <Ionicons name="medical" size={16} color={COLORS.error} />
                                    </View>
                                    <Text style={styles.medicationText}>{medication}</Text>
                                </View>
                            ))}
                        </View> */}
                    </View>
                )}

                {activeTab === 'sessions' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Therapy Sessions</Text>
                        <View style={styles.sessionsContainer}>
                            {loadingSessions ? (
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            ) : sessions.length === 0 ? (
                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginTop: 16 }}>
                                    No past sessions found.
                                </Text>
                            ) : (
                                sessions.map((session, idx) => renderSessionCard(session, idx))
                            )}
                        </View>
                    </View>
                )}

                {/* {activeTab === 'progress' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Progress Overview</Text>
                        <View style={styles.progressContainer}>
                            <View style={styles.progressItem}>
                                <Text style={styles.progressLabel}>Anxiety Level</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFull, { backgroundColor: COLORS.error + '20' }]}>
                                        <View style={[styles.progressBarFill, { width: '30%', backgroundColor: COLORS.error }]} />
                                    </View>
                                    <Text style={styles.progressText}>Low</Text>
                                </View>
                            </View>
                            <View style={styles.progressItem}>
                                <Text style={styles.progressLabel}>Depression Score</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFull, { backgroundColor: COLORS.warning + '20' }]}>
                                        <View style={[styles.progressBarFill, { width: '45%', backgroundColor: COLORS.warning }]} />
                                    </View>
                                    <Text style={styles.progressText}>Moderate</Text>
                                </View>
                            </View>
                            <View style={styles.progressItem}>
                                <Text style={styles.progressLabel}>Coping Skills</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBarFull, { backgroundColor: COLORS.success + '20' }]}>
                                        <View style={[styles.progressBarFill, { width: '80%', backgroundColor: COLORS.success }]} />
                                    </View>
                                    <Text style={styles.progressText}>Good</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )} */}
            </ScrollView>

            <StatusBar style="dark" />
        </SafeAreaView>
    );
};

export default PatientCardScreen;