import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Layers,
  BookOpen,
  Settings,
  ChevronRight,
  CheckCircle,
  Play
} from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

interface Category {
  id: number;
  name: string;
  icon: string;
  target_year?: number | null;
  question_count: number;
  is_active?: boolean;
  children?: Category[];
}

type PoolMode = 'Unused' | 'Incorrect' | 'Bookmarked' | 'All';

export default function CreateQuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pool?: string }>();

  // Load and generating states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Pool Mode settings
  const [selectedPoolMode, setSelectedPoolMode] = useState<PoolMode>('Unused');
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableCounts, setAvailableCounts] = useState<Record<number, number>>({});

  // Selections
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);

  // Settings states
  const [questionCount, setQuestionCount] = useState('10');
  const [quizMode, setQuizMode] = useState<'practice' | 'exam'>('practice');
  const [timePerQuestion, setTimePerQuestion] = useState(60);
  const [quizName, setQuizName] = useState('');

  // Apply dynamic pool parameter from navigation routing
  useEffect(() => {
    if (params.pool) {
      const mode = params.pool as PoolMode;
      if (['Unused', 'Incorrect', 'Bookmarked', 'All'].includes(mode)) {
        setSelectedPoolMode(mode);
      }
    }
  }, [params.pool]);

  // 1. Fetch Categories and User Info on mount
  useEffect(() => {
    const fetchSetupData = async () => {
      try {
        const [userRes, catRes] = await Promise.all([
          api.get('/users/me'),
          api.get('/categories/tree')
        ]);
        
        const studyYear = userRes.data.study_year;
        
        const filterActive = (cats: Category[]): Category[] => {
          return cats
            .filter(c => c.is_active !== false)
            .map(c => ({
              ...c,
              children: c.children ? filterActive(c.children) : undefined
            }));
        };

        let filteredCategories = filterActive(catRes.data || []);
        
        if (studyYear) {
          filteredCategories = filteredCategories.filter((c: Category) => !c.target_year || c.target_year === studyYear);
        }
        
        setCategories(filteredCategories);
      } catch (err) {
        console.error('Failed to load study setup data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSetupData();
  }, []);

  // 2. Fetch Availability Counts whenever Pool Mode changes
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await api.post('/quiz/availability', { mode: selectedPoolMode });
        setAvailableCounts(res.data || {});
      } catch (err) {
        console.error('Failed to load available question counts:', err);
      }
    };

    fetchAvailability();
  }, [selectedPoolMode]);

  // Recursively sum up question counts for a category block
  const getCategoryTotalCount = (cat: Category): number => {
    let count = availableCounts[cat.id] || 0;
    if (cat.children) {
      cat.children.forEach(c => {
        count += getCategoryTotalCount(c);
      });
    }
    return count;
  };

  const getDescendantIds = (cat: Category): number[] => {
    let ids: number[] = [cat.id];
    if (cat.children) {
      cat.children.forEach(c => {
        ids = ids.concat(getDescendantIds(c));
      });
    }
    return ids;
  };

  // Block Select Handler (Syllabus Module)
  const handleToggleBlock = (block: Category) => {
    const allIds = getDescendantIds(block);
    const isSelected = selectedBlocks.includes(block.id);

    if (isSelected) {
      // Remove Block and all its subtopics
      setSelectedBlocks(prev => prev.filter(id => id !== block.id));
      setSelectedTopics(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      // Select Block and automatically pre-select all subtopics
      setSelectedBlocks(prev => [...prev, block.id]);
      const toAdd = allIds.filter(id => !selectedTopics.includes(id));
      setSelectedTopics(prev => [...prev, ...toAdd]);
    }
  };

  // Topic Select Handler (Subcategory)
  const handleToggleTopic = (topic: Category) => {
    const allIds = getDescendantIds(topic);
    const isSelected = selectedTopics.includes(topic.id);

    if (isSelected) {
      setSelectedTopics(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      const toAdd = allIds.filter(id => !selectedTopics.includes(id));
      setSelectedTopics(prev => [...prev, ...toAdd]);
    }
  };

  // Sum up all available questions from chosen topics
  const totalAvailable = selectedTopics.reduce((sum, id) => sum + (availableCounts[id] || 0), 0);

  // 3. Quiz Generation Handler
  const handleGenerateQuiz = async () => {
    if (selectedTopics.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one syllabus topic.');
      return;
    }

    let finalCount = parseInt(questionCount, 10);
    if (isNaN(finalCount) || finalCount < 1) finalCount = 10;

    if (finalCount > totalAvailable) {
      Alert.alert(
        'Insufficient Pool',
        `You requested ${finalCount} questions, but only ${totalAvailable} are available in the selected syllabus pool.`
      );
      return;
    }

    setGenerating(true);
    try {
      const res = await api.post('/quiz/generate', {
        category_ids: selectedTopics,
        question_count: finalCount,
        mode: selectedPoolMode,
        quiz_mode: quizMode,
        quiz_name: quizName.trim() || undefined,
        time_per_question: timePerQuestion
      });

      // Clear setup and navigate directly to Quiz Engine Screen
      setQuizName('');
      setSelectedBlocks([]);
      setSelectedTopics([]);
      
      router.push(`/(student)/quiz/${res.data.session_id}`);
    } catch (err: any) {
      console.error('Quiz generation failed:', err);
      Alert.alert('Quiz Setup Failed', err.response?.data?.detail || 'Failed to create quiz session.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: Colors.slate[400], marginTop: 12 }} type="small">
            Loading syllabus modules...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const poolModes: PoolMode[] = ['Unused', 'Incorrect', 'Bookmarked', 'All'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Title Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle} type="title">Create Custom Quiz</ThemedText>
        <ThemedText style={styles.headerSub} type="small">Generate a personalized exam tailored to your modules</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Section 1: Question Pool Mode */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <Layers color={Colors.emerald[400]} size={18} />
            <ThemedText style={styles.sectionTitle} type="smallBold">1. Select Question Pool</ThemedText>
          </View>

          <View style={styles.poolModesRow}>
            {poolModes.map(m => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.poolModeBtn,
                  selectedPoolMode === m && styles.poolModeBtnActive
                ]}
                onPress={() => setSelectedPoolMode(m)}
              >
                <ThemedText 
                  style={[
                    styles.poolModeText,
                    selectedPoolMode === m && { color: '#ffffff' }
                  ]} 
                  type="smallBold"
                >
                  {m}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Syllabus Modules selection */}
        <View style={styles.cardSection}>
          <View style={styles.sectionTitleRow}>
            <BookOpen color={Colors.emerald[400]} size={18} />
            <ThemedText style={styles.sectionTitle} type="smallBold">2. Select Modules</ThemedText>
          </View>

          <View style={styles.modulesGrid}>
            {categories.map(block => {
              const count = getCategoryTotalCount(block);
              const isSelected = selectedBlocks.includes(block.id);
              const isDisabled = count === 0;

              return (
                <TouchableOpacity
                  key={block.id}
                  style={[
                    styles.moduleCard,
                    isSelected && styles.moduleCardSelected,
                    isDisabled && { opacity: 0.3 }
                  ]}
                  disabled={isDisabled}
                  onPress={() => handleToggleBlock(block)}
                >
                  <View style={styles.moduleCardHeader}>
                    <ThemedText style={styles.moduleName} type="smallBold" numberOfLines={1}>
                      {block.name}
                    </ThemedText>
                    {isSelected && (
                      <View style={styles.checkWrapper}>
                        <CheckCircle color={Colors.emerald[500]} size={16} />
                      </View>
                    )}
                  </View>
                  <ThemedText style={styles.moduleCount} type="small">
                    {count} Questions Available
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Subtopic checklists */}
        {selectedBlocks.length > 0 && (
          <View style={styles.cardSection}>
            <View style={styles.sectionTitleRow}>
              <CheckCircle color={Colors.emerald[400]} size={18} />
              <ThemedText style={styles.sectionTitle} type="smallBold">3. Select Syllabus Topics</ThemedText>
            </View>

            <View style={styles.topicsWrapper}>
              {categories.filter(c => selectedBlocks.includes(c.id)).map(block => (
                <View key={block.id} style={styles.blockTopicGroup}>
                  <ThemedText style={styles.blockGroupTitle} type="smallBold">
                    {block.name.toUpperCase()}
                  </ThemedText>
                  
                  {block.children?.map(topic => {
                    const count = getCategoryTotalCount(topic);
                    const isTopicSelected = selectedTopics.includes(topic.id);
                    const isDisabled = count === 0;

                    return (
                      <TouchableOpacity
                        key={topic.id}
                        style={[
                          styles.topicRow,
                          isTopicSelected && styles.topicRowSelected,
                          isDisabled && { opacity: 0.3 }
                        ]}
                        disabled={isDisabled}
                        onPress={() => handleToggleTopic(topic)}
                      >
                        <View style={styles.checkboxCircle}>
                          {isTopicSelected && <View style={styles.checkboxInner} />}
                        </View>
                        <ThemedText style={styles.topicName} type="small">
                          {topic.name}
                        </ThemedText>
                        <ThemedText style={styles.topicCount} type="small">
                          {count} Qs
                        </ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 4: Quiz Custom Settings */}
        {selectedTopics.length > 0 && (
          <View style={styles.cardSection}>
            <View style={styles.sectionTitleRow}>
              <Settings color={Colors.emerald[400]} size={18} />
              <ThemedText style={styles.sectionTitle} type="smallBold">4. Configure settings</ThemedText>
            </View>

            <View style={styles.settingsGrid}>
              {/* Quiz Mode trigger */}
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel} type="small">Session Mode</ThemedText>
                <View style={styles.settingModeToggle}>
                  <TouchableOpacity
                    style={[
                      styles.toggleHalfBtn,
                      quizMode === 'practice' && { backgroundColor: Colors.emerald[500] }
                    ]}
                    onPress={() => setQuizMode('practice')}
                  >
                    <ThemedText style={{ color: '#ffffff' }} type="smallBold">Practice</ThemedText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleHalfBtn,
                      quizMode === 'exam' && { backgroundColor: Colors.rose[500] }
                    ]}
                    onPress={() => setQuizMode('exam')}
                  >
                    <ThemedText style={{ color: '#ffffff' }} type="smallBold">Exam</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Dynamic Timed option if exam selected */}
              {quizMode === 'exam' && (
                <View style={styles.settingItem}>
                  <ThemedText style={styles.settingLabel} type="small">Time Per Question</ThemedText>
                  <View style={styles.timeSelectRow}>
                    {[30, 60, 90, 120].map(seconds => (
                      <TouchableOpacity
                        key={seconds}
                        style={[
                          styles.timeOptionBtn,
                          timePerQuestion === seconds && styles.timeOptionBtnActive
                        ]}
                        onPress={() => setTimePerQuestion(seconds)}
                      >
                        <ThemedText 
                          style={[
                            styles.timeOptionText,
                            timePerQuestion === seconds && { color: '#ffffff' }
                          ]} 
                          type="smallBold"
                        >
                          {seconds}s
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Question Count Input */}
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel} type="small">Question Count</ThemedText>
                <View style={styles.countInputWrapper}>
                  <TextInput
                    style={styles.countTextInput}
                    keyboardType="numeric"
                    value={questionCount}
                    onChangeText={setQuestionCount}
                    placeholder="10"
                    placeholderTextColor="#64748b"
                  />
                  <ThemedText style={styles.countMaxIndicator} type="small">
                    Max {totalAvailable} Available
                  </ThemedText>
                </View>
                {/* Quick Helper Size buttons */}
                <View style={styles.quickSizesRow}>
                  {[10, 20, 50].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={styles.quickSizeBtn}
                      onPress={() => setQuestionCount(Math.min(num, totalAvailable).toString())}
                    >
                      <ThemedText style={styles.quickSizeText} type="smallBold">
                        {num === 10 ? 'Small (10 Qs)' : num === 20 ? 'Medium (20 Qs)' : 'Large (50 Qs)'}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Optional Name Input */}
              <View style={styles.settingItem}>
                <ThemedText style={styles.settingLabel} type="small">Quiz Name (Optional)</ThemedText>
                <View style={styles.nameInputWrapper}>
                  <TextInput
                    style={styles.nameTextInput}
                    value={quizName}
                    onChangeText={setQuizName}
                    placeholder="e.g. Cardiology Mock Prep"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Generate Trigger */}
        {selectedTopics.length > 0 && (
          <TouchableOpacity
            style={[
              styles.generateBtn,
              (generating || totalAvailable === 0) && { opacity: 0.5 }
            ]}
            disabled={generating || totalAvailable === 0}
            onPress={handleGenerateQuiz}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                  Generate Quiz ({totalAvailable} Qs Pool)
                </ThemedText>
                <ChevronRight color="#ffffff" size={16} />
              </>
            )}
          </TouchableOpacity>
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
    gap: 20,
  },
  cardSection: {
    backgroundColor: '#0f172a', // navy-900
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 18,
    padding: 18,
    gap: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#ffffff',
  },
  /* Pool modes */
  poolModesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  poolModeBtn: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  poolModeBtnActive: {
    backgroundColor: Colors.emerald[500],
    borderColor: Colors.emerald[500],
  },
  poolModeText: {
    color: '#94a3b8',
  },
  /* Modules grid */
  modulesGrid: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  moduleCardSelected: {
    borderColor: Colors.emerald[500],
  },
  moduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleName: {
    color: '#ffffff',
    flex: 1,
  },
  checkWrapper: {
    paddingLeft: 8,
  },
  moduleCount: {
    color: '#64748b',
    fontSize: 12,
  },
  /* Topics wrapper */
  topicsWrapper: {
    gap: 16,
  },
  blockTopicGroup: {
    gap: 10,
  },
  blockGroupTitle: {
    color: '#64748b',
    fontSize: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  topicRowSelected: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.02)',
  },
  checkboxCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.emerald[500],
  },
  topicName: {
    color: '#cbd5e1',
    flex: 1,
  },
  topicCount: {
    color: '#64748b',
    fontSize: 12,
  },
  /* Settings Grid */
  settingsGrid: {
    gap: 16,
  },
  settingItem: {
    gap: 8,
  },
  settingLabel: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  settingModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
  },
  toggleHalfBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSelectRow: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
    gap: 6,
  },
  timeOptionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeOptionBtnActive: {
    backgroundColor: '#1e293b',
  },
  timeOptionText: {
    color: '#94a3b8',
  },
  countInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
    gap: 12,
  },
  countTextInput: {
    width: 60,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    height: '100%',
  },
  countMaxIndicator: {
    color: Colors.emerald[400],
    fontWeight: '600',
  },
  nameInputWrapper: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    height: 46,
    paddingHorizontal: 14,
  },
  nameTextInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
  },
  /* Generate Btn */
  generateBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.emerald[500],
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  /* Quick selection count helpers */
  quickSizesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickSizeBtn: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickSizeText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
});
