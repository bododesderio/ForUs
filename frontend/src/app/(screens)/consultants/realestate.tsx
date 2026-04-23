import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

const PublRealtyHomeScreen = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const { COLORS } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;

  const HEADER_MAX_HEIGHT = 200;
  const HEADER_MIN_HEIGHT = 100;
  const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const topSearches = [
    {
      id: 1,
      city: 'ISTANBUL',
      image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      city: 'LONDON',
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      city: 'BERLIN',
      image: 'https://images.unsplash.com/photo-1587330979470-3ea8e6babddc?w=400&h=300&fit=crop'
    }
  ];

  const featuredProperty = {
    id: 1,
    title: 'Big House',
    location: 'London',
    size: '520m²',
    price: '£750,000.00',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop',
    type: 'FOR SALE'
  };

  const newProperties = [
    {
      id: 1,
      price: '₺ 24,000.00',
      location: 'Rihtim Caddesi, 34710 Kadıköy',
      size: '400m²',
      beds: 2,
      baths: 3,
      parking: 1,
      image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=400&fit=crop'
    },
    {
      id: 2,
      price: '£ 750,000.00',
      location: '9484 Albert Road, London',
      size: '520m²',
      beds: 3,
      baths: 2,
      parking: 2,
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop'
    }
  ];

  // Animated values for header
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const searchBarTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -145],
    extrapolate: 'clamp',
  });

  // Logo animations - fade out completely
  const logoOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const logoTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -30],
    extrapolate: 'clamp',
  });

  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0.3, 0.8],
    extrapolate: 'clamp',
  });

  // Content margin animation to follow header height
  const contentMarginTop = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT + 60, HEADER_MIN_HEIGHT + 60], // Added space for search bar
    extrapolate: 'clamp',
  });

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  logoContainer: {
    position: 'absolute',
    top: 80,
    left: width * 0.35,
  },
  logoText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoOrange: {
    color: '#FB923C',
    fontSize: 42,
    fontWeight: 'bold',
  },
  logoWhite: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoSubtext: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  searchContainerTop: {
    position: 'absolute',
    top: 170, // Position at top of screen (below status bar)
    left: 24,
    right: 24,
    zIndex: 30, // Higher than header
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featuredImage: {
    width: '100%',
    height: 200,
  },
  featuredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  badge: {
    backgroundColor: '#FB923C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featuredDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
  },
  featuredPrice: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  propertyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,

    elevation: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  propertyImageContainer: {
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  heartButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  propertyInfo: {
    padding: 16,
  },
  propertyPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  propertyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  propertyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  propertyDetailText: {
    color: '#6B7280',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '500'
  },
  amenitiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
    borderColor: COLORS.lightGrey
  },
  amenityBadge: {
    paddingVertical: 4,
    borderRadius: 12,
    flex: 1,
    // marginHorizontal: 2,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5
  },
  amenityText: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '500'
  },
  cityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    overflow: 'hidden',
    height: 100,
  },
  cityImage: {
    width: '100%',
    height: '100%',
  },
  cityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cityTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
  },
});

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <Animated.Image
          source={{ uri: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=400&fit=crop' }}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [{ translateY: imageTranslateY }]
            }
          ]}
          resizeMode="cover"
        />
        <Animated.View style={[styles.headerOverlay, { opacity: overlayOpacity }]} />
        
        {/* Animated Logo - fades out completely */}
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }]
          }
        ]}>
          <View style={styles.logoText}>
            <Text style={styles.logoOrange}>publ</Text>
            <Text style={styles.logoWhite}>Realty</Text>
          </View>
          <Text style={styles.logoSubtext}>real estate 2024</Text>
        </Animated.View>
      </Animated.View>

      {/* Search Bar - Fixed at top */}
      <Animated.View style={[styles.searchContainerTop,  {
            opacity: 1,
            transform: [{ translateY: searchBarTranslateY }]
          } ]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            placeholder="Search Property"
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        <Animated.View style={{ marginTop: contentMarginTop }}>
          {/* Highlight Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlight</Text>
            
            <TouchableOpacity style={styles.featuredCard}>
              <Image
                source={{ uri: featuredProperty.image }}
                style={styles.featuredImage}
                resizeMode="cover"
              />
              <View style={styles.featuredOverlay} />
              
              {/* FOR SALE Badge */}
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{featuredProperty.type}</Text>
                </View>
              </View>

              {/* Property Info */}
              <View style={styles.featuredInfo}>
                <Text style={styles.featuredTitle}>{featuredProperty.title}</Text>
                <View style={styles.featuredDetails}>
                  <View style={styles.featuredDetailsLeft}>
                    <View style={styles.detailItem}>
                      <Ionicons name="location" size={14} color="white" />
                      <Text style={styles.detailText}>{featuredProperty.location}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="resize" size={14} color="white" />
                      <Text style={styles.detailText}>{featuredProperty.size}</Text>
                    </View>
                  </View>
                  <Text style={styles.featuredPrice}>{featuredProperty.price}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Top Searches - Moved after Highlight */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Searches</Text>
            
            <View style={styles.cityContainer}>
              {topSearches.map((city) => (
                <TouchableOpacity key={city.id} style={styles.cityCard}>
                  <Image
                    source={{ uri: city.image }}
                    style={styles.cityImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cityOverlay} />
                  <View style={styles.cityTextContainer}>
                    <Text style={styles.cityText}>{city.city}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Today New Section - Now last */}
          <View style={[styles.section, { paddingBottom: 100 }]}>
            <Text style={styles.sectionTitle}>Today New</Text>
            
            {newProperties.map((property) => (
              <View key={property.id} style={styles.propertyCard}>
                <View style={styles.propertyImageContainer}>
                  <Image
                    source={{ uri: property.image }}
                    style={styles.propertyImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity style={styles.heartButton}>
                    <Ionicons name="heart-outline" size={20} color="white" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyPrice}>{property.price}</Text>
                  <View style={styles.propertyDetailItem}>
                    <View style={styles.propertyDetail}>
                      <Ionicons name="location" size={14} color="#6B7280" />
                      <Text style={styles.propertyDetailText}>{property.location}</Text>
                    </View>
                    <View style={styles.propertyDetail}>
                      <Ionicons name="resize" size={14} color="#6B7280" />
                      <Text style={styles.propertyDetailText}>{property.size}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.amenitiesContainer}>
                    <View style={styles.amenityBadge}>
                      <Ionicons name="bed" size={22} color="#EA580C" />
                      <Text style={styles.amenityText}>
                        {property.beds} Beds
                      </Text>
                    </View>
                    <View style={styles.amenityBadge}>
                      <FontAwesome6 name="bath" size={18} color="#EA580C" />
                      <Text style={styles.amenityText}>
                        {property.baths} Baths
                      </Text>
                    </View>
                    <View style={styles.amenityBadge}>
                      <Ionicons name="car-sharp" size={22} color="#EA580C" />
                      <Text style={styles.amenityText}>
                        {property.parking} Parking
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Home')}
        >
          <Ionicons 
            name={activeTab === 'Home' ? 'home' : 'home-outline'} 
            size={24} 
            color={activeTab === 'Home' ? '#FB923C' : '#9CA3AF'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Home' ? '#FB923C' : '#9CA3AF' }]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Search')}
        >
          <Ionicons 
            name={activeTab === 'Search' ? 'search' : 'search-outline'} 
            size={24} 
            color={activeTab === 'Search' ? '#FB923C' : '#9CA3AF'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Search' ? '#FB923C' : '#9CA3AF' }]}>
            Search
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Profile')}
        >
          <Ionicons 
            name={activeTab === 'Profile' ? 'person' : 'person-outline'} 
            size={24} 
            color={activeTab === 'Profile' ? '#FB923C' : '#9CA3AF'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Profile' ? '#FB923C' : '#9CA3AF' }]}>
            Profile
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('Menu')}
        >
          <Ionicons 
            name={activeTab === 'Menu' ? 'menu' : 'menu-outline'} 
            size={24} 
            color={activeTab === 'Menu' ? '#FB923C' : '#9CA3AF'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'Menu' ? '#FB923C' : '#9CA3AF' }]}>
            Menu
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default PublRealtyHomeScreen 