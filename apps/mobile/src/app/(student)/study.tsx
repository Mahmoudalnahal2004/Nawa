import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { BookOpen, FileText, ChevronDown, ChevronUp, Download } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api, { API_BASE } from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

interface Category {
  id: number;
  name: string;
  icon: string | null;
}

interface Material {
  id: number;
  category_id: number;
  title: string;
  file_url: string;
  created_at: string;
}

export default function StudyHubPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Track expanded category and its materials
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [materials, setMaterials] = useState<Record<number, Material[]>>({});
  const [loadingMaterials, setLoadingMaterials] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/materials/categories');
      setCategories(data);
    } catch (err) {
      console.error('Failed to load study categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (categoryId: number) => {
    if (expandedCategoryId === categoryId) {
      // Collapse if already expanded
      setExpandedCategoryId(null);
      return;
    }

    setExpandedCategoryId(categoryId);
    
    // Only fetch if we haven't already
    if (!materials[categoryId]) {
      setLoadingMaterials(categoryId);
      try {
        const { data } = await api.get(`/materials/category/${categoryId}`);
        setMaterials(prev => ({ ...prev, [categoryId]: data }));
      } catch (err) {
        console.error('Failed to load category materials:', err);
      } finally {
        setLoadingMaterials(null);
      }
    }
  };

  const handleOpenPDF = async (fileUrl: string) => {
    const fullUrl = `${API_BASE}${fileUrl}`;
    try {
      const supported = await Linking.canOpenURL(fullUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
      } else {
        // Fallback for emulator environments where Linking check might strictly check schemes
        await Linking.openURL(fullUrl);
      }
    } catch (error) {
      console.error('Error opening study material PDF:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: Colors.slate[400], marginTop: 12 }} type="small">
            Loading study hub modules...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Title Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle} type="title">Study Hub</ThemedText>
        <ThemedText style={styles.headerSub} type="small">Review your module cheat sheets and PDF materials</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <BookOpen color={Colors.slate[450]} size={28} />
            </View>
            <ThemedText style={styles.emptyTitle} type="smallBold">
              No study materials yet
            </ThemedText>
            <ThemedText style={styles.emptySub} type="small">
              Check back later! Modules with PDF resources will appear here automatically.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.accordionContainer}>
            {categories.map((category) => {
              const isExpanded = expandedCategoryId === category.id;
              const isLoading = loadingMaterials === category.id;
              const categoryMaterials = materials[category.id] || [];

              return (
                <View 
                  key={category.id} 
                  style={[
                    styles.moduleCard,
                    isExpanded && styles.moduleCardExpanded
                  ]}
                >
                  {/* Category Header (Clickable Trigger) */}
                  <TouchableOpacity
                    style={styles.moduleHeader}
                    onPress={() => handleCategoryClick(category.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.moduleHeaderLeft}>
                      <View style={[
                        styles.moduleIconBadge,
                        isExpanded && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                      ]}>
                        <BookOpen color={isExpanded ? Colors.emerald[400] : '#94a3b8'} size={20} />
                      </View>
                      <ThemedText 
                        style={[
                          styles.moduleNameText,
                          isExpanded && { color: Colors.emerald[400] }
                        ]} 
                        type="smallBold"
                        numberOfLines={1}
                      >
                        {category.name}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.chevronBadge,
                      isExpanded && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.15)' }
                    ]}>
                      {isExpanded ? (
                        <ChevronUp color={Colors.emerald[400]} size={16} />
                      ) : (
                        <ChevronDown color="#64748b" size={16} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Accordion Expanded Sheet (PDF Lists) */}
                  {isExpanded && (
                    <View style={styles.materialsSheet}>
                      {isLoading ? (
                        <View style={styles.sheetLoading}>
                          <ActivityIndicator size="small" color={Colors.emerald[500]} />
                        </View>
                      ) : categoryMaterials.length === 0 ? (
                        <ThemedText style={styles.noMaterialsText} type="small">
                          No cheat sheets available for this module yet.
                        </ThemedText>
                      ) : (
                        <View style={styles.materialsList}>
                          {categoryMaterials.map((mat) => (
                            <TouchableOpacity
                              key={mat.id}
                              style={styles.materialRow}
                              onPress={() => handleOpenPDF(mat.file_url)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.materialRowLeft}>
                                <View style={styles.pdfIconWrapper}>
                                  <FileText color={Colors.rose[500]} size={18} />
                                </View>
                                <View style={styles.materialMeta}>
                                  <ThemedText style={styles.materialTitle} type="smallBold" numberOfLines={1}>
                                    {mat.title}
                                  </ThemedText>
                                  <ThemedText style={styles.materialDate} type="small">
                                    {new Date(mat.created_at).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </ThemedText>
                                </View>
                              </View>
                              <View style={styles.downloadIconWrapper}>
                                <Download color={Colors.emerald[400]} size={14} />
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // navy-950
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b', // navy-800
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  headerSub: {
    color: '#94a3b8',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    backgroundColor: '#0f172a', // navy-900 glass
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySub: {
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  accordionContainer: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#0f172a', // navy-900
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 16,
    overflow: 'hidden',
  },
  moduleCardExpanded: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  moduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  moduleIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleNameText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  chevronBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialsSheet: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: '#020617', // black-20/navy-950 overlay
    padding: 16,
  },
  sheetLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  noMaterialsText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 10,
  },
  materialsList: {
    gap: 10,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a', // navy-900
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  materialRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pdfIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialMeta: {
    flex: 1,
    gap: 2,
  },
  materialTitle: {
    color: '#e2e8f0',
    fontSize: 13,
  },
  materialDate: {
    color: '#64748b',
    fontSize: 10,
  },
  downloadIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
