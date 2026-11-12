import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  PanResponder,
} from 'react-native';

import articlesData from './assets/cv_articles.json';
import formulaImages from './assets/formulaImages.json';
import { imageMap, getImageSource } from './assets/imageMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;

// 🎨 Theme Definitions
const THEMES = {
  light: {
    bg: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    primary: '#0284C7',
    primaryBg: '#E0F2FE',
    accent: '#0369A1',
    codeBg: '#F1F5F9',
    statusBar: 'dark-content',
  },
  dark: {
    bg: '#0B0F19',
    card: '#111827',
    border: '#1F2937',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    primary: '#38BDF8',
    primaryBg: '#0C4A6E',
    accent: '#7DD3FC',
    codeBg: '#1E293B',
    statusBar: 'light-content',
  },
  sepia: {
    bg: '#FAF4EB',
    card: '#F4ECE1',
    border: '#E5D8C5',
    text: '#3E2D1D',
    textMuted: '#7D6A55',
    primary: '#B45309',
    primaryBg: '#FEF3C7',
    accent: '#D97706',
    codeBg: '#EFE4D2',
    statusBar: 'dark-content',
  },
};

export default function App() {
  const [themeKey, setThemeKey] = useState('light');
  const [fontScale, setFontScale] = useState(1.0);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState(null);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [readArticles, setReadArticles] = useState(new Set());
  const [modalImage, setModalImage] = useState(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, icon = '✓') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, icon });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2200);
  }, []);

  // Swipe from left edge / left side of screen to go back
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Detect swipe starting from left edge/side moving towards right
        const fromLeft = gestureState.x0 < 100 || evt.nativeEvent.pageX < 100;
        const isHorizontalSwipe = gestureState.dx > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3;
        return fromLeft && isHorizontalSwipe;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50 || gestureState.vx > 0.3) {
          setActiveArticle(null);
        }
      },
    })
  ).current;

  // Real-time Chat / Keyword search across all questions and answers with multi-word ranking
  const chatResults = useMemo(() => {
    if (!chatQuery.trim()) return [];
    const q = chatQuery.toLowerCase().trim();
    const queryWords = q.split(/\s+/).filter(w => w.length > 0);
    const results = [];

    for (const art of articlesData) {
      let score = 0;
      let matchedSnippet = '';

      const titleLower = art.title?.toLowerCase() || '';
      const promptLower = art.prompt?.toLowerCase() || '';
      const catLower = art.category?.toLowerCase() || '';
      const mdLower = art.markdown?.toLowerCase() || '';

      // Full phrase matches get highest priority
      if (titleLower.includes(q)) score += 25;
      if (promptLower.includes(q)) score += 15;
      if (catLower.includes(q)) score += 10;
      if (mdLower.includes(q)) score += 8;

      // Word-by-word matches
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 6;
        if (promptLower.includes(word)) score += 4;
        if (catLower.includes(word)) score += 3;
        if (mdLower.includes(word)) score += 2;
      }

      if (art.markdown && (mdLower.includes(q) || queryWords.some(w => mdLower.includes(w)))) {
        const lines = art.markdown.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length > 5 && (trimmed.toLowerCase().includes(q) || queryWords.some(w => trimmed.toLowerCase().includes(w)))) {
            if (!matchedSnippet) {
              matchedSnippet = trimmed
                .replace(/^#+\s*/, '')
                .replace(/^[-*]\s*/, '')
                .replace(/^\d+\.\s*/, '')
                .replace(/\*\*/g, '')
                .replace(/`/g, '')
                .replace(/\$\$/g, '')
                .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2')
                .replace(/\s+/g, ' ')
                .trim();
              if (matchedSnippet.length > 130) {
                matchedSnippet = matchedSnippet.slice(0, 127) + '...';
              }
            }
          }
        }
      }

      if (score > 0) {
        results.push({
          article: art,
          score,
          snippet: matchedSnippet || art.prompt || art.title,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }, [chatQuery]);

  const theme = THEMES[themeKey];

  // Toggle helpers with non-intrusive save feedback
  const toggleBookmark = useCallback((id) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removed from Bookmarks', '☆');
      } else {
        next.add(id);
        showToast('Saved to Bookmarks', '⭐');
      }
      return next;
    });
  }, [showToast]);

  const toggleRead = useCallback((id) => {
    setReadArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Marked as To-Do', '⚪');
      } else {
        next.add(id);
        showToast('Marked as Done', '✅');
      }
      return next;
    });
  }, [showToast]);

  const toggleTheme = useCallback(() => {
    setThemeKey((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'sepia';
      return 'light';
    });
  }, []);

  // Filter options
  const filterTabs = [
    { id: 'all', label: `All Topics (${articlesData.length})` },
    { id: 'u1', label: `Unit 1 (${articlesData.filter((a) => a.unit_num === 1).length})`, unit: 1 },
    { id: 'u2', label: `Unit 2 (${articlesData.filter((a) => a.unit_num === 2).length})`, unit: 2 },
    { id: 'u3', label: `Unit 3 (${articlesData.filter((a) => a.unit_num === 3).length})`, unit: 3 },
    { id: 'u4', label: `Unit 4 (${articlesData.filter((a) => a.unit_num === 4).length})`, unit: 4 },
    { id: 'u5', label: `Unit 5 (${articlesData.filter((a) => a.unit_num === 5).length})`, unit: 5 },
    { id: 'recap', label: `⚡ Recaps (${articlesData.filter((a) => a.section_type === 'recap').length})` },
    { id: 'short', label: `✏️ 2-Marks (${articlesData.filter((a) => a.section_type === 'short_qa').length})` },
    { id: 'matrix', label: '📊 Master Matrix & Guide' },
    { id: 'bookmarks', label: `⭐ Saved (${bookmarks.size})` },
    { id: 'read', label: `✅ Read (${readArticles.size})` },
  ];

  // Filtered dataset
  const filteredArticles = useMemo(() => {
    return articlesData.filter((item) => {
      // Tab filter
      if (selectedFilter === 'u1' && item.unit_num !== 1) return false;
      if (selectedFilter === 'u2' && item.unit_num !== 2) return false;
      if (selectedFilter === 'u3' && item.unit_num !== 3) return false;
      if (selectedFilter === 'u4' && item.unit_num !== 4) return false;
      if (selectedFilter === 'u5' && item.unit_num !== 5) return false;
      if (selectedFilter === 'recap' && item.section_type !== 'recap') return false;
      if (selectedFilter === 'short' && item.section_type !== 'short_qa') return false;
      if (selectedFilter === 'matrix' && item.section_type !== 'index') return false;
      if (selectedFilter === 'bookmarks' && !bookmarks.has(item.id)) return false;
      if (selectedFilter === 'read' && !readArticles.has(item.id)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.title?.toLowerCase().includes(q);
        const inPrompt = item.prompt?.toLowerCase().includes(q);
        const inCategory = item.category?.toLowerCase().includes(q);
        const inMarkdown = item.markdown?.toLowerCase().includes(q);
        return inTitle || inPrompt || inCategory || inMarkdown;
      }

      return true;
    });
  }, [selectedFilter, searchQuery, bookmarks, readArticles]);

  // Current question position and Next / Previous question navigation
  const { prevArticle, nextArticle, articlePosition, totalInList } = useMemo(() => {
    if (!activeArticle) return { prevArticle: null, nextArticle: null, articlePosition: 0, totalInList: 0 };

    let list = filteredArticles;
    let idx = list.findIndex((a) => a.id === activeArticle.id);

    if (idx === -1) {
      list = articlesData;
      idx = list.findIndex((a) => a.id === activeArticle.id);
    }

    return {
      prevArticle: idx > 0 ? list[idx - 1] : null,
      nextArticle: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
      articlePosition: idx + 1,
      totalInList: list.length,
    };
  }, [activeArticle, filteredArticles]);

  // Read progress
  const progressPercent = Math.round((readArticles.size / articlesData.length) * 100);

  // Render Card in Feed
  const renderCard = ({ item }) => {
    const isBookmarked = bookmarks.has(item.id);
    const isRead = readArticles.has(item.id);

    let badgeColor = '#E0F2FE';
    let badgeText = '#0369A1';
    if (item.section_type === 'recap') {
      badgeColor = '#FEF08A';
      badgeText = '#854D0E';
    } else if (item.section_type === 'short_qa') {
      badgeColor = '#DCFCE7';
      badgeText = '#166534';
    } else if (item.section_type === 'index') {
      badgeColor = '#F3E8FF';
      badgeText = '#6B21A8';
    }

    const imageSource = getImageSource(item.image_file);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setActiveArticle(item)}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Meta Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>{item.category}</Text>
          </View>
          <Text style={[styles.readTime, { color: theme.textMuted }]}>{item.read_time}</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => toggleBookmark(item.id)} hitSlop={10} style={styles.iconBtn}>
              <Text style={{ fontSize: 16 }}>{isBookmarked ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleRead(item.id)} hitSlop={10} style={styles.iconBtn}>
              <Text style={{ fontSize: 16 }}>{isRead ? '✅' : '⚪'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>

        {/* Prompt Quote */}
        {item.prompt ? (
          <Text style={[styles.cardPrompt, { color: theme.textMuted }]} numberOfLines={2}>
            {item.prompt}
          </Text>
        ) : null}

        {/* Search match badge if matched in answer */}
        {searchQuery.trim() && item.markdown && item.markdown.toLowerCase().includes(searchQuery.toLowerCase().trim()) && !item.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ? (
          <View style={[styles.searchSnippetBadge, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
            <Text style={[styles.searchSnippetLabel, { color: theme.primary }]}>🔍 Found in answer text</Text>
          </View>
        ) : null}

        {/* Diagram Thumbnail Preview Banner */}
        {imageSource ? (
          <View style={[styles.imageBannerContainer, { borderColor: theme.border, backgroundColor: theme.codeBg }]}>
            <Image source={imageSource} style={styles.imageBanner} resizeMode="cover" />
            <View style={styles.imageOverlayBadge}>
              <Text style={styles.imageOverlayText}>📐 View Figure / Diagram</Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]}>
      <StatusBar
        barStyle={theme.statusBar}
        backgroundColor={theme.card}
        translucent={Platform.OS === 'android'}
      />

      {/* Floating Save / Bookmark Toast Feedback (Top-centered, non-intrusive) */}
      {toast ? (
        <View style={styles.toastContainer} pointerEvents="none">
          <Text style={{ fontSize: 14 }}>{toast.icon}</Text>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}

      {activeArticle ? (
        // ---------------- DETAIL SCREEN (READER MODE) ----------------
        <View style={[styles.container, { backgroundColor: theme.bg }]} {...panResponder.panHandlers}>
          {/* Detail Nav Header */}
          <View style={[styles.detailNavBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity
              onPress={() => setActiveArticle(null)}
              style={[styles.backBtn, { backgroundColor: theme.primaryBg }]}
              hitSlop={12}
            >
              <Text style={[styles.backBtnText, { color: theme.primary }]}>← Back</Text>
            </TouchableOpacity>

            {/* Stepper / Jumper: ◀ 2/12 ▶ */}
            <View style={[styles.navCounterGroup, { backgroundColor: theme.codeBg, borderColor: theme.border }]}>
              <TouchableOpacity
                disabled={!prevArticle}
                onPress={() => prevArticle && setActiveArticle(prevArticle)}
                style={[styles.navArrowBtn, { opacity: prevArticle ? 1 : 0.3 }]}
                hitSlop={8}
              >
                <Text style={[styles.navArrowText, { color: theme.text }]}>◀</Text>
              </TouchableOpacity>

              <Text style={[styles.navCounterText, { color: theme.textMuted }]}>
                {articlePosition}/{totalInList}
              </Text>

              <TouchableOpacity
                disabled={!nextArticle}
                onPress={() => nextArticle && setActiveArticle(nextArticle)}
                style={[styles.navArrowBtn, { opacity: nextArticle ? 1 : 0.3 }]}
                hitSlop={8}
              >
                <Text style={[styles.navArrowText, { color: theme.primary }]}>▶</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
              {activeArticle.category}
            </Text>

            {/* Quick Reader Controls */}
            <View style={styles.headerRightControls}>
              <TouchableOpacity
                onPress={() => setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
                style={[styles.textScaleBtn, { backgroundColor: theme.codeBg }]}
              >
                <Text style={[styles.controlText, { color: theme.text }]}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}
                style={[styles.textScaleBtn, { backgroundColor: theme.codeBg }]}
              >
                <Text style={[styles.controlText, { color: theme.text }]}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.themeToggleBtn, { backgroundColor: theme.codeBg }]}
              >
                <Text style={{ fontSize: 16 }}>
                  {themeKey === 'light' ? '🌙' : themeKey === 'dark' ? '📜' : '☀️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Detail Scrollable Content */}
          <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[styles.detailTitle, { color: theme.text, fontSize: 21 * fontScale }]}>
              {activeArticle.title}
            </Text>

            {/* Prompt Callout */}
            {activeArticle.prompt ? (
              <View style={[styles.promptCallout, { backgroundColor: theme.primaryBg, borderLeftColor: theme.primary }]}>
                <Text style={[styles.promptText, { color: theme.accent, fontSize: 13.5 * fontScale }]}>
                  {activeArticle.prompt}
                </Text>
              </View>
            ) : null}

            {/* High-Resolution Diagram with Tap to Zoom */}
            {activeArticle.image_file && getImageSource(activeArticle.image_file) ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setModalImage(getImageSource(activeArticle.image_file))}
                style={[
                  styles.diagramCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Image
                  source={getImageSource(activeArticle.image_file)}
                  style={styles.diagramImage}
                  resizeMode="contain"
                />
                <View style={styles.zoomHintRow}>
                  <Text style={[styles.zoomHintText, { color: theme.primary }]}>
                    🔍 Tap figure to expand, pan & zoom full screen
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Markdown Text Body */}
            <FormattedContent content={activeArticle.markdown} theme={theme} fontScale={fontScale} />

            {/* Previous & Next Question Jump Cards */}
            <View style={styles.questionNavContainer}>
              {prevArticle ? (
                <TouchableOpacity
                  onPress={() => setActiveArticle(prevArticle)}
                  activeOpacity={0.8}
                  style={[styles.jumpBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Text style={[styles.jumpSubText, { color: theme.textMuted }]}>← Previous Question</Text>
                  <Text style={[styles.jumpMainText, { color: theme.text }]} numberOfLines={1}>
                    {prevArticle.title}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flex: 1 }} />
              )}

              {nextArticle ? (
                <TouchableOpacity
                  onPress={() => setActiveArticle(nextArticle)}
                  activeOpacity={0.8}
                  style={[
                    styles.jumpBtn,
                    styles.jumpBtnNext,
                    { backgroundColor: theme.primaryBg, borderColor: theme.primary },
                  ]}
                >
                  <Text style={[styles.jumpSubText, { color: theme.primary, textAlign: 'right' }]}>
                    Next Question →
                  </Text>
                  <Text
                    style={[styles.jumpMainText, { color: theme.accent, fontWeight: 'bold', textAlign: 'right' }]}
                    numberOfLines={1}
                  >
                    {nextArticle.title}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActionBar}>
              <TouchableOpacity
                onPress={() => toggleBookmark(activeArticle.id)}
                style={[styles.bottomBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.bottomBtnText, { color: theme.text }]}>
                  {bookmarks.has(activeArticle.id) ? '⭐ Bookmarked' : '☆ Bookmark'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => toggleRead(activeArticle.id)}
                style={[styles.bottomBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primary }]}
              >
                <Text style={[styles.bottomBtnText, { color: theme.primary, fontWeight: 'bold' }]}>
                  {readArticles.has(activeArticle.id) ? '✅ Completed' : '⚪ Mark as Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      ) : (
        // ---------------- FEED SCREEN (HOME) ----------------
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
          {/* Main App Bar */}
          <View style={[styles.appBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <View>
              <Text style={[styles.appTitle, { color: theme.text }]}>🚀 Machine Learning Hub</Text>
              <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>
                5 Units • 48 Topics • Master Exam Preparation
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setChatModalVisible(true)}
                style={[styles.chatHeaderBtn, { backgroundColor: theme.primaryBg, borderColor: theme.primary }]}
              >
                <Text style={{ fontSize: 13 }}>💬</Text>
                <Text style={[styles.chatHeaderBtnText, { color: theme.primary }]}>Find / Q&A</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={toggleTheme}
                style={[styles.themeToggleBtn, { backgroundColor: theme.codeBg }]}
              >
                <Text style={{ fontSize: 18 }}>
                  {themeKey === 'light' ? '🌙' : themeKey === 'dark' ? '📜' : '☀️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={styles.progressRow}>
              <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
                {readArticles.size} of {articlesData.length} Completed
              </Text>
              <Text style={[styles.progressPercent, { color: theme.primary }]}>{progressPercent}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.codeBg }]}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search concepts, formulas, units..."
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.text }]}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <Text style={{ color: theme.textMuted, fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Horizontal Filter Chips */}
          <View style={styles.filterScrollWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {filterTabs.map((tab) => {
                const isSelected = selectedFilter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setSelectedFilter(tab.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isSelected ? '#FFFFFF' : theme.text, fontWeight: isSelected ? 'bold' : 'normal' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Articles Feed */}
          <FlatList
            data={filteredArticles}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🔎</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No topics found</Text>
                <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                  Try clearing your search query or choosing another unit.
                </Text>
              </View>
            }
          />
        </View>
      )}

      {/* Full-Screen Zoomable Image Modal */}
      <Modal visible={!!modalImage} transparent animationType="fade" onRequestClose={() => setModalImage(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalImage(null)}>
            <Text style={styles.modalCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {modalImage ? (
            <Image source={modalImage} style={styles.modalImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
      {/* Floating Action Button for Instant Chat / Keyword Lookup */}
      <TouchableOpacity
        style={[styles.floatingChatBtn, { backgroundColor: theme.primary }]}
        onPress={() => setChatModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={{ fontSize: 22 }}>💬</Text>
        <Text style={styles.floatingChatText}>Find</Text>
      </TouchableOpacity>

      {/* Chat & Keyword Lookup Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={[styles.chatModalContainer, { backgroundColor: theme.bg }]}>
          {/* Modal Header */}
          <View style={[styles.chatModalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatModalTitle, { color: theme.text }]}>💬 Smart Keyword & Question Finder</Text>
              <Text style={[styles.chatModalSub, { color: theme.textMuted }]}>
                Search any concept, formula, or keyword across all 48 Q&As
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setChatModalVisible(false)}
              style={[styles.chatCloseBtn, { backgroundColor: theme.codeBg }]}
            >
              <Text style={[styles.chatCloseText, { color: theme.text }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input Box */}
          <View style={[styles.chatInputWrapper, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={[styles.chatTextInput, { color: theme.text }]}
              placeholder="Type keyword: Find-S, SVM, DBSCAN, AdaBoost..."
              placeholderTextColor={theme.textMuted}
              value={chatQuery}
              onChangeText={setChatQuery}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
            />
            {chatQuery ? (
              <TouchableOpacity onPress={() => setChatQuery('')} hitSlop={8}>
                <Text style={{ color: theme.textMuted, fontSize: 15, paddingHorizontal: 6 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Quick Keyword Suggestion Chips */}
          <View style={styles.chatChipsRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
              {['Find-S', 'Candidate Elimination', 'Naive Bayes', 'Linear Regression', 'Logistic Regression', 'SVM', 'Kernel', 'ROC Curve', 'K-Means', 'DBSCAN', 'Random Forest', 'AdaBoost', 'VC Dimension', 'Overfitting'].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  onPress={() => setChatQuery(chip)}
                  style={[
                    styles.chatChip,
                    {
                      backgroundColor: chatQuery.toLowerCase() === chip.toLowerCase() ? theme.primary : theme.codeBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chatChipText,
                      { color: chatQuery.toLowerCase() === chip.toLowerCase() ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {chip}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Search Results List */}
          <FlatList
            data={chatResults}
            keyExtractor={(item) => String(item.article.id)}
            contentContainerStyle={styles.chatResultsList}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              chatQuery.trim() ? (
                <Text style={[styles.chatResultCount, { color: theme.textMuted }]}>
                  Found {chatResults.length} matching {chatResults.length === 1 ? 'question' : 'questions'}:
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.chatEmptyState}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>{chatQuery.trim() ? '🔍' : '💡'}</Text>
                <Text style={[styles.chatEmptyTitle, { color: theme.text }]}>
                  {chatQuery.trim() ? 'No matching questions found' : 'Find Any Keyword Instantly'}
                </Text>
                <Text style={[styles.chatEmptySub, { color: theme.textMuted }]}>
                  {chatQuery.trim()
                    ? `No questions or answers matched "${chatQuery}". Try searching another concept.`
                    : 'Tap any suggestion above or type a keyword to jump directly to that exact question and answer.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setChatModalVisible(false);
                  setActiveArticle(item.article);
                }}
                style={[
                  styles.chatResultCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.chatResultHeader}>
                  <View style={[styles.chatBadge, { backgroundColor: theme.primaryBg }]}>
                    <Text style={[styles.chatBadgeText, { color: theme.primary }]}>
                      {item.article.category}
                    </Text>
                  </View>
                  <Text style={[styles.chatResultArrow, { color: theme.primary }]}>
                    Open Question →
                  </Text>
                </View>

                <Text style={[styles.chatResultTitle, { color: theme.text }]}>
                  {item.article.title}
                </Text>

                {item.snippet ? (
                  <View style={[styles.chatSnippetBox, { backgroundColor: theme.codeBg }]}>
                    <Text style={[styles.chatSnippetLabel, { color: theme.primary }]}>Found in text:</Text>
                    <Text style={[styles.chatSnippetText, { color: theme.text }]} numberOfLines={3}>
                      "{item.snippet}"
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function cleanLatexSymbols(text) {
  if (!text) return '';
  return text
    .replace(/\\boxed\{([^{}]+)\}/g, '$1')
    .replace(/\\operatorname\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathbb\{R\}/g, 'ℝ')
    .replace(/\\tilde\{([^}]+)\}/g, '$1̃')
    .replace(/\\hat\{([^}]+)\}/g, '$1̂')
    .replace(/\\bar\{([^}]+)\}/g, '$1̄')
    .replace(/\\vec\{([^}]+)\}/g, '$1⃗')
    .replace(/\\quad/g, '   ')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\in/g, '∈')
    .replace(/\\pi/g, 'π')
    .replace(/\\theta/g, 'θ')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\varepsilon/g, 'ε')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\xi/g, 'ξ')
    .replace(/\\phi/g, 'φ')
    .replace(/\\Phi/g, 'Φ')
    .replace(/\\emptyset/g, '∅')
    .replace(/\\leq/g, '≤')
    .replace(/\\le\b/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\propto/g, '∝')
    .replace(/\\infty/g, '∞')
    .replace(/\\cdots/g, '...')
    .replace(/\\dots/g, '...')
    .replace(/\\langle/g, '⟨')
    .replace(/\\rangle/g, '⟩')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']')
    .replace(/\\left\\\{/g, '{')
    .replace(/\\right\\\}/g, '}')
    .replace(/\\ln/g, 'ln')
    .replace(/\\exp/g, 'exp')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\sqrt/g, '√');
}

// ---------------- FORMULA TOKEN PARSER & STACKED FRACTION RENDERER ----------------
function parseFormulaTokens(rawLine) {
  let s = cleanLatexSymbols(rawLine);

  // Convert \frac{A}{B} to internal marker [[FRAC:A|B]]
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '[[FRAC:$1|$2]]');

  // Convert (A / B) to [[FRAC:A|B]] — restrict to short, simple operands only
  s = s.replace(/\(([^\(\)\/\=\n\,]{1,25}?)\s*\/\s*([^\(\)\/\=\n\,]{1,25}?)\)/g, (match, num, den) => {
    // Skip if operands are complex expressions
    if (num.trim().length > 20 || den.trim().length > 20) return match;
    if (/[∑∏]/.test(num) || /[∑∏]/.test(den)) return match;
    return `[[FRAC:${num.trim()}|${den.trim()}]]`;
  });

  const tokens = [];
  const fracRegex = /\[\[FRAC:([^\|]+)\|([^\]]+)\]\]/g;
  let lastIdx = 0;
  let match;

  while ((match = fracRegex.exec(s)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: 'text', value: s.substring(lastIdx, match.index) });
    }
    tokens.push({ type: 'fraction', num: match[1].trim(), den: match[2].trim() });
    lastIdx = fracRegex.lastIndex;
  }

  if (lastIdx < s.length) {
    tokens.push({ type: 'text', value: s.substring(lastIdx) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: s }];
}

function renderFormulaContent(content, theme, fontScale) {
  const cleanContent = content
    .replace(/^\s*(\$\$|\\\[|\$+)\s*/g, '')
    .replace(/\s*(\$\$|\\\]|\$+)\s*$/g, '')
    .replace(/\\boxed\{([^{}]+)\}/g, '$1')
    .trim();

  if (!cleanContent) return null;

  const lines = cleanContent.split('\n');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4, paddingHorizontal: 2 }}
    >
      <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        {lines.map((rawLine, lIdx) => {
          const trimmedLine = rawLine.trim();
          if (!trimmedLine) return null;

          // Matrix line
          if (trimmedLine.includes('⎡') || trimmedLine.includes('⎢') || trimmedLine.includes('⎣')) {
            return (
              <Text
                key={`mat-${lIdx}`}
                style={[
                  styles.formulaMatrixText,
                  {
                    color: theme.text,
                    fontSize: 13.5 * fontScale,
                    lineHeight: 22 * fontScale,
                    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  },
                ]}
              >
                {rawLine}
              </Text>
            );
          }

          const tokens = parseFormulaTokens(trimmedLine);

          return (
            <View key={`frow-${lIdx}`} style={styles.formulaRow}>
              {tokens.map((tok, tIdx) => {
                if (tok.type === 'fraction') {
                  return (
                    <View key={`ffrac-${lIdx}-${tIdx}`} style={styles.fractionContainer}>
                      <Text
                        style={[
                          styles.fractionNumerator,
                          {
                            color: theme.text,
                            fontSize: 13 * fontScale,
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                          },
                        ]}
                      >
                        {tok.num}
                      </Text>
                      <View
                        style={[
                          styles.fractionBar,
                          { backgroundColor: theme.primary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.fractionDenominator,
                          {
                            color: theme.text,
                            fontSize: 13 * fontScale,
                            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                          },
                        ]}
                      >
                        {tok.den}
                      </Text>
                    </View>
                  );
                }

                return (
                  <Text
                    key={`ftxt-${lIdx}-${tIdx}`}
                    style={[
                      styles.formulaTextToken,
                      {
                        color: theme.text,
                        fontSize: 14 * fontScale,
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                      },
                    ]}
                  >
                    {tok.value}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ---------------- INLINE MARKDOWN PARSER (BOLD, ITALIC, CODE, MATH) ----------------
function renderInlineText(rawText, baseStyle, theme) {
  if (!rawText) return null;
  const sanitizedText = cleanLatexSymbols(rawText.replace(/<br\s*\/?>/gi, ' '));

  const tokens = [];
  const regex = /(\*\*[\s\S]+?\*\*|`[^`]+`|\*[^\*]+?\*|\$[^\$]+?\$|\\\([^\)]+?\\\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(sanitizedText)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', val: sanitizedText.substring(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      tokens.push({ type: 'bold', val: token.slice(2, -2) });
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      tokens.push({ type: 'code', val: token.slice(1, -1) });
    } else if (token.startsWith('$') && token.endsWith('$') && token.length >= 2) {
      tokens.push({ type: 'math', val: token.slice(1, -1) });
    } else if (token.startsWith('\\(') && token.endsWith('\\)') && token.length >= 4) {
      tokens.push({ type: 'math', val: token.slice(2, -2).trim() });
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      tokens.push({ type: 'italic', val: token.slice(1, -1) });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitizedText.length) {
    tokens.push({ type: 'text', val: sanitizedText.substring(lastIndex) });
  }

  return tokens.map((t, idx) => {
    if (t.type === 'bold') {
      return (
        <Text key={`b-${idx}`} style={[baseStyle, { fontWeight: 'bold', color: theme.text }]}>
          {t.val}
        </Text>
      );
    }
    if (t.type === 'code') {
      return (
        <Text
          key={`c-${idx}`}
          style={[
            baseStyle,
            {
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              backgroundColor: theme.codeBg,
              color: theme.accent,
              borderRadius: 3,
            },
          ]}
        >
          {` ${t.val} `}
        </Text>
      );
    }
    if (t.type === 'math') {
      return (
        <Text
          key={`m-${idx}`}
          style={[
            baseStyle,
            {
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              fontStyle: 'italic',
              fontWeight: '600',
              color: theme.text,
            },
          ]}
        >
          {t.val}
        </Text>
      );
    }
    if (t.type === 'italic') {
      return (
        <Text key={`i-${idx}`} style={[baseStyle, { fontStyle: 'italic' }]}>
          {t.val}
        </Text>
      );
    }
    return (
      <Text key={`t-${idx}`} style={baseStyle}>
        {t.val}
      </Text>
    );
  });
}

// ---------------- FORMATTED CONTENT RENDERER ----------------
function FormattedContent({ content, theme, fontScale }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block detection
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <View key={`code-${i}`} style={[styles.codeBlock, { backgroundColor: theme.codeBg, borderColor: theme.border }]}>
            <Text style={[styles.codeText, { color: theme.text, fontSize: 12.5 * fontScale }]}>
              {codeBuffer.join('\n')}
            </Text>
          </View>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    if (!trimmed) {
      elements.push(<View key={`sp-${i}`} style={{ height: 16 }} />);
      continue;
    }

    // Skip redundant web tags (NOT standalone $$ or \[ — those are formula delimiters)
    if (trimmed.startsWith('<AsyncImage') || trimmed.includes('<AsyncImage') || trimmed === '<br>' || trimmed.startsWith('<HomeworkHelper') || trimmed.startsWith('<LearningViz')) {
      continue;
    }

    // Custom Badge tag: <badge color="success">Final Answer</badge>
    if (trimmed.startsWith('<badge') || trimmed.includes('<badge')) {
      const badgeMatch = trimmed.match(/<badge(?:\s+color=["']([^"']+)["'])?>([\s\S]*?)<\/badge>/);
      if (badgeMatch) {
        const bColor = badgeMatch[1] || 'success';
        const bText = badgeMatch[2].trim();
        let bg = '#DCFCE7', fg = '#166534', bc = '#86EFAC';
        if (bColor === 'info') { bg = '#E0F2FE'; fg = '#0369A1'; bc = '#7DD3FC'; }
        else if (bColor === 'danger') { bg = '#FEE2E2'; fg = '#991B1B'; bc = '#FCA5A5'; }
        else if (bColor === 'warning') { bg = '#FEF3C7'; fg = '#92400E'; bc = '#FCD34D'; }

        elements.push(
          <View key={`badge-${i}`} style={{ flexDirection: 'row', marginVertical: 6 }}>
            <View style={{ backgroundColor: bg, borderColor: bc, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: fg, fontWeight: 'bold', fontSize: 12 * fontScale }}>{bText}</Text>
            </View>
          </View>
        );
        continue;
      }
    }

    // Custom Title tag: <title size="xl" color="success">C1, C2, C3, C4</title>
    if (trimmed.startsWith('<title') || trimmed.includes('<title')) {
      const titleMatch = trimmed.match(/<title(?:\s+[^>]*?)?>([\s\S]*?)<\/title>/);
      if (titleMatch) {
        const isSuccess = trimmed.includes('success');
        const isDanger = trimmed.includes('danger');
        const isInfo = trimmed.includes('info');
        const tColor = isSuccess ? '#16A34A' : (isDanger ? '#DC2626' : (isInfo ? '#0284C7' : theme.text));
        elements.push(
          <Text key={`title-tag-${i}`} style={{ color: tColor, fontSize: 17 * fontScale, fontWeight: 'bold', marginVertical: 4 }}>
            {titleMatch[1].trim()}
          </Text>
        );
        continue;
      }
    }

    // Divider tag: <divider ... />
    if (trimmed.startsWith('<divider') || trimmed.includes('<divider')) {
      elements.push(
        <View key={`div-${i}`} style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
      );
      continue;
    }

    // Interactive flowchart box tag handling
    if (trimmed.startsWith('<box') || trimmed.startsWith('</box>') || trimmed.startsWith('<icon')) {
      const boxMatch = trimmed.match(/>([^<]+)<\/box>/);
      if (boxMatch) {
        elements.push(
          <View key={`box-${i}`} style={[styles.flowcard, { backgroundColor: theme.codeBg, borderColor: theme.border }]}>
            <Text style={[styles.flowcardText, { color: theme.primary, fontSize: 13.5 * fontScale }]}>
              {boxMatch[1]}
            </Text>
          </View>
        );
      } else if (trimmed.includes('arrow-down')) {
        elements.push(
          <View key={`arrow-${i}`} style={{ alignItems: 'center', marginVertical: 3 }}>
            <Text style={{ color: theme.primary, fontSize: 16 }}>↓</Text>
          </View>
        );
      }
      continue;
    }

    // Markdown Table Detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const tLine = lines[i].trim();
        if (!/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tLine)) {
          const cells = tLine
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());
          tableLines.push(cells);
        }
        i++;
      }
      i--;

      if (tableLines.length > 0) {
        const headerCells = tableLines[0];
        const bodyRows = tableLines.slice(1);
        const colCount = headerCells.length;
        const isTwoCol = colCount === 2;

        const tableComponent = (
          <View style={[styles.tableContainer, { width: '100%', borderColor: theme.border, backgroundColor: theme.card }]}>
            <View style={[styles.tableHeaderRow, { backgroundColor: theme.primaryBg, borderBottomColor: theme.primary, borderBottomWidth: 2 }]}>
              {headerCells.map((h, hIdx) => (
                <View
                  key={`th-${hIdx}`}
                  style={[
                    styles.tableCell,
                    isTwoCol ? { flex: 1 } : { minWidth: Math.max(105, Math.floor((SCREEN_WIDTH - 64) / colCount)) },
                    {
                      borderRightWidth: hIdx < colCount - 1 ? 1.2 : 0,
                      borderRightColor: theme.border,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    },
                  ]}
                >
                  <Text style={[styles.tableHeaderText, { color: theme.text, fontSize: (isTwoCol ? 13 : 12.5) * fontScale }]}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>
            {bodyRows.map((row, rIdx) => (
              <View
                key={`tr-${rIdx}`}
                style={[
                  styles.tableBodyRow,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: rIdx < bodyRows.length - 1 ? 1 : 0,
                    backgroundColor: rIdx % 2 === 0 ? theme.card : theme.codeBg,
                  },
                ]}
              >
                {row.map((cell, cIdx) => (
                  <View
                    key={`td-${cIdx}`}
                    style={[
                      styles.tableCell,
                      isTwoCol ? { flex: 1 } : { minWidth: Math.max(105, Math.floor((SCREEN_WIDTH - 64) / colCount)) },
                      {
                        borderRightWidth: cIdx < colCount - 1 ? 1.2 : 0,
                        borderRightColor: theme.border,
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                      },
                    ]}
                  >
                    <Text style={[styles.tableCellText, { color: theme.text, fontSize: (isTwoCol ? 12.5 : 12) * fontScale, lineHeight: 18 * fontScale }]}>
                      {renderInlineText(cell, { color: theme.text, fontSize: (isTwoCol ? 12.5 : 12) * fontScale }, theme)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );

        if (isTwoCol) {
          elements.push(
            <View key={`tbl-${i}`} style={[styles.tableScrollWrapper, { width: '100%' }]}>
              {tableComponent}
            </View>
          );
        } else {
          elements.push(
            <ScrollView
              key={`tbl-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableScrollWrapper}
            >
              {tableComponent}
            </ScrollView>
          );
        }
      }
      continue;
    }

    // Helper to render an elevated Mathematical Formula Block Box with stacked fraction bars
    const createFormulaBox = (content, keyIndex) => {
      const cleanContent = content
        .replace(/^\s*\$+\s*/g, '')
        .replace(/\s*\$+\s*$/g, '')
        .replace(/^\\\[\s*/g, '')
        .replace(/\s*\\\]$/g, '')
        .trim();

      if (!cleanContent) return null;

      const imgData = (formulaImages && (formulaImages[cleanContent] || formulaImages[content.trim()] || formulaImages[cleanContent.replace(/\\\[|\\\]/g, '').trim()])) || null;

      return (
        <View
          key={`formula-box-${keyIndex}`}
          style={[
            styles.formulaBox,
            {
              backgroundColor: '#0B0F19',
              borderColor: '#1E293B',
              borderLeftColor: '#0284C7',
            },
          ]}
        >
          <View style={styles.formulaHeaderRow}>
            <View style={[styles.formulaBadge, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
              <Text style={{ fontSize: 11 }}>📐</Text>
              <Text style={[styles.formulaLabel, { color: '#38BDF8' }]}>Mathematical Formula</Text>
            </View>
          </View>
          {imgData ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingVertical: 4 }}
            >
              <Image
                source={{ uri: imgData.uri }}
                style={{
                  width: Math.min(Math.max(imgData.width, 80), 1200) * fontScale * 0.5,
                  height: Math.min(Math.max(imgData.height, 35), 600) * fontScale * 0.5,
                }}
                resizeMode="contain"
              />
            </ScrollView>
          ) : (
            renderFormulaContent(cleanContent, theme, fontScale)
          )}
        </View>
      );
    };

    // Multi-line or single-line Formula Block detection ($$ ... $$ OR \[ ... \] OR \begin{...})
    if (trimmed === '$$' || trimmed.startsWith('$$') || trimmed === '\\[' || trimmed.startsWith('\\[') || trimmed.startsWith('\\begin{')) {
      const formulaLines = [];
      const isBracket = trimmed === '\\[' || trimmed.startsWith('\\[');
      const isBegin = trimmed.startsWith('\\begin{');
      const closeToken = isBracket ? '\\]' : (isBegin ? '\\end{' : '$$');

      if (trimmed === '$$' || trimmed === '\\[') {
        i++;
        while (i < lines.length && lines[i].trim() !== closeToken && !(isBracket && lines[i].trim().includes('\\]'))) {
          formulaLines.push(lines[i]);
          i++;
        }
      } else {
        let fContent = isBracket ? trimmed.slice(2) : (isBegin ? trimmed : trimmed.slice(2));
        if (fContent.endsWith(closeToken) && fContent.length >= closeToken.length) {
          formulaLines.push(fContent.slice(0, -closeToken.length).trim());
        } else {
          if (fContent.trim()) formulaLines.push(fContent.trim());
          i++;
          while (i < lines.length && !lines[i].trim().endsWith(closeToken) && lines[i].trim() !== closeToken && !(isBracket && lines[i].trim().includes('\\]')) && !(isBegin && lines[i].trim().includes('\\end{'))) {
            formulaLines.push(lines[i]);
            i++;
          }
          if (i < lines.length) {
            const endTrim = lines[i].trim().replace(/\$\$|\\\[|\\\]/g, '').trim();
            if (endTrim) formulaLines.push(endTrim);
          }
        }
      }

      const fullFormula = formulaLines.join('\n').trim();
      if (fullFormula) {
        elements.push(createFormulaBox(fullFormula, i));
      }
      continue;
    }

    // Matrix block starting with ⎡
    if (trimmed.startsWith('⎡')) {
      const matrixLines = [rawLine];
      i++;
      while (i < lines.length && (lines[i].trim().startsWith('⎢') || lines[i].trim().startsWith('⎣') || lines[i].trim().startsWith('=') || lines[i].trim().startsWith('⎡'))) {
        matrixLines.push(lines[i]);
        i++;
      }
      i--;
      elements.push(createFormulaBox(matrixLines.join('\n'), i));
      continue;
    }

    if (trimmed.includes('$$') || trimmed.includes('\\[') || trimmed.startsWith('Formula:') || trimmed.startsWith('Equation:') || trimmed.startsWith('Expression:')) {
      const cleanFormula = trimmed.replace(/\$\$|\\\[|\\\]/g, '').replace(/^(Formula|Equation|Expression):\s*/i, '').trim();
      if (cleanFormula) {
        elements.push(createFormulaBox(cleanFormula, i));
      }
      continue;
    }

    // Standalone equation line (contains = or ≈ and math symbols like ∑, √, ², ᵀ, etc.)
    const isStandaloneEquation = (
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('-') &&
      !trimmed.startsWith('*') &&
      !trimmed.startsWith('|') &&
      !trimmed.startsWith('<') &&
      !trimmed.match(/^\d+\.\s/) &&
      trimmed.length > 3 &&
      trimmed.length < 250 &&
      /^[a-zA-Z0-9\(\)\,\'\s\_\-]+\s*=\s*[\s\S]+$/.test(trimmed) &&
      (trimmed.includes('∑') || trimmed.includes('√') || trimmed.includes('²') || trimmed.includes('ᵀ') || trimmed.includes('×') || trimmed.includes('θ') || trimmed.includes('π') || trimmed.includes('σ') || trimmed.includes('λ') || trimmed.includes('ρ') || trimmed.includes('α') || (trimmed.includes('(') && trimmed.includes('/')) || trimmed.includes('max(') || trimmed.includes('min(') || trimmed.includes('e^'))
    );

    if (isStandaloneEquation) {
      elements.push(createFormulaBox(trimmed, i));
      continue;
    }

    // Numbered List Items: 1. **Title:** description
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <View key={`ol-${i}`} style={styles.numberedRow}>
          <View style={[styles.numberBadge, { backgroundColor: theme.primaryBg }]}>
            <Text style={[styles.numberBadgeText, { color: theme.primary }]}>{numMatch[1]}</Text>
          </View>
          <Text style={[styles.bulletText, { color: theme.text, fontSize: 14.5 * fontScale }]}>
            {renderInlineText(numMatch[2], { color: theme.text, fontSize: 14.5 * fontScale }, theme)}
          </Text>
        </View>
      );
      continue;
    }

    // Bullet List Items: - text or * text
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <View key={`li-${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
          <Text style={[styles.bulletText, { color: theme.text, fontSize: 14.5 * fontScale }]}>
            {renderInlineText(trimmed.substring(2), { color: theme.text, fontSize: 14.5 * fontScale }, theme)}
          </Text>
        </View>
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${i}`} style={[styles.h1, { color: theme.text, fontSize: 19 * fontScale }]}>
          {renderInlineText(trimmed.replace(/^#+\s*/, ''), { color: theme.text, fontSize: 19 * fontScale, fontWeight: 'bold' }, theme)}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${i}`} style={[styles.h2, { color: theme.primary, fontSize: 17 * fontScale }]}>
          {renderInlineText(trimmed.replace(/^#+\s*/, ''), { color: theme.primary, fontSize: 17 * fontScale, fontWeight: 'bold' }, theme)}
        </Text>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${i}`} style={[styles.h3, { color: theme.text, fontSize: 15 * fontScale }]}>
          {renderInlineText(trimmed.replace(/^#+\s*/, ''), { color: theme.text, fontSize: 15 * fontScale, fontWeight: 'bold' }, theme)}
        </Text>
      );
    } else {
      elements.push(
        <Text key={`p-${i}`} style={[styles.paragraph, { color: theme.text, fontSize: 14.5 * fontScale }]}>
          {renderInlineText(trimmed, { color: theme.text, fontSize: 14.5 * fontScale }, theme)}
        </Text>
      );
    }
  }

  return <View style={styles.contentWrapper}>{elements}</View>;
}

// ---------------- STYLESHEET ----------------
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: STATUSBAR_HEIGHT,
  },
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  appSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  themeToggleBtn: {
    padding: 6,
    borderRadius: 8,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11.5,
  },
  progressPercent: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  filterScrollWrapper: {
    marginBottom: 6,
  },
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  readTime: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  iconBtn: {
    padding: 2,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: 'bold',
    lineHeight: 21,
    marginBottom: 6,
  },
  cardPrompt: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 10,
  },
  imageBannerContainer: {
    height: 110,
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 4,
  },
  imageBanner: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  navTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textScaleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  controlText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailTitle: {
    fontWeight: 'bold',
    lineHeight: 28,
    marginBottom: 12,
  },
  promptCallout: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  promptText: {
    fontStyle: 'italic',
    lineHeight: 20,
  },
  diagramCard: {
    borderRadius: 10,
    borderWidth: 1.2,
    padding: 10,
    marginVertical: 14,
  },
  diagramImage: {
    width: '100%',
    height: 220,
    borderRadius: 6,
  },
  zoomHintRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  zoomHintText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  contentWrapper: {
    marginTop: 8,
  },
  h1: {
    fontWeight: 'bold',
    marginTop: 26,
    marginBottom: 12,
  },
  h2: {
    fontWeight: 'bold',
    marginTop: 22,
    marginBottom: 10,
  },
  h3: {
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    fontSize: 16,
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    lineHeight: 21,
  },
  formulaBox: {
    borderWidth: 1.2,
    borderLeftWidth: 4.5,
    borderRadius: 10,
    padding: 14,
    marginVertical: 18,
  },
  formulaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  formulaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  formulaLabel: {
    fontSize: 10.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formulaContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 24,
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  codeBlock: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  bottomActionBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomBtnText: {
    fontSize: 13.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 10,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalImage: {
    width: SCREEN_WIDTH - 24,
    height: SCREEN_HEIGHT * 0.7,
  },
  navCounterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  navArrowBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  navCounterText: {
    fontSize: 11.5,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  questionNavContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  jumpBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.2,
    justifyContent: 'center',
  },
  jumpBtnNext: {
    alignItems: 'flex-end',
  },
  jumpSubText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  jumpMainText: {
    fontSize: 13,
    fontWeight: '600',
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  numberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  numberBadgeText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  tableScrollWrapper: {
    marginVertical: 18,
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderText: {
    fontWeight: 'bold',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  tableCellText: {
    lineHeight: 18,
  },
  flowcard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
    alignItems: 'center',
  },
  flowcardText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // --- Formula Fraction & Matrix Styles ---
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    flexWrap: 'nowrap',
  },
  fractionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    paddingHorizontal: 2,
    alignSelf: 'center',
  },
  fractionNumerator: {
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingBottom: 1,
  },
  fractionBar: {
    height: 1.8,
    alignSelf: 'stretch',
    marginVertical: 2,
    borderRadius: 1,
  },
  fractionDenominator: {
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 1,
  },
  formulaTextToken: {
    fontStyle: 'italic',
    fontWeight: '500',
    alignSelf: 'center',
  },
  formulaMatrixText: {
    letterSpacing: 0.5,
  },

  // --- Search Snippet Badge ---
  searchSnippetBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  searchSnippetLabel: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },

  // --- Floating Chat / Find Action Button ---
  floatingChatBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 26 : 34,
    right: 20,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  floatingChatText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13.5,
  },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  chatHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
  },

  // --- Chat & Keyword Lookup Modal Styles ---
  chatModalContainer: {
    flex: 1,
  },
  chatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  chatModalTitle: {
    fontSize: 16.5,
    fontWeight: 'bold',
  },
  chatModalSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  chatCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chatCloseText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  chatInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chatTextInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  chatChipsRow: {
    marginVertical: 8,
    height: 42,
  },
  chatChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  chatChipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  chatResultsList: {
    padding: 16,
    paddingBottom: 60,
  },
  chatResultCount: {
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  chatResultCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chatBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatResultArrow: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatResultTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    lineHeight: 21,
    marginBottom: 8,
  },
  chatSnippetBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  chatSnippetLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  chatSnippetText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  chatEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  chatEmptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // --- Save Feedback Toast Style (High Top, Non-intrusive) ---
  toastContainer: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 14,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 20,
    zIndex: 999999,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
