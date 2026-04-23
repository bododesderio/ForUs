
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { getUsers, updateUserProfile, deleteUser } from '../../services/api';
import { Table, TableWrapper, Row, Cell } from 'react-native-table-component';

type RootDrawerParamList = {
  '/(admin)/profile': undefined;
};

type AdminDrawerNavigationProp = DrawerNavigationProp<RootDrawerParamList>;

interface User {
  id: string | number;
  first_name: string | null;
  last_name: string | null;
  username: string;
  email: string;
  role: string;
  created_at: string;
  dob?: string;
  gender?: string;
  profile_image?: string;
  [key: string]: any;
}

interface AuthContext {
  user?: { id: string | number; role: string; [key: string]: any };
  [key: string]: any;
}

const UserManagementScreen = () => {
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
  const navigation = useNavigation();

  const renderCustomHeader = () => {
    return (
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
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
  const auth = useAuth() as AuthContext;
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const usersPerPage = 10;

  // Table configuration
  const tableHead = ['Profile', 'Name', 'Username', 'Email', 'Role', 'Gender', 'DOB', 'Actions'];
  const colWidths = [60, 120, 100, 180, 80, 80, 80, 100];

  // Fetch users with pagination
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await getUsers({
          page: currentPage,
          limit: usersPerPage,
          role: 'user',
          search: searchQuery,
          sortBy: 'created_at',
          sortOrder: 'DESC'
        });
        console.log('Fetched users:', response);
        if (response.success && response.users) {
          setUsers(response.users);
          setFilteredUsers(response.users);
          setTotalPages(response.pagination?.totalPages || 1);
        } else {
          Alert.alert('Error', response.message || 'Failed to fetch users');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching users');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [searchQuery, currentPage]);

  // Handle search
  useEffect(() => {
    const filtered = users.filter(user =>
      (`${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

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
  const handleViewDetails = (user: User) => {
    if (!user) {
      Alert.alert('Error', 'No user selected');
      return;
    }
    setSelectedUser(user);
    setModalVisible(true);
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    if (!user) {
      Alert.alert('Error', 'No user selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can edit users');
      return;
    }
    setEditUserData({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      role: user.role,
      gender: user.gender,
      dob: user.dob
    });
    setEditModalVisible(true);
  };

  // Handle save edited user
  const handleSaveEdit = async () => {
    if (!editUserData.id) {
      Alert.alert('Error', 'No user selected for editing');
      return;
    }
    try {
      const response = await updateUserProfile({
        firstName: editUserData.first_name,
        lastName: editUserData.last_name,
        username: editUserData.username,
        email: editUserData.email,
        gender: editUserData.gender,
        dob: editUserData.dob
      });
      if (response.success) {
        Alert.alert('Success', 'User updated successfully');
        setUsers(prev =>
          prev.map(u => (u.id === editUserData.id ? { ...u, ...response.user } : u))
        );
        setFilteredUsers(prev =>
          prev.map(u => (u.id === editUserData.id ? { ...u, ...response.user } : u))
        );
        setEditModalVisible(false);
        setEditUserData({});
      } else {
        Alert.alert('Error', response.message || 'Failed to update user');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating user');
    }
  };

  // Handle delete user
  const handleDeleteUser = (user: User) => {
    if (!user) {
      Alert.alert('Error', 'No user selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can delete users');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${user.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteUser(user.id);
              if (response.success) {
                Alert.alert('Success', 'User deleted successfully');
                setUsers(prev => prev.filter(u => u.id !== user.id));
                setFilteredUsers(prev => prev.filter(u => u.id !== user.id));
              } else {
                Alert.alert('Error', response.message || 'Failed to delete user');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting user');
            }
          }
        }
      ]
    );
  };

  // Render table cell content
  const renderCell = (data: any, index: number, rowData: User) => {
    if (index === 0) {
      return (
        <Image
          source={{ uri: rowData.profile_image || 'https://via.placeholder.com/40' }}
          style={styles.profileImage}
          resizeMode="cover"
          onError={() => console.log('Image failed to load for user:', rowData.id)}
        />
      );
    } else if (index === 7) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleViewDetails(rowData)} style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEditUser(rowData)} style={styles.actionButton}>
            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteUser(rowData)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    }
    return <Text style={styles.tableCell}>{data || 'N/A'}</Text>;
  };

  // Prepare table data with fallbacks
  const tableData = filteredUsers.map(user => [
    '', // Profile (handled in renderCell)
    `${user.first_name || 'N/A'} ${user.last_name || ''}`.trim(),
    user.username || 'N/A',
    user.email || 'N/A',
    user.role || 'N/A',
    user.gender || 'N/A',
    user.dob || 'N/A',
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
          <Text style={styles.headerTitle}>User Management</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading users...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No users found</Text>
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
                          data={renderCell(cellData, cellIndex, filteredUsers[index])}
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
            <Text style={styles.modalTitle}>User Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {selectedUser && (
            <ScrollView style={styles.modalContent}>
              <Image
                source={{ uri: selectedUser.profile_image || 'https://via.placeholder.com/100' }}
                style={styles.modalProfileImage}
                resizeMode="cover"
              />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Full Name</Text>
                <Text style={styles.modalValue}>{`${selectedUser.first_name || 'N/A'} ${selectedUser.last_name || ''}`.trim()}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Username</Text>
                <Text style={styles.modalValue}>{selectedUser.username || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Email</Text>
                <Text style={styles.modalValue}>{selectedUser.email || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Role</Text>
                <Text style={styles.modalValue}>{selectedUser.role || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Gender</Text>
                <Text style={styles.modalValue}>{selectedUser.gender || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Date of Birth</Text>
                <Text style={styles.modalValue}>{selectedUser.dob || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Phone</Text>
                <Text style={styles.modalValue}>{selectedUser.phone || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Joined</Text>
                <Text style={styles.modalValue}>
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Last Updated</Text>
                <Text style={styles.modalValue}>{selectedUser.updated_at || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Notifications Enabled</Text>
                <Text style={styles.modalValue}>{selectedUser.notifications_enabled ? 'Yes' : 'No'}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        animationType="slide"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit User</Text>
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
                value={editUserData.first_name || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, first_name: text }))}
                placeholder="Enter first name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Last Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editUserData.last_name || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, last_name: text }))}
                placeholder="Enter last name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                value={editUserData.username || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, username: text }))}
                placeholder="Enter username"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                value={editUserData.email || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Gender</Text>
              <TextInput
                style={styles.modalInput}
                value={editUserData.gender || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, gender: text }))}
                placeholder="Enter gender"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Date of Birth</Text>
              <TextInput
                style={styles.modalInput}
                value={editUserData.dob || ''}
                onChangeText={text => setEditUserData(prev => ({ ...prev, dob: text }))}
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

export default UserManagementScreen;