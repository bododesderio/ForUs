import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { fetchConsultants, updateUserProfile, deleteConsultant } from '../../services/api';
import { Table, TableWrapper, Row, Cell } from 'react-native-table-component';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

const { width: screenWidth } = Dimensions.get('window');

interface Consultant {
  id: string | number;
  first_name: string | null;
  last_name: string | null;
  username: string;
  email: string;
  role: string;
  created_at: string;
  profession: string | null;
  location: string | null;
  rating: number | null;
  profile_image?: string;
  gender?: string;
  dob?: string;
  [key: string]: any;
}

interface AuthContext {
  user?: { id: string | number; role: string; [key: string]: any };
  [key: string]: any;
}

const ConsultantManagementScreen = () => {
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
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const auth = useAuth() as AuthContext;
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [filteredConsultants, setFilteredConsultants] = useState<Consultant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConsultant, setSelectedConsultant] = useState<Consultant | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editConsultantData, setEditConsultantData] = useState<Partial<Consultant>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const consultantsPerPage = 10;

  // Table configuration
  const tableHead = ['Profile', 'Name', 'Username', 'Email', 'profession', 'Location', 'Rating', 'Actions'];
  const colWidths = [60, 120, 100, 180, 100, 100, 80, 100];

  // Fetch consultants with pagination
  useEffect(() => {
    const fetchConsultantsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchConsultants({
          page: currentPage,
          limit: consultantsPerPage,
          // role: 'consultant',
          search: searchQuery,
          sortBy: 'created_at',
          sortOrder: 'DESC'
        });
        console.log('Fetched consultants:', response);
        if (response.success && response.consultants) {
          setConsultants(response.consultants);
          setFilteredConsultants(response.consultants);
          setTotalPages(response.pagination?.totalPages || 1);
        } else {
          Alert.alert('Error', response.message || 'Failed to fetch consultants');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching consultants');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConsultantsData();
  }, [searchQuery, currentPage]);

  // Handle search
  useEffect(() => {
    const filtered = consultants.filter(consultant =>
      (`${consultant.first_name || ''} ${consultant.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
       consultant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       consultant.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       consultant.profession?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       consultant.location?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredConsultants(filtered);
  }, [searchQuery, consultants]);

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
  const handleViewDetails = (consultant: Consultant) => {
    if (!consultant) {
      Alert.alert('Error', 'No consultant selected');
      return;
    }
    setSelectedConsultant(consultant);
    setModalVisible(true);
  };

  // Handle edit consultant
  const handleEditConsultant = (consultant: Consultant) => {
    if (!consultant) {
      Alert.alert('Error', 'No consultant selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can edit consultants');
      return;
    }
    setEditConsultantData({
      id: consultant.id,
      first_name: consultant.first_name,
      last_name: consultant.last_name,
      username: consultant.username,
      email: consultant.email,
      profession: consultant.profession,
      location: consultant.location,
      gender: consultant.gender,
      dob: consultant.dob
    });
    setEditModalVisible(true);
  };

  // Handle save edited consultant
  const handleSaveEdit = async () => {
    if (!editConsultantData.id) {
      Alert.alert('Error', 'No consultant selected for editing');
      return;
    }
    try {
      const response = await updateUserProfile({
        firstName: editConsultantData.first_name,
        lastName: editConsultantData.last_name,
        username: editConsultantData.username,
        email: editConsultantData.email,
        profession: editConsultantData.profession,
        location: editConsultantData.location,
        gender: editConsultantData.gender,
        dob: editConsultantData.dob
      });
      if (response.success) {
        Alert.alert('Success', 'Consultant updated successfully');
        setConsultants(prev =>
          prev.map(c => (c.id === editConsultantData.id ? { ...c, ...response.user } : c))
        );
        setFilteredConsultants(prev =>
          prev.map(c => (c.id === editConsultantData.id ? { ...c, ...response.user } : c))
        );
        setEditModalVisible(false);
        setEditConsultantData({});
      } else {
        Alert.alert('Error', response.message || 'Failed to update consultant');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Handle delete consultant
  const handleDeleteConsultant = (consultant: Consultant) => {
    if (!consultant) {
      Alert.alert('Error', 'No consultant selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can delete consultants');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${consultant.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteConsultant(consultant.id);
              if (response.success) {
                Alert.alert('Success', 'Consultant deleted successfully');
                setConsultants(prev => prev.filter(c => c.id !== consultant.id));
                setFilteredConsultants(prev => prev.filter(c => c.id !== consultant.id));
              } else {
                Alert.alert('Error', response.message || 'Failed to delete consultant');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting consultant');
            }
          }
        }
      ]
    );
  };

  // Render table cell content
  const renderCell = (data: any, index: number, rowData: Consultant) => {
    if (index === 0) {
      return (
        <Image
          source={{ uri: rowData.profile_image || 'https://via.placeholder.com/40' }}
          style={styles.profileImage}
          resizeMode="cover"
          onError={() => console.log('Image failed to load for consultant:', rowData.id)}
        />
      );
    } else if (index === 7) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleViewDetails(rowData)} style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEditConsultant(rowData)} style={styles.actionButton}>
            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteConsultant(rowData)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    }
    return <Text style={styles.tableCell}>{data || 'N/A'}</Text>;
  };

  // Prepare table data with fallbacks
  const tableData = filteredConsultants.map(consultant => [
    '', // Profile (handled in renderCell)
    `${consultant.first_name || 'N/A'} ${consultant.last_name || ''}`.trim(),
    consultant.username || 'N/A',
    consultant.email || 'N/A',
    consultant.profession || 'N/A',
    consultant.location || 'N/A',
    consultant.rating ? consultant.rating : 'N/A',
    '' // Actions (handled in renderCell)
  ]);

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
          <Text style={styles.headerTitle}>Consultant Management</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search consultants..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading consultants...</Text>
        </View>
      ) : filteredConsultants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No consultants found</Text>
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
                          data={renderCell(cellData, cellIndex, filteredConsultants[index])}
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
            <Text style={styles.modalTitle}>Consultant Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {selectedConsultant && (
            <ScrollView style={styles.modalContent}>
              <Image
                source={{ uri: selectedConsultant.profile_image || 'https://via.placeholder.com/100' }}
                style={styles.modalProfileImage}
                resizeMode="cover"
              />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <Text style={styles.modalValue}>{`${selectedConsultant.first_name || 'N/A'} ${selectedConsultant.last_name || ''}`.trim()}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Username</Text>
                <Text style={styles.modalValue}>{selectedConsultant.username || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Email</Text>
                <Text style={styles.modalValue}>{selectedConsultant.email || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>profession</Text>
                <Text style={styles.modalValue}>{selectedConsultant.profession || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Location</Text>
                <Text style={styles.modalValue}>{selectedConsultant.location || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Rating</Text>
                <Text style={styles.modalValue}>{selectedConsultant.rating ? selectedConsultant.rating.toFixed(2) : 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Gender</Text>
                <Text style={styles.modalValue}>{selectedConsultant.gender || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Date of Birth</Text>
                <Text style={styles.modalValue}>{selectedConsultant.dob || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Joined</Text>
                <Text style={styles.modalValue}>
                  {selectedConsultant.created_at ? new Date(selectedConsultant.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Last Updated</Text>
                <Text style={styles.modalValue}>{selectedConsultant.updated_at || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Notifications Enabled</Text>
                <Text style={styles.modalValue}>{selectedConsultant.notifications_enabled ? 'Yes' : 'No'}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Consultant Modal */}
      <Modal
        animationType="slide"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Consultant</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>First Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.first_name || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, first_name: text }))}
                placeholder="Enter first name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Last Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.last_name || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, last_name: text }))}
                placeholder="Enter last name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.username || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, username: text }))}
                placeholder="Enter username"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.email || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>profession</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.profession || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, profession: text }))}
                placeholder="Enter profession"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Location</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.location || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, location: text }))}
                placeholder="Enter location"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Gender</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.gender || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, gender: text }))}
                placeholder="Enter gender"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date of Birth</Text>
              <TextInput
                style={styles.modalInput}
                value={editConsultantData.dob || ''}
                onChangeText={text => setEditConsultantData(prev => ({ ...prev, dob: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveEdit}>
              <Text style={styles.modalSaveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default ConsultantManagementScreen;