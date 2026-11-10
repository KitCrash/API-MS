import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';

import articlesData from './assets/cv_articles.json';
import { imageMap, getImageSource } from './assets/imageMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  const theme = THEMES[themeKey];

  // Toggle helpers
  const toggleBookmark = useCallback((id) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRead = useCallback((id) => {
    setReadArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeKey((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'sepia';
      return 'light';
    });
  }, []);

  // Filter options
  const filterTabs = [
    { id: 'all', label: 'All Topics (48)' },
    { id: 'u1', label: 'Unit 1 (12)', unit: 1 },
    { id: 'u2', label: 'Unit 2 (11)', unit: 2 },
    { id: 'u3', label: 'Unit 3 (7)', unit: 3 },
    { id: 'u4', label: 'Unit 4 (9)', unit: 4 },
    { id: 'u5', label: 'Unit 5 (8)', unit: 5 },
    { id: 'recap', label: '⚡ Recaps (5)' },
    { id: 'short', label: '✏️ 2-Marks (5)' },
    { id: 'matrix', label: '📊 Master Matrix' },
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      {activeArticle ? (
        // ---------------- DETAIL SCREEN (READER MODE) ----------------
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
          {/* Detail Nav Header */}
          <View style={[styles.detailNavBar, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
            <TouchableOpacity
              onPress={() => setActiveArticle(null)}
              style={styles.backBtn}
              hitSlop={12}
            >
              <Text style={[styles.backBtnText, { color: theme.primary }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
              {activeArticle.category}
            </Text>

            {/* Quick Reader Controls */}
            <View style={styles.headerRightControls}>
              <TouchableOpacity
                onPress={() => setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
                style={styles.textScaleBtn}
              >
                <Text style={[styles.controlText, { color: theme.text }]}>A-</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}
                style={styles.textScaleBtn}
              >
                <Text style={[styles.controlText, { color: theme.text }]}>A+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
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
              <Text style={[styles.appTitle, { color: theme.text }]}>🚀 Computer Vision Hub</Text>
              <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>
                5 Units • 48 Topics • Master Exam Preparation
              </Text>
            </View>

            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
              <Text style={{ fontSize: 18 }}>
                {themeKey === 'light' ? '🌙' : themeKey === 'dark' ? '📜' : '☀️'}
              </Text>
            </TouchableOpacity>
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
    </SafeAreaView>
  );
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
      elements.push(<View key={`sp-${i}`} style={{ height: 8 }} />);
      continue;
    }

    // Formula Box detection (lines containing formula patterns or equations)
    if (trimmed.includes('$$') || trimmed.includes('\\begin{equation}') || (trimmed.startsWith('Formula:') || trimmed.startsWith('Equation:'))) {
      elements.push(
        <View key={`f-${i}`} style={[styles.formulaBox, { backgroundColor: theme.card, borderColor: theme.primary }]}>
          <Text style={[styles.formulaLabel, { color: theme.primary }]}>📐 Mathematical Expression</Text>
          <Text style={[styles.formulaContent, { color: theme.text, fontSize: 13.5 * fontScale }]}>
            {trimmed.replace(/\$\$/g, '').replace(/\\\[|\\\]/g, '')}
          </Text>
        </View>
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${i}`} style={[styles.h1, { color: theme.text, fontSize: 19 * fontScale }]}>
          {trimmed.replace(/^#+\s*/, '')}
        </Text>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${i}`} style={[styles.h2, { color: theme.primary, fontSize: 17 * fontScale }]}>
          {trimmed.replace(/^#+\s*/, '')}
        </Text>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${i}`} style={[styles.h3, { color: theme.text, fontSize: 15 * fontScale }]}>
          {trimmed.replace(/^#+\s*/, '')}
        </Text>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <View key={`li-${i}`} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
          <Text style={[styles.bulletText, { color: theme.text, fontSize: 14.5 * fontScale }]}>
            {trimmed.substring(2)}
          </Text>
        </View>
      );
    } else {
      elements.push(
        <Text key={`p-${i}`} style={[styles.paragraph, { color: theme.text, fontSize: 14.5 * fontScale }]}>
          {trimmed}
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    paddingRight: 10,
  },
  backBtnText: {
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  navTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textScaleBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  controlText: {
    fontSize: 13.5,
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
    marginTop: 18,
    marginBottom: 8,
  },
  h2: {
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
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
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  formulaLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formulaContent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
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
});
