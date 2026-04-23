import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  Feather,
  FontAwesome5,
} from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

const PropertyRentalScreen = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const { COLORS } = useTheme();

  const images = [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop'
  ];

  const propertyDetails = [
    { id: 1, title: 'Bosphorus views', checked: true },
    { id: 2, title: 'Telephone', checked: true },
    { id: 3, title: 'Family Villa', checked: true },
    { id: 4, title: 'Internet', checked: true },
  ];

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 280,
    position: 'relative',
  },
  carouselImage: {
    width: width,
    height: 280,
    resizeMode: 'cover',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  forRentBadge: {
    position: 'absolute',
    top: 50,
    left: 70,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  forRentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    zIndex: 10,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    color: '#fff',
    fontSize: 14,
  },
  areaText: {
    color: '#fff',
    fontSize: 14,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#FF8C00',
  },
  contentContainer: {
    // padding: 16,
  },
  priceSection: {
    marginBottom: 14,
    borderBottomWidth: 0.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderColor: COLORS.lightGrey
  },
  priceLabel: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  priceFrequency: {
    fontSize: 16,
    color: '#666',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    paddingBottom: 14,
    borderColor: COLORS.lightGrey
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  propertyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkContainer: {
    marginRight: 12,
  },
  checkmarkOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
  },
  propertyDetailText: {
    fontSize: 16,
    color: '#333',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  mapContainer: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationLabels: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FF8C00',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingVertical: 8,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navTextActive: {
    fontSize: 12,
    color: '#FF8C00',
    marginTop: 4,
  },
  navText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

  const renderImageItem = ({ item, index }) => (
    <Image source={{ uri: item }} style={styles.carouselImage} />
  );

  const onImageScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrentImageIndex(roundIndex);
  };

  const renderPropertyDetail = ({ item }) => (
    <View style={styles.propertyDetailItem}>
      <View style={styles.checkmarkContainer}>
        <View style={styles.checkmarkOuter}>
          <View style={styles.checkmarkInner} />
        </View>
      </View>
      <Text style={styles.propertyDetailText}>{item.title}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Carousel Section */}
        <View style={styles.imageContainer}>
          <FlatList
            data={images}
            renderItem={renderImageItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onImageScroll}
            scrollEventThrottle={16}
          />
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>

          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => setIsFavorite(!isFavorite)}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#FF6B6B" : "#666"}
            />
          </TouchableOpacity>

          {/* Property Title Overlay */}
          <View style={styles.titleOverlay}>
            
            <Text style={styles.propertyTitle}>Bosphorus View</Text>
            <View style={styles.locationRow}>
              <View style={styles.locationItem}>
                <Ionicons name="location-outline" size={16} color="#fff" />
                <Text style={styles.locationText}>Istanbul</Text>
              </View>
              <Text style={styles.areaText}>400m²</Text>
            </View>
          </View>

          {/* Image Indicators */}
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>₺ 24,000.00</Text>
              <Text style={styles.priceFrequency}>monthly</Text>
            </View>
          </View>

          {/* <View style={{ backgroundColor: 'red', height: 2, width: '100%'}} /> */}

          {/* Property Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Ionicons name="bed-outline" size={24} color="#FF8C00" />
              <Text style={styles.featureText}>2 Bedrooms</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="bathtub" size={24} color="#FF8C00" />
              <Text style={styles.featureText}>3 Bathrooms</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialIcons name="kitchen" size={24} color="#FF8C00" />
              <Text style={styles.featureText}>2 Kitchens</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="car-outline" size={24} color="#FF8C00" />
              <Text style={styles.featureText}>1 Parking</Text>
            </View>
          </View>
          {/* Description Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </Text>
            <Text style={styles.descriptionText}>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </Text>
          </View>

          {/* Property Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Details</Text>
            <FlatList
              data={propertyDetails}
              renderItem={renderPropertyDetail}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>


          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&h=200&fit=crop'
                }}
                style={styles.mapImage}
              />
              <View style={styles.mapOverlay}>
                <View style={styles.mapPin}>
                  <Ionicons name="location" size={16} color="#fff" />
                </View>
              </View>
              {/* Location Labels */}
              <View style={styles.locationLabels}>
                <Text style={styles.locationLabel}>Maslak</Text>
                <Text style={styles.locationLabel}>Örneköy</Text>
                <Text style={styles.locationLabel}>Zerzave</Text>
              </View>
            </View>
          </View>

          {/* Contact Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.contactContainer}>
              <Text style={styles.contactName}>John Publ</Text>
              <View style={styles.contactButtons}>
                <TouchableOpacity style={styles.contactButton}>
                  <Feather name="phone" size={20} color="#FF8C00" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton}>
                  <Feather name="mail" size={20} color="#FF8C00" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#FF8C00" />
          <Text style={styles.navTextActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search-outline" size={24} color="#999" />
          <Text style={styles.navText}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#999" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="menu-outline" size={24} color="#999" />
          <Text style={styles.navText}>Menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PropertyRentalScreen