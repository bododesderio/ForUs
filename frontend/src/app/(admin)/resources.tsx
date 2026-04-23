import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Dimensions, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/authContext';
import { fetchResources, updateResource, deleteResource } from '../../services/api';
import { Table, TableWrapper, Row, Cell } from 'react-native-table-component';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';

const { width: screenWidth } = Dimensions.get('window');

interface Resource {
  id: string | number;
  consultant_id: string | number;
  title: string;
  description: string;
  category: string;
  type: string;
  file_url: string;
  preview_image_url: string;
  author: string;
  duration: string;
  upload_date: string;
  rating: string | number;
  downloads: string | number;
  [key: string]: any;
}

interface AuthContext {
  user?: { id: string | number; role: string; [key: string]: any };
  [key: string]: any;
}

const ResourceManagementScreen = () => {
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
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editResourceData, setEditResourceData] = useState<Partial<Resource>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const resourcesPerPage = 10;

  // Table configuration
  const tableHead = ['Preview', 'title', 'Category', 'Type', 'Author', 'duration', 'Created', 'Actions'];
  const colWidths = [60, 120, 100, 80, 100, 80, 100, 100];

  // Fetch resources with pagination
  useEffect(() => {
    const fetchResourcesData = async () => {
      setIsLoading(true);
      try {
        const response = await fetchResources();
        console.log('Fetched resources:', response);
        if (response.success && response.resources) {
          setResources(response.resources);
          setFilteredResources(response.resources);
          setTotalPages(Math.ceil(response.resources.length / resourcesPerPage) || 1);
        } else {
          Alert.alert('Error', response.message || 'Failed to fetch resources');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching resources');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResourcesData();
  }, [searchQuery, currentPage]);

  // Handle search
  useEffect(() => {
    const filtered = resources.filter(resource =>
      (resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       resource.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       resource.author?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredResources(filtered);
    setTotalPages(Math.ceil(filtered.length / resourcesPerPage) || 1);
    setCurrentPage(1); // Reset to first page on search
  }, [searchQuery, resources]);

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
  const handleViewDetails = (resource: Resource) => {
    if (!resource) {
      Alert.alert('Error', 'No resource selected');
      return;
    }
    setSelectedResource(resource);
    setModalVisible(true);
  };

  // Handle edit resource
  const handleEditResource = (resource: Resource) => {
    if (!resource) {
      Alert.alert('Error', 'No resource selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can edit resources');
      return;
    }
    setEditResourceData({
      id: resource.id,
      consultant_id: resource.consultant_id,
      title: resource.title,
      description: resource.description,
      category: resource.category,
      type: resource.type,
      file_url: resource.file_url,
      preview_image_url: resource.preview_image_url,
      author: resource.author,
      duration: resource.duration
    });
    setEditModalVisible(true);
  };

  // Handle save edited resource
  const handleSaveEdit = async () => {
    if (!editResourceData.id) {
      Alert.alert('Error', 'No resource selected for editing');
      return;
    }
    try {
      const response = await updateResource({
        id: editResourceData.id,
        consultant_id: editResourceData.consultant_id,
        title: editResourceData.title,
        description: editResourceData.description,
        category: editResourceData.category,
        type: editResourceData.type,
        file_url: editResourceData.file_url,
        preview_image_url: editResourceData.preview_image_url,
        author: editResourceData.author,
        duration: editResourceData.duration
      });
      if (response.success) {
        Alert.alert('Success', 'Resource updated successfully');
        setResources(prev =>
          prev.map(r => (r.id === editResourceData.id ? { ...r, ...response.resource } : r))
        );
        setFilteredResources(prev =>
          prev.map(r => (r.id === editResourceData.id ? { ...r, ...response.resource } : r))
        );
        setEditModalVisible(false);
        setEditResourceData({});
      } else {
        Alert.alert('Error', response.message || 'Failed to update resource');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating resource');
    }
  };

  // Handle delete resource
  const handleDeleteResource = (resource: Resource) => {
    if (!resource) {
      Alert.alert('Error', 'No resource selected');
      return;
    }
    if (auth.user?.role !== 'admin') {
      Alert.alert('Error', 'Only admins can delete resources');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${resource.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteResource(resource.id);
              if (response.success) {
                Alert.alert('Success', 'Resource deleted successfully');
                setResources(prev => prev.filter(r => r.id !== resource.id));
                setFilteredResources(prev => prev.filter(r => r.id !== resource.id));
              } else {
                Alert.alert('Error', response.message || 'Failed to delete resource');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while deleting resource');
            }
          }
        }
      ]
    );
  };

  // Render table cell content
  const renderCell = (data: any, index: number, rowData: Resource) => {
    if (index === 0) {
      return (
        <Image
          source={{ uri: rowData.preview_image_url || 'https://via.placeholder.com/40' }}
          style={styles.profileImage}
          resizeMode="cover"
          onError={() => console.log('Thumbnail failed to load for resource:', rowData.id)}
        />
      );
    } else if (index === 7) {
      return (
        <View style={styles.actionsContainer}>
          <TouchableOpacity onPress={() => handleViewDetails(rowData)} style={styles.actionButton}>
            <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEditResource(rowData)} style={styles.actionButton}>
            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteResource(rowData)} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    }
    return <Text style={styles.tableCell}>{data || 'N/A'}</Text>;
  };

  // Prepare paginated table data
  const startIndex = (currentPage - 1) * resourcesPerPage;
  const endIndex = startIndex + resourcesPerPage;
  const paginatedResources = filteredResources.slice(startIndex, endIndex);
  const tableData = paginatedResources.map(resource => [
    '', // Preview (handled in renderCell)
    resource.title || 'N/A',
    resource.category || 'N/A',
    resource.type || 'N/A',
    resource.author || 'N/A',
    resource.duration || 'N/A',
    resource.upload_date ? new Date(resource.upload_date).toLocaleDateString() : 'N/A',
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
      borderRadius: 5,
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
      width: 200,
      height: 200,
      borderRadius: 10,
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
          <Text style={styles.headerTitle}>Resource Management</Text>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search resources..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading resources...</Text>
        </View>
      ) : filteredResources.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No resources found</Text>
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
                          data={renderCell(cellData, cellIndex, paginatedResources[index])}
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
            <Text style={styles.modalTitle}>Resource Details</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {selectedResource && (
            <ScrollView style={styles.modalContent}>
              <Image
                source={{ uri: selectedResource.preview_image_url || 'https://via.placeholder.com/100' }}
                style={styles.modalProfileImage}
                resizeMode="cover"
              />
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Name</Text>
                <Text style={styles.modalValue}>{selectedResource.title || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalValue}>{selectedResource.description || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Category</Text>
                <Text style={styles.modalValue}>{selectedResource.category || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Type</Text>
                <Text style={styles.modalValue}>{selectedResource.type || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Created By</Text>
                <Text style={styles.modalValue}>{selectedResource.author || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>duration</Text>
                <Text style={styles.modalValue}>{selectedResource.duration || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Created</Text>
                <Text style={styles.modalValue}>
                  {selectedResource.upload_date ? new Date(selectedResource.upload_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>File URL</Text>
                <Text style={styles.modalValue}>{selectedResource.file_url || 'N/A'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>rating</Text>
                <Text style={styles.modalValue}>{selectedResource.rating || '0'}</Text>
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Downloads</Text>
                <Text style={styles.modalValue}>{selectedResource.downloads || '0'}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal
        animationType="slide"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Resource</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setEditModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.title || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, title: text }))}
                placeholder="Enter name"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.description || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, description: text }))}
                placeholder="Enter description"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Category</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.category || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, category: text }))}
                placeholder="Enter category"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Type</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.type || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, type: text }))}
                placeholder="Enter type"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>File URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.file_url || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, file_url: text }))}
                placeholder="Enter file URL"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Thumbnail URL</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.preview_image_url || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, preview_image_url: text }))}
                placeholder="Enter thumbnail URL"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Created By</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.author || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, author: text }))}
                placeholder="Enter created by"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>duration</Text>
              <TextInput
                style={styles.modalInput}
                value={editResourceData.duration || ''}
                onChangeText={text => setEditResourceData(prev => ({ ...prev, duration: text }))}
                placeholder="Enter duration"
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

export default ResourceManagementScreen;