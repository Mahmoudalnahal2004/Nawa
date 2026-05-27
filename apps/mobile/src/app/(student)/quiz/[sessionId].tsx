import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  AlertTriangle,
  Play
} from 'lucide-react-native';

import { Colors } from '../../../constants/colors';
import api, { API_BASE } from '../../../lib/api';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

interface QuizQuestion {
  id: number;
  question_text: string;
  image_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e?: string | null;
  correct_answer?: string | null;
  explanation?: string | null;
}

interface AnswerFeedback {
  question_id: number;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation?: string | null;
}

export default function QuizEngineScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  // Engine loading and error states
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Session states
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [categoryName, setCategoryName] = useState('');
  const [mode, setMode] = useState<'practice' | 'exam'>('practice');
  const [quizStatus, setQuizStatus] = useState<'in_progress' | 'completed'>('in_progress');

  // Navigation and answer indexes
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  
  // Practice mode feedback states
  const [answeredFeedbacks, setAnsweredFeedbacks] = useState<Record<number, AnswerFeedback>>({});
  const [hasCheckedAnswer, setHasCheckedAnswer] = useState<Record<number, boolean>>({});

  // Exit Modal
  const [exitModalVisible, setExitModalVisible] = useState(false);

  // Results State (when exam is submitted)
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState<{
    total_questions: number;
    correct_count: number;
    incorrect_count: number;
    score_percentage: number;
  } | null>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<any>(null);

  // 1. Fetch Quiz Session on Mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await api.get(`/quiz/${sessionId}`);
        const data = res.data;

        setQuestions(data.questions || []);
        setTotalQuestions(data.total_questions || 0);
        setCategoryName(data.category_name || 'Medical Quiz');
        setMode(data.mode || 'practice');
        setQuizStatus(data.status || 'in_progress');
        setCurrentIndex(data.current_question_index || 0);

        // Prepopulate existing answers
        const savedAnswers: Record<number, string> = {};
        const savedFeedbacks: Record<number, AnswerFeedback> = {};
        const checkedMap: Record<number, boolean> = {};

        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach((ans: any) => {
            savedAnswers[ans.question_id] = ans.selected_answer;
            savedFeedbacks[ans.question_id] = {
              question_id: ans.question_id,
              selected_answer: ans.selected_answer,
              correct_answer: ans.correct_answer,
              is_correct: ans.is_correct,
              explanation: ans.explanation
            };
            checkedMap[ans.question_id] = true;
          });
        }

        setSelectedAnswers(savedAnswers);
        setAnsweredFeedbacks(savedFeedbacks);
        setHasCheckedAnswer(checkedMap);

        // Setup timer if timed exam (e.g. 60 seconds per question)
        if (data.mode === 'exam' && data.status !== 'completed') {
          const totalSeconds = (data.time_per_question || 60) * data.total_questions;
          setTimeRemaining(totalSeconds);
        }

        if (data.status === 'completed') {
          // If already completed, trigger results sheet directly
          fetchResultsSummary();
        }
      } catch (err: any) {
        console.error('Failed to load quiz session:', err);
        setErrorMsg(err.response?.data?.detail || 'Failed to initialize quiz. Session may not exist.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // 2. Timer countdown thread
  useEffect(() => {
    if (mode === 'exam' && quizStatus === 'in_progress' && timeRemaining > 0 && !loading && !showResults) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleExamAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, quizStatus, timeRemaining, loading, showResults]);

  // Format MM:SS for Timer display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch exam result summary after submission
  const fetchResultsSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/quiz/${sessionId}/results`);
      setResultsData(res.data);
      setShowResults(true);
    } catch (err) {
      console.error('Failed to load exam results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExamAutoSubmit = async () => {
    Alert.alert(
      'Time Expired',
      'Your exam session has timed out. Submitting your current answers.',
      [{ text: 'OK', onPress: () => submitExamSession() }]
    );
  };

  // 3. Option Selection Handler
  const handleSelectOption = (optionKey: string) => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    // In practice mode, if they've checked the answer, lock selections
    if (mode === 'practice' && hasCheckedAnswer[currentQuestion.id]) {
      return;
    }

    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionKey
    }));
  };

  // 4. Submit Answer in Practice Mode (to get instant feedback)
  const handleCheckAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const selectedOption = selectedAnswers[currentQuestion.id];
    if (!selectedOption) {
      Alert.alert('Selection Required', 'Please select an option first.');
      return;
    }

    try {
      const res = await api.post(`/quiz/${sessionId}/answer`, {
        question_id: currentQuestion.id,
        selected_answer: selectedOption
      });

      setAnsweredFeedbacks(prev => ({
        ...prev,
        [currentQuestion.id]: res.data
      }));

      setHasCheckedAnswer(prev => ({
        ...prev,
        [currentQuestion.id]: true
      }));
    } catch (err) {
      console.error('Failed to submit answer feedback:', err);
    }
  };

  // 5. Navigation buttons (includes background persistence API sync)
  const handleNextQuestion = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const selectedOption = selectedAnswers[currentQuestion.id];

    // Background answer saving (crucial for crash protection)
    if (selectedOption && !hasCheckedAnswer[currentQuestion.id]) {
      try {
        await api.post(`/quiz/${sessionId}/answer`, {
          question_id: currentQuestion.id,
          selected_answer: selectedOption
        });
      } catch (err) {
        console.error('Background save answer failed:', err);
      }
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // 6. Submit Exam Handler
  const submitExamSession = async () => {
    try {
      setLoading(true);

      // Persist current question answer prior to submission if present
      const currentQuestion = questions[currentIndex];
      if (currentQuestion) {
        const selectedOption = selectedAnswers[currentQuestion.id];
        if (selectedOption && !hasCheckedAnswer[currentQuestion.id]) {
          await api.post(`/quiz/${sessionId}/answer`, {
            question_id: currentQuestion.id,
            selected_answer: selectedOption
          });
        }
      }

      // Hit final exam submit endpoint
      await api.post(`/quiz/${sessionId}/submit`);
      setQuizStatus('completed');
      
      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);

      await fetchResultsSummary();
    } catch (err: any) {
      console.error('Failed to submit exam:', err);
      Alert.alert('Submission Error', err.response?.data?.detail || 'Failed to submit exam.');
      setLoading(false);
    }
  };

  const handleExitQuiz = async () => {
    // Call pause API
    try {
      await api.post(`/quiz/${sessionId}/pause`, {
        current_question_index: currentIndex
      });
    } catch (err) {
      console.error('Pause API sync failed:', err);
    }

    setExitModalVisible(false);
    router.replace('/(student)');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: Colors.slate[400], marginTop: 12 }} type="small">
            Assembling clinical vignette session...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <AlertTriangle color={Colors.rose[500]} size={48} />
          <ThemedText style={styles.errorTitle} type="subtitle">Exam Error</ThemedText>
          <ThemedText style={styles.errorDesc} type="default">{errorMsg}</ThemedText>
          <TouchableOpacity style={styles.exitBtn} onPress={() => router.replace('/(student)')}>
            <LogOut color="#ffffff" size={16} />
            <ThemedText style={{ color: '#ffffff' }} type="smallBold">Exit Engine</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedOption = currentQuestion ? selectedAnswers[currentQuestion.id] : null;
  const isChecked = currentQuestion ? hasCheckedAnswer[currentQuestion.id] : false;
  const feedback = currentQuestion ? answeredFeedbacks[currentQuestion.id] : null;

  // Options parsing maps
  const optionList = currentQuestion
    ? [
        { key: 'A', value: currentQuestion.option_a },
        { key: 'B', value: currentQuestion.option_b },
        { key: 'C', value: currentQuestion.option_c },
        { key: 'D', value: currentQuestion.option_d },
        ...(currentQuestion.option_e ? [{ key: 'E', value: currentQuestion.option_e }] : [])
      ]
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />

      {showResults && resultsData ? (
        /* ================= RESULTS SCOREBOARD OVERLAY ================= */
        <View style={styles.resultsWrapper}>
          <ScrollView contentContainerStyle={styles.resultsScroll} bounces={false}>
            <View style={styles.resultsHeader}>
              <View style={styles.awardWrapper}>
                <Award color={Colors.emerald[500]} size={48} />
              </View>
              <ThemedText style={styles.resultsTitle} type="subtitle">Exam Scoreboard</ThemedText>
              <ThemedText style={styles.resultsSubtitle} type="small">
                {categoryName} • Mode: {mode.toUpperCase()}
              </ThemedText>
            </View>

            <View style={styles.scoreGaugeCard}>
              <ThemedText style={styles.scorePctText} type="title">
                {resultsData.score_percentage.toFixed(0)}%
              </ThemedText>
              <ThemedText style={{ color: Colors.slate[400] }} type="small">
                Accuracy Score
              </ThemedText>

              {/* Progress gauge metrics */}
              <View style={styles.progressMetricsGrid}>
                <View style={styles.metricItem}>
                  <View style={[styles.dot, { backgroundColor: Colors.emerald[500] }]} />
                  <ThemedText style={styles.metricText} type="small">
                    {resultsData.correct_count} Correct
                  </ThemedText>
                </View>
                <View style={styles.metricItem}>
                  <View style={[styles.dot, { backgroundColor: Colors.rose[500] }]} />
                  <ThemedText style={styles.metricText} type="small">
                    {resultsData.incorrect_count} Incorrect
                  </ThemedText>
                </View>
                <View style={styles.metricItem}>
                  <View style={[styles.dot, { backgroundColor: Colors.slate[550] }]} />
                  <ThemedText style={styles.metricText} type="small">
                    {resultsData.total_questions} Questions
                  </ThemedText>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.returnDashboardBtn}
              onPress={() => router.replace('/(student)')}
            >
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">
                Return to Dashboard
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        /* ================= LIVE QUIZ ENGINE WINDOW ================= */
        <View style={{ flex: 1 }}>
          {/* Sticky Progress & Timer Header */}
          <View style={styles.topStickyHeader}>
            <View style={styles.progressSection}>
              <ThemedText style={styles.progressText} type="smallBold">
                Question {currentIndex + 1} of {totalQuestions}
              </ThemedText>
              <ThemedText style={styles.categorySub} type="small">
                {categoryName}
              </ThemedText>
            </View>

            {/* Timer or Mode Badge */}
            <View style={styles.headerRightActions}>
              {mode === 'exam' ? (
                <View style={styles.timerBadge}>
                  <Clock color={Colors.orange[400]} size={14} />
                  <ThemedText style={styles.timerText} type="smallBold">
                    {formatTime(timeRemaining)}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.practiceBadge}>
                  <Play color={Colors.emerald[500]} size={12} fill={Colors.emerald[500]} />
                  <ThemedText style={styles.practiceBadgeText} type="smallBold">PRACTICE</ThemedText>
                </View>
              )}

              {/* Pause/Exit button */}
              <TouchableOpacity
                style={styles.exitActionBtn}
                onPress={() => setExitModalVisible(true)}
              >
                <LogOut color={Colors.rose[500]} size={16} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Core Scrollable clinical Vignette Body */}
          <ScrollView contentContainerStyle={styles.vignetteContent} bounces={false}>
            {currentQuestion && (
              <View style={{ gap: 20 }}>
                {/* Vignette vignette text */}
                <View style={styles.vignetteCard}>
                  <ThemedText style={styles.questionText} type="default">
                    {currentQuestion.question_text}
                  </ThemedText>

                  {/* Render Clinical Vignette Attachment Image if URL present */}
                  {currentQuestion.image_url && (
                    <View style={styles.imageAttachmentContainer}>
                      <Image
                        source={{ uri: currentQuestion.image_url.startsWith('http') ? currentQuestion.image_url : `${API_BASE}${currentQuestion.image_url}` }}
                        style={styles.questionImage}
                        contentFit="contain"
                      />
                    </View>
                  )}
                </View>

                {/* Option selection cards vertical list */}
                <View style={styles.optionsWrapper}>
                  {optionList.map((option) => {
                    const isSelected = selectedOption === option.key;
                    
                    // practice checked feedback colors
                    const isChoiceCorrect = feedback?.correct_answer === option.key;
                    const isChoiceIncorrect = isSelected && !feedback?.is_correct;

                    let cardStyle = styles.optionCard;
                    let labelStyle = styles.optionLabel;
                    let textStyle = styles.optionText;
                    let radioCircle = styles.radioCircle;
                    let radioInner = styles.radioInner;

                    if (isSelected) {
                      cardStyle = styles.optionCardSelected;
                      labelStyle = styles.optionLabelSelected;
                      textStyle = styles.optionTextSelected;
                      radioCircle = styles.radioCircleSelected;
                      radioInner = styles.radioInnerSelected;
                    }

                    if (mode === 'practice' && isChecked) {
                      if (isChoiceCorrect) {
                        cardStyle = styles.optionCardCorrect;
                        labelStyle = styles.optionLabelCorrect;
                        radioCircle = styles.radioCircleCorrect;
                      } else if (isChoiceIncorrect) {
                        cardStyle = styles.optionCardIncorrect;
                        labelStyle = styles.optionLabelIncorrect;
                        radioCircle = styles.radioCircleIncorrect;
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={option.key}
                        style={cardStyle}
                        onPress={() => handleSelectOption(option.key)}
                        activeOpacity={0.8}
                      >
                        {/* Radio selection circle indicator */}
                        <View style={radioCircle}>
                          {isSelected && <View style={radioInner} />}
                          {mode === 'practice' && isChecked && isChoiceCorrect && (
                            <CheckCircle2 color="#ffffff" size={14} />
                          )}
                          {mode === 'practice' && isChecked && isChoiceIncorrect && (
                            <XCircle color="#ffffff" size={14} />
                          )}
                        </View>

                        {/* Choice text details */}
                        <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                          <ThemedText style={labelStyle} type="smallBold">
                            {option.key}.
                          </ThemedText>
                          <ThemedText style={textStyle} type="small">
                            {option.value}
                          </ThemedText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Practice Mode instant checker and explanation overlay */}
                {mode === 'practice' && (
                  <View style={styles.practiceFeedbackSection}>
                    {!isChecked ? (
                      <TouchableOpacity
                        style={[
                          styles.checkBtn,
                          !selectedOption && { backgroundColor: '#1e293b', opacity: 0.5 }
                        ]}
                        disabled={!selectedOption}
                        onPress={handleCheckAnswer}
                      >
                        <ThemedText style={{ color: '#ffffff' }} type="smallBold">Check Answer</ThemedText>
                      </TouchableOpacity>
                    ) : (
                      /* Highlight Explanation Details */
                      <View style={[
                        styles.explanationCard,
                        feedback?.is_correct ? styles.explanationCardCorrect : styles.explanationCardIncorrect
                      ]}>
                        <View style={styles.explanationHeader}>
                          {feedback?.is_correct ? (
                            <CheckCircle2 color={Colors.emerald[500]} size={20} />
                          ) : (
                            <XCircle color={Colors.rose[500]} size={20} />
                          )}
                          <ThemedText style={[
                            styles.explanationTitle,
                            { color: feedback?.is_correct ? Colors.emerald[400] : Colors.rose[500] }
                          ]} type="smallBold">
                            {feedback?.is_correct ? 'Correct Answer' : 'Incorrect Attempt'} (Key: {feedback?.correct_answer})
                          </ThemedText>
                        </View>

                        {feedback?.explanation && (
                          <View style={styles.explanationBody}>
                            <ThemedText style={styles.explanationHeading} type="smallBold">Explanation:</ThemedText>
                            <ThemedText style={styles.explanationText} type="default">
                              {feedback.explanation}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Sticky footer action navigation bar */}
          <View style={styles.bottomStickyActionBg}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
              disabled={currentIndex === 0}
              onPress={handlePreviousQuestion}
            >
              <ChevronLeft color="#ffffff" size={16} />
              <ThemedText style={styles.navBtnText} type="smallBold">Previous</ThemedText>
            </TouchableOpacity>

            {currentIndex < totalQuestions - 1 ? (
              /* Next Question button */
              <TouchableOpacity
                style={styles.navBtn}
                onPress={handleNextQuestion}
              >
                <ThemedText style={styles.navBtnText} type="smallBold">Next</ThemedText>
                <ChevronRight color="#ffffff" size={16} />
              </TouchableOpacity>
            ) : (
              /* Final Exam submit action button */
              <TouchableOpacity
                style={styles.submitExamBtn}
                onPress={() => {
                  Alert.alert(
                    'Submit Exam',
                    'Are you sure you want to finish and submit this exam session?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Submit', style: 'default', onPress: submitExamSession }
                    ]
                  );
                }}
              >
                <ThemedText style={{ color: '#ffffff' }} type="smallBold">Submit Exam</ThemedText>
                <Award color="#ffffff" size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Exit Alert Dialog Overlay Modal */}
      <Modal
        visible={exitModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setExitModalVisible(false)}
      >
        <View style={styles.exitModalOverlay}>
          <View style={styles.exitModalContent}>
            <AlertTriangle color={Colors.rose[500]} size={42} style={{ marginBottom: 12 }} />
            <ThemedText style={styles.exitModalTitle} type="smallBold">Pause Session?</ThemedText>
            <ThemedText style={styles.exitModalDesc} type="default">
              Are you sure you want to pause and exit this quiz session? Your answered questions have been securely saved and synced.
            </ThemedText>

            <View style={styles.exitActionsRow}>
              <TouchableOpacity
                style={styles.exitActionCancel}
                onPress={() => setExitModalVisible(false)}
              >
                <ThemedText style={{ color: '#ffffff' }} type="smallBold">Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exitActionPause}
                onPress={handleExitQuiz}
              >
                <ThemedText style={{ color: '#ffffff' }} type="smallBold">Pause & Exit</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: {
    color: '#ffffff',
    fontWeight: '800',
  },
  errorDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.rose[500],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  /* Top sticky details */
  topStickyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b', // navy-800
    backgroundColor: '#020617',
  },
  progressSection: {
    gap: 2,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 15,
  },
  categorySub: {
    color: '#94a3b8',
    fontSize: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  timerText: {
    color: Colors.orange[400],
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  practiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  practiceBadgeText: {
    color: Colors.emerald[400],
    fontSize: 10,
  },
  exitActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Vignette clinical vignette card */
  vignetteContent: {
    padding: 20,
    paddingBottom: 110, // offsets the sticky bottom action bar
  },
  vignetteCard: {
    backgroundColor: '#0f172a', // navy-900
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  questionText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '500',
  },
  imageAttachmentContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  questionImage: {
    width: '100%',
    height: '100%',
  },
  /* Options list */
  optionsWrapper: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a', // default state background
    borderWidth: 1,
    borderColor: '#1e293b', // default state border
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  optionCardSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: Colors.emerald[500],
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  optionCardCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: Colors.emerald[500],
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  optionCardIncorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderWidth: 1,
    borderColor: Colors.rose[500],
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  /* Radio Circle shapes */
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#334155', // default slate-700
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleCorrect: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: Colors.emerald[500],
    borderColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleIncorrect: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: Colors.rose[500],
    borderColor: Colors.rose[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.emerald[500],
  },
  radioInnerSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.emerald[500],
  },
  /* Radio Typography Option texts */
  optionLabel: {
    color: '#94a3b8',
    fontSize: 15,
  },
  optionLabelSelected: {
    color: Colors.emerald[400],
    fontSize: 15,
  },
  optionLabelCorrect: {
    color: Colors.emerald[400],
    fontSize: 15,
  },
  optionLabelIncorrect: {
    color: Colors.rose[500],
    fontSize: 15,
  },
  optionText: {
    color: '#e2e8f0',
    lineHeight: 22,
  },
  optionTextSelected: {
    color: '#ffffff',
    lineHeight: 22,
  },
  /* Practice check feedback and explanations */
  practiceFeedbackSection: {
    marginTop: 8,
  },
  checkBtn: {
    backgroundColor: Colors.emerald[500],
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explanationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  explanationCardCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  explanationCardIncorrect: {
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
    borderColor: 'rgba(244, 63, 94, 0.15)',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  explanationTitle: {
    fontSize: 15,
  },
  explanationBody: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 14,
    gap: 6,
  },
  explanationHeading: {
    color: '#ffffff',
    fontSize: 13,
  },
  explanationText: {
    color: '#cbd5e1',
    lineHeight: 21,
    fontSize: 14,
  },
  /* Sticky footer navigations */
  bottomStickyActionBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#0f172a', // navy-900 background
    borderTopWidth: 1,
    borderTopColor: '#1e293b', // navy-800
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 18 : 0,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b', // navy-800
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  navBtnText: {
    color: '#ffffff',
  },
  submitExamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.emerald[500],
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 16,
    gap: 6,
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  /* Exit Alert Dialog Overlay Modals */
  exitModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 24,
  },
  exitModalContent: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    textAlign: 'center',
  },
  exitModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 8,
  },
  exitModalDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  exitActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exitActionCancel: {
    flex: 1,
    backgroundColor: '#1e293b',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitActionPause: {
    flex: 1,
    backgroundColor: Colors.rose[500],
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* ================= RESULTS CARD VIEW ================= */
  resultsWrapper: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
  },
  resultsScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  resultsHeader: {
    alignItems: 'center',
    gap: 12,
  },
  awardWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  resultsTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  resultsSubtitle: {
    color: '#94a3b8',
  },
  scoreGaugeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  scorePctText: {
    fontSize: 56,
    color: Colors.emerald[400],
    fontWeight: '800',
    lineHeight: 64,
  },
  progressMetricsGrid: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 20,
    marginTop: 12,
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  returnDashboardBtn: {
    backgroundColor: Colors.emerald[500],
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
