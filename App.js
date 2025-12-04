import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  Animated, 
  Dimensions,
  Linking,
  Modal,
  FlatList,
  TextInput,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ENGLISH_AREAS = ['British', 'American', 'Canadian', 'Irish'];

// TheMealDB V2 API
const API_KEY = '65232507';
const API_BASE = `https://www.themealdb.com/api/json/v2/${API_KEY}`;

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [showSplash, setShowSplash] = useState(true);
  
  // Home
  const [meal, setMeal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showFullInstructions, setShowFullInstructions] = useState(false);
  
  // Favorites
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  
  // Latest
  const [latestMeals, setLatestMeals] = useState([]);
  const [latestLoading, setLatestLoading] = useState(false);
  
  // Discover
  const [discoverMeals, setDiscoverMeals] = useState([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Categories
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryMeals, setCategoryMeals] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  // Modal
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showMealModal, setShowMealModal] = useState(false);
  
  // Animations
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const swipeAnim = useRef(new Animated.ValueXY()).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;

  // Splash Animation
  useEffect(() => {
    Animated.timing(splashOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
        Animated.timing(logoRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
    Animated.timing(progressWidth, { toValue: 1, duration: 2500, useNativeDriver: false }).start();
    setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => setShowSplash(false));
    }, 3000);
  }, []);

  useEffect(() => {
    loadFavorites();
    getRandomMeal();
  }, []);

  useEffect(() => {
    if (activeTab === 'latest' && latestMeals.length === 0) fetchLatestMeals();
    else if (activeTab === 'discover' && discoverMeals.length === 0) fetchDiscoverMeals();
    else if (activeTab === 'categories' && categories.length === 0) fetchCategories();
  }, [activeTab]);

  // API Functions
  const fetchLatestMeals = async () => {
    setLatestLoading(true);
    try {
      const res = await fetch(`${API_BASE}/latest.php`);
      const data = await res.json();
      if (data.meals) setLatestMeals(data.meals);
    } catch (e) { console.log(e); }
    setLatestLoading(false);
  };

  const fetchDiscoverMeals = async () => {
    setDiscoverLoading(true);
    try {
      const res = await fetch(`${API_BASE}/randomselection.php`);
      const data = await res.json();
      if (data.meals) {
        setDiscoverMeals(data.meals);
        setCurrentSwipeIndex(0);
      }
    } catch (e) { console.log(e); }
    setDiscoverLoading(false);
  };

  const searchMeals = async (query) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search.php?s=${query}`);
      const data = await res.json();
      setSearchResults(data.meals || []);
    } catch (e) { console.log(e); }
    setSearchLoading(false);
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories.php`);
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (e) { console.log(e); }
    setCategoriesLoading(false);
  };

  const fetchCategoryMeals = async (category) => {
    setSelectedCategory(category);
    setCategoriesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/filter.php?c=${category}`);
      const data = await res.json();
      setCategoryMeals(data.meals || []);
    } catch (e) { console.log(e); }
    setCategoriesLoading(false);
  };

  const fetchMealDetails = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/lookup.php?i=${id}`);
      const data = await res.json();
      if (data.meals && data.meals[0]) {
        setSelectedMeal(data.meals[0]);
        setShowMealModal(true);
      }
    } catch (e) { console.log(e); }
  };

  // Favorites
  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem('favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch (e) { console.log(e); }
  };

  const saveFavorite = async (mealToSave) => {
    const target = mealToSave || meal;
    if (!target) return;
    const exists = favorites.find(f => f.idMeal === target.idMeal);
    if (exists) return;
    const newFavorites = [...favorites, target];
    setFavorites(newFavorites);
    try { await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites)); } catch (e) { console.log(e); }
  };

  const removeFavorite = async (id) => {
    const newFavorites = favorites.filter(f => f.idMeal !== id);
    setFavorites(newFavorites);
    try { await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites)); } catch (e) { console.log(e); }
  };

  const isFavorite = (mealToCheck) => {
    const target = mealToCheck || meal;
    return target && favorites.find(f => f.idMeal === target.idMeal);
  };

  // Home Functions
  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  };

  const getRandomMeal = async () => {
    setLoading(true);
    setShowFullInstructions(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    
    let foundMeal = null;
    let attempts = 0;
    while (!foundMeal && attempts < 20) {
      try {
        const res = await fetch(`${API_BASE}/random.php`);
        const data = await res.json();
        const recipe = data.meals[0];
        const hasVideo = recipe.strYoutube && recipe.strYoutube.trim() !== '';
        const isEnglish = ENGLISH_AREAS.includes(recipe.strArea);
        if (hasVideo && isEnglish) foundMeal = recipe;
        attempts++;
      } catch (err) { break; }
    }
    if (foundMeal) { setMeal(foundMeal); animateIn(); }
    setLoading(false);
  };

  // Swipe Functions
  const handleSwipe = (direction) => {
    const currentMeal = discoverMeals[currentSwipeIndex];
    Animated.parallel([
      Animated.timing(swipeAnim.x, { toValue: direction === 'right' ? width : -width, duration: 300, useNativeDriver: true }),
      Animated.timing(swipeOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => {
      if (direction === 'right' && currentMeal) saveFavorite(currentMeal);
      swipeAnim.setValue({ x: 0, y: 0 });
      swipeOpacity.setValue(1);
      if (currentSwipeIndex < discoverMeals.length - 1) setCurrentSwipeIndex(prev => prev + 1);
      else fetchDiscoverMeals();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => { swipeAnim.setValue({ x: gesture.dx, y: 0 }); },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 120) handleSwipe('right');
        else if (gesture.dx < -120) handleSwipe('left');
        else Animated.spring(swipeAnim, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    })
  ).current;

  const openYoutube = (url) => { if (url) Linking.openURL(url); };
  const spin = logoRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Splash Screen
  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
        <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.splashGradient}>
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }, { rotate: spin }] }]}>
            <View style={styles.logoCircle}><Text style={styles.logoEmoji}>👨‍🍳</Text></View>
          </Animated.View>
          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleTranslate }] }}>
            <Text style={styles.splashTitle}>Chef's Choice</Text>
          </Animated.View>
          <Animated.View style={{ opacity: subtitleOpacity }}>
            <Text style={styles.splashSubtitle}>Discover Delicious Recipes</Text>
          </Animated.View>
          <View style={styles.progressContainer}>
            <Animated.View style={[styles.progressBar, { width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Animated.Text style={[styles.loadingText, { opacity: subtitleOpacity }]}>Preparing your kitchen...</Animated.Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  // Meal Detail Modal
  const renderMealModal = () => (
    <Modal visible={showMealModal} animationType="slide" onRequestClose={() => setShowMealModal(false)}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowMealModal(false)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>Recipe Details</Text>
          <TouchableOpacity onPress={() => saveFavorite(selectedMeal)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>{isFavorite(selectedMeal) ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        {selectedMeal && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: selectedMeal.strMealThumb }} style={styles.modalImage} />
            <View style={styles.modalContent}>
              <Text style={styles.modalMealTitle}>{selectedMeal.strMeal}</Text>
              <View style={styles.tagsRow}>
                <View style={styles.tagYellow}><Text style={styles.tagText}>🍽️ {selectedMeal.strCategory}</Text></View>
                <View style={styles.tagPurple}><Text style={styles.tagText}>🌍 {selectedMeal.strArea}</Text></View>
              </View>
              {selectedMeal.strYoutube && (
                <TouchableOpacity onPress={() => openYoutube(selectedMeal.strYoutube)} style={styles.ytBtn}>
                  <Text style={styles.ytBtnText}>▶️ Watch on YouTube</Text>
                </TouchableOpacity>
              )}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🥗 Ingredients</Text>
                <View style={styles.ingredientsGrid}>
                  {[...Array(20)].map((_, i) => {
                    const ing = selectedMeal["strIngredient" + (i + 1)];
                    const measure = selectedMeal["strMeasure" + (i + 1)];
                    if (ing && ing.trim()) {
                      return (
                        <View key={i} style={styles.ingredientItem}>
                          <Text style={styles.ingredientDot}>•</Text>
                          <Text style={styles.ingredientText}>{measure} {ing}</Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              </View>
              {selectedMeal.strInstructions && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📝 Instructions</Text>
                  <Text style={styles.instructions}>{selectedMeal.strInstructions}</Text>
                </View>
              )}
              <View style={{ height: 50 }} />
            </View>
          </ScrollView>
        )}
      </LinearGradient>
    </Modal>
  );

  // Favorites Modal
  const renderFavoritesModal = () => (
    <Modal visible={showFavorites} animationType="slide" onRequestClose={() => setShowFavorites(false)}>
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>❤️ Saved Recipes ({favorites.length})</Text>
          <TouchableOpacity onPress={() => setShowFavorites(false)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No saved recipes yet</Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.idMeal}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setSelectedMeal(item); setShowFavorites(false); setShowMealModal(true); }} style={styles.listItem}>
                <Image source={{ uri: item.strMealThumb }} style={styles.listImage} />
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle} numberOfLines={2}>{item.strMeal}</Text>
                  <Text style={styles.listSub}>{item.strArea} • {item.strCategory}</Text>
                </View>
                <TouchableOpacity onPress={() => removeFavorite(item.idMeal)} style={styles.deleteBtn}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </LinearGradient>
    </Modal>
  );

  // HOME TAB
  const renderHomeTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerEmoji}>👨‍🍳</Text>
          <View>
            <Text style={styles.headerTitle}>Chef's Choice</Text>
            <Text style={styles.headerSub}>English Video Recipes</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowFavorites(true)} style={styles.favBtn}>
          <Text style={styles.favBtnText}>❤️ {favorites.length}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={getRandomMeal} style={styles.discoverBtn}>
        <LinearGradient colors={['#ffd700', '#ff8c00']} style={styles.discoverBtnGrad}>
          <Text style={styles.discoverBtnText}>✨ Discover New Recipe</Text>
        </LinearGradient>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#ffd700" /></View>
      ) : meal && (
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.cardImageWrap}>
            <Image source={{ uri: meal.strMealThumb }} style={styles.cardImage} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.cardGrad} />
            <View style={styles.cardContent}>
              <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>🎥 EN Video</Text></View>
              <Text style={styles.cardTitle}>{meal.strMeal}</Text>
            </View>
            <TouchableOpacity onPress={() => saveFavorite()} style={styles.heartBtn}>
              <Text style={styles.heartText}>{isFavorite() ? '❤️' : '🤍'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagsRow}>
            <View style={styles.tagYellow}><Text style={styles.tagText}>🍽️ {meal.strCategory}</Text></View>
            <View style={styles.tagPurple}><Text style={styles.tagText}>🌍 {meal.strArea}</Text></View>
          </View>
          <TouchableOpacity onPress={() => openYoutube(meal.strYoutube)} style={styles.ytBtn}>
            <Text style={styles.ytBtnText}>▶️ Watch on YouTube</Text>
          </TouchableOpacity>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🥗 Ingredients</Text>
            <View style={styles.ingredientsGrid}>
              {[...Array(20)].map((_, i) => {
                const ing = meal["strIngredient" + (i + 1)];
                const measure = meal["strMeasure" + (i + 1)];
                if (ing && ing.trim()) {
                  return (
                    <View key={i} style={styles.ingredientItem}>
                      <Text style={styles.ingredientDot}>•</Text>
                      <Text style={styles.ingredientText}>{measure} {ing}</Text>
                    </View>
                  );
                }
                return null;
              })}
            </View>
          </View>
          {meal.strInstructions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📝 Instructions</Text>
              <Text style={styles.instructions} numberOfLines={showFullInstructions ? undefined : 4}>{meal.strInstructions}</Text>
              <TouchableOpacity onPress={() => setShowFullInstructions(!showFullInstructions)} style={styles.expandBtn}>
                <Text style={styles.expandBtnText}>{showFullInstructions ? '▲ Show Less' : '▼ Read Full Recipe'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      )}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // LATEST TAB
  const renderLatestTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeader}><Text style={styles.tabHeaderText}>🆕 Latest Recipes</Text></View>
      {latestLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#ffd700" /></View>
      ) : (
        <FlatList
          data={latestMeals}
          keyExtractor={(item) => item.idMeal}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem} onPress={() => fetchMealDetails(item.idMeal)}>
              <Image source={{ uri: item.strMealThumb }} style={styles.gridImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gridGrad}>
                <Text style={styles.gridTitle} numberOfLines={2}>{item.strMeal}</Text>
                <Text style={styles.gridSub}>{item.strArea} • {item.strCategory}</Text>
              </LinearGradient>
              {item.strYoutube && <View style={styles.gridBadge}><Text>🎥</Text></View>}
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </View>
  );

  // DISCOVER TAB
  const renderDiscoverTab = () => {
    const currentMeal = discoverMeals[currentSwipeIndex];
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.tabHeader}><Text style={styles.tabHeaderText}>🔄 Swipe to Discover</Text></View>
        <Text style={styles.swipeHint}>👈 Skip | Save 👉</Text>
        {discoverLoading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color="#ffd700" /></View>
        ) : currentMeal ? (
          <View style={styles.swipeWrap}>
            <Animated.View 
              style={[styles.swipeCard, {
                transform: [
                  { translateX: swipeAnim.x },
                  { rotate: swipeAnim.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-15deg', '0deg', '15deg'] }) }
                ],
                opacity: swipeOpacity
              }]}
              {...panResponder.panHandlers}
            >
              <Image source={{ uri: currentMeal.strMealThumb }} style={styles.swipeImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.swipeGrad}>
                {currentMeal.strYoutube && <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>🎥 Video</Text></View>}
                <Text style={styles.swipeTitle}>{currentMeal.strMeal}</Text>
                <Text style={styles.swipeSub}>{currentMeal.strArea} • {currentMeal.strCategory}</Text>
              </LinearGradient>
              <Animated.View style={[styles.likeLabel, { opacity: swipeAnim.x.interpolate({ inputRange: [0, 100], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
                <Text style={styles.likeLabelText}>❤️ SAVE</Text>
              </Animated.View>
              <Animated.View style={[styles.nopeLabel, { opacity: swipeAnim.x.interpolate({ inputRange: [-100, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>
                <Text style={styles.nopeLabelText}>✕ SKIP</Text>
              </Animated.View>
            </Animated.View>
            <View style={styles.swipeBtns}>
              <TouchableOpacity style={styles.swipeBtnNo} onPress={() => handleSwipe('left')}><Text style={styles.swipeBtnIcon}>✕</Text></TouchableOpacity>
              <TouchableOpacity style={styles.swipeBtnInfo} onPress={() => fetchMealDetails(currentMeal.idMeal)}><Text>ℹ️</Text></TouchableOpacity>
              <TouchableOpacity style={styles.swipeBtnYes} onPress={() => handleSwipe('right')}><Text style={styles.swipeBtnIcon}>❤️</Text></TouchableOpacity>
            </View>
            <Text style={styles.swipeCount}>{currentSwipeIndex + 1} / {discoverMeals.length}</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <TouchableOpacity onPress={fetchDiscoverMeals} style={styles.refreshBtn}><Text style={styles.refreshBtnText}>🔄 Load More</Text></TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // SEARCH TAB
  const renderSearchTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeader}><Text style={styles.tabHeaderText}>🔍 Search Recipes</Text></View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search... (e.g. Chicken)"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => searchMeals(searchQuery)}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => searchMeals(searchQuery)}><Text>🔍</Text></TouchableOpacity>
      </View>
      {searchLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#ffd700" /></View>
      ) : searchResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Try "Chicken", "Pasta", "Beef"...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.idMeal}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => { setSelectedMeal(item); setShowMealModal(true); }} style={styles.listItem}>
              <Image source={{ uri: item.strMealThumb }} style={styles.listImage} />
              <View style={styles.listInfo}>
                <Text style={styles.listTitle} numberOfLines={2}>{item.strMeal}</Text>
                <Text style={styles.listSub}>{item.strArea} • {item.strCategory}</Text>
                {item.strYoutube && <Text style={styles.listBadge}>🎥 Has Video</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </View>
  );

  // CATEGORIES TAB
  const renderCategoriesTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.tabHeader}>
        {selectedCategory ? (
          <TouchableOpacity onPress={() => { setSelectedCategory(null); setCategoryMeals([]); }} style={styles.backRow}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.tabHeaderText}>{selectedCategory}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.tabHeaderText}>📁 Categories</Text>
        )}
      </View>
      {categoriesLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color="#ffd700" /></View>
      ) : selectedCategory ? (
        <FlatList
          data={categoryMeals}
          keyExtractor={(item) => item.idMeal}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.gridItem} onPress={() => fetchMealDetails(item.idMeal)}>
              <Image source={{ uri: item.strMealThumb }} style={styles.gridImage} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gridGrad}>
                <Text style={styles.gridTitle} numberOfLines={2}>{item.strMeal}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.idCategory}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.catItem} onPress={() => fetchCategoryMeals(item.strCategory)}>
              <Image source={{ uri: item.strCategoryThumb }} style={styles.catImage} />
              <View style={styles.catInfo}>
                <Text style={styles.catTitle}>{item.strCategory}</Text>
                <Text style={styles.catDesc} numberOfLines={2}>{item.strCategoryDescription}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
    </View>
  );

  // MAIN RENDER
  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      {renderMealModal()}
      {renderFavoritesModal()}
      {activeTab === 'home' && renderHomeTab()}
      {activeTab === 'latest' && renderLatestTab()}
      {activeTab === 'discover' && renderDiscoverTab()}
      {activeTab === 'search' && renderSearchTab()}
      {activeTab === 'categories' && renderCategoriesTab()}
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'home', icon: '🏠', label: 'Home' },
          { key: 'latest', icon: '🆕', label: 'New' },
          { key: 'discover', icon: '🔄', label: 'Swipe' },
          { key: 'search', icon: '🔍', label: 'Search' },
          { key: 'categories', icon: '📁', label: 'Categories' },
        ].map(tab => (
          <TouchableOpacity key={tab.key} style={styles.tabBarItem} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabBarIcon, activeTab === tab.key && styles.tabBarIconActive]}>{tab.icon}</Text>
            <Text style={[styles.tabBarLabel, activeTab === tab.key && styles.tabBarLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Splash
  splashContainer: { flex: 1 },
  splashGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: { marginBottom: 30 },
  logoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,215,0,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#ffd700' },
  logoEmoji: { fontSize: 60 },
  splashTitle: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  splashSubtitle: { fontSize: 16, color: '#ffd700', marginTop: 8 },
  progressContainer: { width: width * 0.6, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 50 },
  progressBar: { height: '100%', backgroundColor: '#ffd700', borderRadius: 2 },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 16 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 10, paddingHorizontal: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerEmoji: { fontSize: 36, marginRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: '#ffd700', letterSpacing: 1 },
  favBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  favBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Tab Header
  tabHeader: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabHeaderText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { fontSize: 24, color: '#fff', marginRight: 12 },

  // Loader
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Discover Button
  discoverBtn: { marginHorizontal: 16, marginVertical: 10 },
  discoverBtnGrad: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  discoverBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  // Card
  card: { margin: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  cardImageWrap: { height: 260, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150 },
  cardContent: { position: 'absolute', bottom: 16, left: 16, right: 60 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  heartBtn: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  heartText: { fontSize: 22 },
  videoBadge: { backgroundColor: 'rgba(255,0,0,0.8)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, alignSelf: 'flex-start', marginBottom: 6 },
  videoBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  // Tags
  tagsRow: { flexDirection: 'row', padding: 14, gap: 8 },
  tagYellow: { backgroundColor: '#ffd700', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  tagPurple: { backgroundColor: '#764ba2', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  tagText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  // YouTube Button
  ytBtn: { backgroundColor: '#cc0000', marginHorizontal: 14, padding: 12, borderRadius: 10, alignItems: 'center' },
  ytBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // Section
  section: { padding: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffd700', marginBottom: 10 },
  ingredientsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  ingredientItem: { flexDirection: 'row', width: '50%', marginBottom: 6, alignItems: 'flex-start' },
  ingredientDot: { color: '#ffd700', marginRight: 6, fontSize: 14 },
  ingredientText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flex: 1 },
  instructions: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20 },
  expandBtn: { marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center' },
  expandBtnText: { color: '#ffd700', fontSize: 13, fontWeight: '600' },

  // Grid
  grid: { padding: 8 },
  gridItem: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', height: 180, backgroundColor: 'rgba(255,255,255,0.05)' },
  gridImage: { width: '100%', height: '100%' },
  gridGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingTop: 40 },
  gridTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  gridSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  gridBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,0,0,0.8)', padding: 4, borderRadius: 8 },

  // Categories
  catItem: { flex: 1, margin: 8, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)' },
  catImage: { width: '100%', height: 100 },
  catInfo: { padding: 10 },
  catTitle: { color: '#ffd700', fontSize: 14, fontWeight: 'bold' },
  catDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4 },

  // Swipe
  swipeHint: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', paddingVertical: 8 },
  swipeWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 16 },
  swipeCard: { width: width - 40, height: height * 0.55, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  swipeImage: { width: '100%', height: '100%' },
  swipeGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 60 },
  swipeTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  swipeSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  likeLabel: { position: 'absolute', top: 30, left: 20, borderWidth: 4, borderColor: '#4CAF50', borderRadius: 8, padding: 8, transform: [{ rotate: '-15deg' }] },
  likeLabelText: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold' },
  nopeLabel: { position: 'absolute', top: 30, right: 20, borderWidth: 4, borderColor: '#f44336', borderRadius: 8, padding: 8, transform: [{ rotate: '15deg' }] },
  nopeLabelText: { color: '#f44336', fontSize: 24, fontWeight: 'bold' },
  swipeBtns: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 20 },
  swipeBtnNo: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(244,67,54,0.2)', borderWidth: 2, borderColor: '#f44336', justifyContent: 'center', alignItems: 'center' },
  swipeBtnYes: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(76,175,80,0.2)', borderWidth: 2, borderColor: '#4CAF50', justifyContent: 'center', alignItems: 'center' },
  swipeBtnInfo: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  swipeBtnIcon: { fontSize: 28 },
  swipeCount: { color: 'rgba(255,255,255,0.5)', marginTop: 16 },

  // Search
  searchRow: { flexDirection: 'row', margin: 16, gap: 10 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  searchBtn: { backgroundColor: '#ffd700', width: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // List
  listItem: { flexDirection: 'row', margin: 16, marginTop: 0, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' },
  listImage: { width: 80, height: 80 },
  listInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  listTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  listSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  listBadge: { color: '#ffd700', fontSize: 11, marginTop: 4 },
  deleteBtn: { padding: 12, justifyContent: 'center' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 20 },
  modalImage: { width: '100%', height: 250 },
  modalContent: { padding: 16 },
  modalMealTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 16 },
  refreshBtn: { marginTop: 20, backgroundColor: 'rgba(255,215,0,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, borderColor: '#ffd700' },
  refreshBtnText: { color: '#ffd700', fontSize: 16, fontWeight: '600' },

  // Tab Bar
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: 'rgba(15,12,41,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(255,215,0,0.2)', paddingBottom: 20, paddingTop: 10 },
  tabBarItem: { flex: 1, alignItems: 'center' },
  tabBarIcon: { fontSize: 22, opacity: 0.5 },
  tabBarIconActive: { opacity: 1 },
  tabBarLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 4 },
  tabBarLabelActive: { color: '#ffd700' },
});
