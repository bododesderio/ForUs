import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { getAllAppointments, deleteAppointment } from '../../services/api';
import { Table, TableWrapper, Row, Cell } from 'react-native-table-component';

const { width: screenWidth } = Dimensions.get('window');

type RootDrawerParamList = {
  '/(admin)/profile': undefined;
};

type AdminDrawerNavigationProp = DrawerNavigationProp<RootDrawerParamList>;

interface Appointment {
  id: string | number;
  user_id: string | number;
  consultant_id: string | number;
  title?: string;
  description?: string;
  status: string;
  reason?: string | null;
  appointment_datetime: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
  consultant_name?: string;
  user_profile_image?: string;
  consultant_profile_image?: string;
  [key: string]: any;
}

interface AuthContext {
  user?: { id: string | number; role: string; [key: string]: any };
  [key: string]: any;
}

const AppointmentsScreen = () => {
  const { COLORS = {
    background: '#fff',
    textDark: '#000',
    primary: '#007AFF',   
    border: '#ccc',
    cardBackground: '#f9f9f9',
    textSecondary: '#666',
    primaryLight: '#4da8ff',
    error: '#FF3B30' 
  }, mode } = useTheme();
  const auth = useAuth() as AuthContext; 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const appointmentsPerPage = 10;

  // Table configuration
  const tableHead = ['Date', 'Time', 'User', 'Consultant', 'Status', 'Actions'];
  const colWidths = [100, 100, 120, 120, 100, 120];

  // Fetch appointments with pagination
  useEffect(() => {
    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 2); // 3 months back
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month forward
        const response = await getAllAppointments({
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
          page: currentPage,
          limit: appointmentsPerPage,
          search: searchQuery,
          sortBy: 'appointment_datetime',
          sortOrder: 'DESC'
        });
        console.log('Fetched appointments:', response);
        if (response.success && response.appointments) {
          setAppointments(response.appointments);
          setFilteredAppointments(response.appointments);
          setTotalPages(response.pagination?.totalPages || 1);
        } else {
          Alert.alert('Error', response.message || 'Failed to fetch appointments');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching appointments');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppointments();
  }, [searchQuery, currentPage]);

  // Handle search
  useEffect(() => {
    const filtered = appointments.filter(appointment =>
      (appointment.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       appointment.consultant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       new Date(appointment.appointment_datetime).toLocaleDateString().includes(searchQuery) ||
       appointment.status?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredAppointments(filtered);
  }, [searchQuery, appointments]);

  // Handle pagination
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Handle view details
  const handleViewDetails = (appointment: Appointment) => {
    if (!appointment) {
      Alert.alert('Error', 'No appointment selected');
      return;
    }
    setSelectedAppointment(appointment);
    setModalVisible(true);
  };

  // Handle delete appointment
  const handleDeleteAppointment = (appointment: Appointment) => {
    if (!appointment) {
      Alert.alert('Error', 'No appointment selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can delete appointments');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the appointment on ${new Date(appointment.appointment_datetime).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteAppointment(appointment.id);
              if (response.success) {
                Alert.alert('Success', 'Appointment deleted successfully');
                setAppointments(prev => prev.filter(a => a.id !== appointment.id));
                setFilteredAppointments(prev => prev.filter(a => a.id !== appointment.id));
              } else {
                Alert.alert('Error', response.message || 'Failed to delete appointment');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting appointment');
            }
          }
        }
      ]
    );
  };

  // Render table cell content
  const renderCell = (data: any, index: number, rowData: Appointment) => {
    if (index === 5) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleViewDetails(rowData)} style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteAppointment(rowData)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    }
    const value = index === 0
      ? new Date(rowData.appointment_datetime).toLocaleDateString()
      : index === 1
      ? new Date(rowData.appointment_datetime).toLocaleTimeString()
      : index === 2
      ? `${rowData.user_name || 'N/A'}`.trim()
      : index === 3
      ? `${rowData.consultant_name || 'N/A'}`.trim()
      : data;
    return <Text style={styles.tableCell}>{value || 'N/A'}</Text>;
  };

  // Prepare table data with fallbacks
  const tableData = filteredAppointments.map(appointment => [
    '', // Date (handled in renderCell)
    '', // Time (handled in renderCell)
    '', // User (handled in renderCell)
    '', // Consultant (handled in renderCell)
    appointment.status || 'N/A',
    '' // Actions (handled in renderCell)
  ]);

  const navigation = useNavigation<AdminDrawerNavigationProp>();

  const renderCustomHeader = () => {
    return (
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => navigation.navigate('/(admin)/profile')}
          >
            <View style={styles.headerAvatar}>
              <Image 
                source={{ uri: auth.user?.profile_image }} 
                style={styles.headerProfileImage}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    menuButton: {
      marginRight: 16,
      padding: 4,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.textDark,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 12,
      marginHorizontal: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: COLORS.textDark,
      paddingVertical: 12,
    },
    tableContainer: {
      marginHorizontal: 20,
      minHeight: 400,
      width: colWidths.reduce((a, b) => a + b, 0),
    },
    table: {
      flex: 1,
    },
    tableHead: {
      height: 40,
      backgroundColor: COLORS.primaryLight,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    tableHeadText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.textDark,
      textAlign: 'center',
    },
    tableRow: {
      height: 50,
      backgroundColor: COLORS.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      flexDirection: 'row',
    },
    tableCell: {
      fontSize: 14,
      color: COLORS.textDark,
      textAlign: 'center',
      paddingVertical: 5,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignSelf: 'center',
      backgroundColor: COLORS.border,
      marginVertical: 5,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButton: {
      padding: 5,
      marginHorizontal: 2,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 16,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: COLORS.cardBackground,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    paginationButton: {
      padding: 10,
      backgroundColor: COLORS.primary,
      borderRadius: 8,
      opacity: 1,
    },
    disabledButton: {
      opacity: 0.5,
    },
    paginationButtonText: {
      color: COLORS.textDark,
      fontSize: 16,
      fontWeight: '600',
    },
    paginationText: {
      fontSize: 16,
      color: COLORS.textDark,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.textDark,
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    modalProfileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignSelf: 'center',
      marginBottom: 20,
      backgroundColor: COLORS.border,
    },
    modalField: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: COLORS.textSecondary,
    },
    modalValue: {
      fontSize: 14,
      color: COLORS.textDark,
      flex: 1,
      textAlign: 'right',
    },
    modalInput: {
      fontSize: 14,
      color: COLORS.textDark,
      flex: 1,
      textAlign: 'right',
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 4,
      paddingHorizontal: 8,
    },
    modalCloseButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: COLORS.primaryLight,
    },
    modalSaveButton: {
      padding: 10,
      backgroundColor: COLORS.primary,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    modalSaveButtonText: {
      color: COLORS.textDark,
      fontSize: 16,
      fontWeight: '600',
    },
    rowField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inlineProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    backgroundColor: COLORS.border,
  },
  });


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            onPress={() => navigation.toggleDrawer()}
            style={styles.menuButton}
          >
            <Ionicons name="menu-outline" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Management</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search appointments..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading appointments...</Text>
        </View>
      ) : filteredAppointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No appointments found</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={{ flexGrow: 1, minWidth: colWidths.reduce((a, b) => a + b, 0) }}
            >
              <View style={styles.tableContainer}>
                <Table borderStyle={{ borderWidth: 1, borderColor: COLORS.border }}>
                  <Row
                    data={tableHead}
                    style={styles.tableHead}
                    widthArr={colWidths}
                    textStyle={styles.tableHeadText}
                  />
                  {tableData.map((rowData, index) => (
                    <TableWrapper key={index} style={[styles.tableRow, { flexDirection: 'row' }]}>
                      {rowData.map((cellData, cellIndex) => (
                        <Cell
                          key={cellIndex}
                          data={renderCell(cellData, cellIndex, filteredAppointments[index])}
                          width={colWidths[cellIndex]}
                          style={{
                            width: colWidths[cellIndex],
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        />
                      ))}
                    </TableWrapper>
                  ))}
                </Table>
              </View>
            </ScrollView>
          </ScrollView>
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
              onPress={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <Text style={styles.paginationButtonText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.paginationText}>
              Page {currentPage} of {totalPages}
            </Text>
            <TouchableOpacity
              style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
              onPress={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={styles.paginationButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* View Details Modal */}
      <Modal
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {selectedAppointment && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Date</Text>
                <Text style={styles.modalValue}>{new Date(selectedAppointment.appointment_datetime).toLocaleDateString()}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Time</Text>
                <Text style={styles.modalValue}>{new Date(selectedAppointment.appointment_datetime).toLocaleTimeString()}</Text>
              </View>
              <View style={[styles.modalField, styles.rowField]}>
                <Text style={styles.modalLabel}>User</Text>
                <Text style={styles.modalValue}>{`${selectedAppointment.user_name || 'N/A'}`.trim()}</Text>
                <Image
                  source={{ uri: selectedAppointment.user_profile_image || 'https://via.placeholder.com/40' }}
                  style={styles.inlineProfileImage}
                  resizeMode="cover"
                  onError={() => console.log('User image failed to load for appointment:', selectedAppointment.id)}
                />
              </View>
              <View style={[styles.modalField, styles.rowField]}>
                <Text style={styles.modalLabel}>Consultant</Text>
                <Text style={styles.modalValue}>{`${selectedAppointment.consultant_name || 'N/A'}`.trim()}</Text>
                <Image
                  source={{ uri: selectedAppointment.consultant_profile_image || 'https://via.placeholder.com/40' }}
                  style={styles.inlineProfileImage}
                  resizeMode="cover"
                  onError={() => console.log('Consultant image failed to load for appointment:', selectedAppointment.id)}
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Title</Text>
                <Text style={styles.modalValue}>{selectedAppointment.title || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalValue}>{selectedAppointment.description || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Status</Text>
                <Text style={styles.modalValue}>{selectedAppointment.status || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Reason</Text>
                <Text style={styles.modalValue}>{selectedAppointment.cancellation_reason || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Created At</Text>
                <Text style={styles.modalValue}>{new Date(selectedAppointment.created_at).toLocaleString()}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Updated At</Text>
                <Text style={styles.modalValue}>{new Date(selectedAppointment.updated_at).toLocaleString()}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Appointment Datetime</Text>
                <Text style={styles.modalValue}>{new Date(selectedAppointment.appointment_datetime).toLocaleString()}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default AppointmentsScreen;
