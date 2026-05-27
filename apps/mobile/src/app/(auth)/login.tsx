import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Stethoscope, 
  Eye, 
  EyeOff, 
  Mail, 
  User, 
  BookOpen, 
  GraduationCap, 
  Calendar,
  Check,
  AlertCircle,
  ArrowRight
} from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/auth-store';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

export default function LoginScreen() {
  const router = useRouter();
  const { login: storeLogin, isAuthenticated } = useAuthStore();

  // Mode and form states
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [studyYear, setStudyYear] = useState('');
  
  // Custom focus states for premium borders
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // UI state controllers
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // University fetching states
  const [universities, setUniversities] = useState<{ id: number; name: string }[]>([]);
  const [uniModalVisible, setUniModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  // Fetch universities when registering
  useEffect(() => {
    if (!isLogin && universities.length === 0) {
      api.get('/universities')
        .then(res => setUniversities(res.data))
        .catch(err => console.error('Failed to load universities:', err));
    }
  }, [isLogin, universities.length]);

  // Dynamic Password Validation (parities web page criteria)
  const passwordCriteria = {
    minChar: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const metCount = Object.values(passwordCriteria).filter(Boolean).length;

  const getStrengthMetrics = () => {
    if (password.length === 0) return { label: '', color: 'transparent', pct: 0 };
    switch (metCount) {
      case 1:
        return { label: 'Very Weak', color: Colors.rose[500], pct: 20 };
      case 2:
        return { label: 'Weak', color: '#f97316', pct: 40 }; // orange-500
      case 3:
        return { label: 'Medium', color: '#eab308', pct: 60 }; // yellow-500
      case 4:
        return { label: 'Good', color: '#3b82f6', pct: 80 }; // blue-500
      case 5:
        return { label: 'Strong', color: Colors.emerald[500], pct: 100 };
      default:
        return { label: 'Too Weak', color: Colors.rose[500], pct: 10 };
    }
  };

  const strength = getStrengthMetrics();

  const handleAuthSubmit = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const { data: tokens } = await api.post('/auth/login', { 
          email: email.trim().toLowerCase(), 
          password 
        });

        // Load profile using retrieved credentials
        const { data: userProfile } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });

        await storeLogin(tokens.access_token, tokens.refresh_token, userProfile);
        router.replace('/(student)');
      } else {
        // Register Form Validations
        if (!fullName.trim()) {
          throw new Error('Full Name is required');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (metCount < 5) {
          throw new Error('Please fulfill all password strength criteria');
        }

        await api.post('/auth/register', {
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
          university: university || null,
          study_year: studyYear ? parseInt(studyYear) : null
        });

        // Set activation warning state
        setIsRegistered(true);
      }
    } catch (err: any) {
      const serverMessage = err.response?.data?.detail;
      
      // Clean custom error formatting for activation status
      if (serverMessage && typeof serverMessage === 'string') {
        if (serverMessage.toLowerCase().includes('not activated') || serverMessage.toLowerCase().includes('verify')) {
          setErrorMsg('Account verification pending. Please verify your email first.');
        } else {
          setErrorMsg(serverMessage);
        }
      } else {
        setErrorMsg(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Background glow effects */}
        <View style={styles.radialGlowLeft} />
        <View style={styles.radialGlowRight} />

        <View style={styles.mainWrapper}>
          {/* Top Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Stethoscope color="#ffffff" size={28} />
            </View>
            <ThemedText style={styles.logoTitle} type="title">Nawa</ThemedText>
            <ThemedText style={styles.logoSub} type="small">Medical Question Bank</ThemedText>
          </View>

          {isRegistered ? (
            /* Successful Registration (Verification State) */
            <View style={styles.successCard}>
              <View style={styles.successIconWrapper}>
                <Mail color={Colors.emerald[500]} size={40} />
              </View>
              <ThemedText style={styles.successTitle} type="subtitle">Check Your Email</ThemedText>
              <ThemedText style={styles.successDesc} type="default">
                We have sent an activation link to your email.{'\n\n'}
                You must click this link to verify your account before logging in.
              </ThemedText>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  setIsRegistered(false);
                  setIsLogin(true);
                  setPassword('');
                  setConfirmPassword('');
                }}
              >
                <ThemedText style={styles.submitBtnText} type="smallBold">Back to Sign In</ThemedText>
                <ArrowRight color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
          ) : (
            /* Form Panel */
            <View style={styles.formCard}>
              {/* Tab Switcher */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, isLogin && styles.activeTabBtn]}
                  onPress={() => {
                    setIsLogin(true);
                    setErrorMsg(null);
                  }}
                >
                  <ThemedText 
                    style={[styles.tabText, isLogin && styles.activeTabText]} 
                    type="smallBold"
                  >
                    Sign In
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabBtn, !isLogin && styles.activeTabBtn]}
                  onPress={() => {
                    setIsLogin(false);
                    setErrorMsg(null);
                  }}
                >
                  <ThemedText 
                    style={[styles.tabText, !isLogin && styles.activeTabText]} 
                    type="smallBold"
                  >
                    Register
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Error Banner */}
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <AlertCircle color={Colors.rose[500]} size={18} />
                  <ThemedText style={styles.errorText} type="small">{errorMsg}</ThemedText>
                </View>
              )}

              {/* Inputs */}
              <View style={styles.inputsWrapper}>
                {/* Full Name (Registration only) */}
                {!isLogin && (
                  <View key="fullNameContainer" style={styles.inputContainer}>
                    <ThemedText style={styles.label} type="small">Full Name</ThemedText>
                    <View style={[
                      styles.inputWrapper,
                      focusedField === 'fullName' && styles.focusedInput
                    ]}>
                      <User color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                      <TextInput
                        placeholder="Dr. Ahmed Hassan"
                        placeholderTextColor={Colors.slate[450] || '#64748b'}
                        value={fullName}
                        onChangeText={setFullName}
                        onFocus={() => setFocusedField('fullName')}
                        onBlur={() => setFocusedField(null)}
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                )}

                {/* University and Study Year Row (Registration only) */}
                {!isLogin && (
                  <View key="uniYearContainer" style={styles.rowInputs}>
                    {/* University Picker */}
                    <View style={[styles.inputContainer, { flex: 1.2, marginRight: 8 }]}>
                      <ThemedText style={styles.label} type="small">University</ThemedText>
                      <TouchableOpacity 
                        style={[
                          styles.inputWrapper,
                          focusedField === 'university' && styles.focusedInput
                        ]}
                        onPress={() => setUniModalVisible(true)}
                      >
                        <GraduationCap color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                        <ThemedText style={[
                          styles.pickerText,
                          !university && { color: Colors.slate[450] || '#64748b' }
                        ]} type="small">
                          {university || 'Select...'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    {/* Study Year Picker */}
                    <View style={[styles.inputContainer, { flex: 0.8 }]}>
                      <ThemedText style={styles.label} type="small">Year</ThemedText>
                      <TouchableOpacity 
                        style={[
                          styles.inputWrapper,
                          focusedField === 'studyYear' && styles.focusedInput
                        ]}
                        onPress={() => setYearModalVisible(true)}
                      >
                        <Calendar color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                        <ThemedText style={[
                          styles.pickerText,
                          !studyYear && { color: Colors.slate[450] || '#64748b' }
                        ]} type="small">
                          {studyYear ? `Year ${studyYear}` : 'Select...'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Email Address */}
                <View key="emailContainer" style={styles.inputContainer}>
                  <ThemedText style={styles.label} type="small">Email Address</ThemedText>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.focusedInput
                  ]}>
                    <Mail color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                    <TextInput
                      placeholder="you@medical.edu"
                      placeholderTextColor={Colors.slate[450] || '#64748b'}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* Password */}
                <View key="passwordContainer" style={styles.inputContainer}>
                  <ThemedText style={styles.label} type="small">Password</ThemedText>
                  <View style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.focusedInput
                  ]}>
                    <BookOpen color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor={Colors.slate[450] || '#64748b'}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      style={styles.textInput}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      {showPassword ? (
                        <EyeOff color={Colors.slate[400]} size={18} />
                      ) : (
                        <Eye color={Colors.slate[400]} size={18} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password Strength Widget (Registration only) */}
                {!isLogin && password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthHeader}>
                      <ThemedText style={{ color: Colors.slate[400] }} type="small">Strength:</ThemedText>
                      <ThemedText style={{ color: strength.color, fontWeight: '700' }} type="small">
                        {strength.label}
                      </ThemedText>
                    </View>
                    <View style={styles.strengthBarOuter}>
                      <View style={[
                        styles.strengthBarInner, 
                        { width: `${strength.pct}%`, backgroundColor: strength.color }
                      ]} />
                    </View>

                    {/* Requirements checklist */}
                    <View style={styles.checklistGrid}>
                      <View style={styles.checkItem}>
                        {passwordCriteria.minChar ? (
                          <Check color={Colors.emerald[500]} size={12} style={styles.checkIcon} />
                        ) : (
                          <View style={styles.bulletPoint} />
                        )}
                        <ThemedText style={[styles.checkText, passwordCriteria.minChar && styles.checkTextActive]} type="small">
                          Min 8 chars
                        </ThemedText>
                      </View>
                      
                      <View style={styles.checkItem}>
                        {passwordCriteria.hasUpper ? (
                          <Check color={Colors.emerald[500]} size={12} style={styles.checkIcon} />
                        ) : (
                          <View style={styles.bulletPoint} />
                        )}
                        <ThemedText style={[styles.checkText, passwordCriteria.hasUpper && styles.checkTextActive]} type="small">
                          One uppercase
                        </ThemedText>
                      </View>

                      <View style={styles.checkItem}>
                        {passwordCriteria.hasLower ? (
                          <Check color={Colors.emerald[500]} size={12} style={styles.checkIcon} />
                        ) : (
                          <View style={styles.bulletPoint} />
                        )}
                        <ThemedText style={[styles.checkText, passwordCriteria.hasLower && styles.checkTextActive]} type="small">
                          One lowercase
                        </ThemedText>
                      </View>

                      <View style={styles.checkItem}>
                        {passwordCriteria.hasNumber ? (
                          <Check color={Colors.emerald[500]} size={12} style={styles.checkIcon} />
                        ) : (
                          <View style={styles.bulletPoint} />
                        )}
                        <ThemedText style={[styles.checkText, passwordCriteria.hasNumber && styles.checkTextActive]} type="small">
                          One number
                        </ThemedText>
                      </View>

                      <View style={styles.checkItem}>
                        {passwordCriteria.hasSpecial ? (
                          <Check color={Colors.emerald[500]} size={12} style={styles.checkIcon} />
                        ) : (
                          <View style={styles.bulletPoint} />
                        )}
                        <ThemedText style={[styles.checkText, passwordCriteria.hasSpecial && styles.checkTextActive]} type="small">
                          One special char
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                )}

                {/* Confirm Password (Registration only) */}
                {!isLogin && (
                  <View key="confirmPasswordContainer" style={styles.inputContainer}>
                    <ThemedText style={styles.label} type="small">Confirm Password</ThemedText>
                    <View style={[
                      styles.inputWrapper,
                      focusedField === 'confirmPassword' && styles.focusedInput
                    ]}>
                      <BookOpen color={Colors.slate[400]} size={18} style={styles.fieldIcon} />
                      <TextInput
                        placeholder="••••••••"
                        placeholderTextColor={Colors.slate[450] || '#64748b'}
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setFocusedField('confirmPassword')}
                        onBlur={() => setFocusedField(null)}
                        style={styles.textInput}
                      />
                      <TouchableOpacity 
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIcon}
                      >
                        {showConfirmPassword ? (
                          <EyeOff color={Colors.slate[400]} size={18} />
                        ) : (
                          <Eye color={Colors.slate[400]} size={18} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Submit Action */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleAuthSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <ThemedText style={styles.submitBtnText} type="smallBold">
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </ThemedText>
                    <ArrowRight color="#ffffff" size={16} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* University Dropdown Modal */}
      <Modal
        visible={uniModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUniModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle} type="smallBold">Select University</ThemedText>
            
            {universities.length === 0 ? (
              <ActivityIndicator size="small" color={Colors.emerald[500]} style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={universities}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      university === item.name && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setUniversity(item.name);
                      setUniModalVisible(false);
                    }}
                  >
                    <ThemedText 
                      style={[
                        styles.modalOptionText,
                        university === item.name && { color: Colors.emerald[400] }
                      ]} 
                      type="small"
                    >
                      {item.name}
                    </ThemedText>
                    {university === item.name && <Check color={Colors.emerald[500]} size={16} />}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 300 }}
              />
            )}

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setUniModalVisible(false)}
            >
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Study Year Dropdown Modal */}
      <Modal
        visible={yearModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setYearModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle} type="smallBold">Select Study Year</ThemedText>

            <FlatList
              data={['1', '2', '3', '4', '5']}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    studyYear === item && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    setStudyYear(item);
                    setYearModalVisible(false);
                  }}
                >
                  <ThemedText 
                    style={[
                      styles.modalOptionText,
                      studyYear === item && { color: Colors.emerald[400] }
                    ]} 
                    type="small"
                  >
                    Year {item}
                  </ThemedText>
                  {studyYear === item && <Check color={Colors.emerald[500]} size={16} />}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setYearModalVisible(false)}
            >
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">Close</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#020617', // navy-950
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  mainWrapper: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  /* Glow overlays */
  radialGlowLeft: {
    position: 'absolute',
    top: 50,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#10b981', // emerald-500
    opacity: 0.06,
    zIndex: -1,
  },
  radialGlowRight: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#059669', // emerald-600
    opacity: 0.04,
    zIndex: -1,
  },
  /* Logo */
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBackground: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 16,
  },
  logoTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  logoSub: {
    color: '#94a3b8',
    marginTop: 4,
  },
  /* Form Card & Success Card */
  formCard: {
    backgroundColor: '#0f172a', // navy-900
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    textAlign: 'center',
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    color: '#ffffff',
    fontWeight: '800',
    marginBottom: 12,
    fontSize: 22,
  },
  successDesc: {
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  /* Switch Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  activeTabBtn: {
    backgroundColor: Colors.emerald[500],
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    color: '#94a3b8', // slate-400
  },
  activeTabText: {
    color: '#ffffff',
  },
  /* Error Banner */
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    color: Colors.rose[500],
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  /* Inputs */
  inputsWrapper: {
    gap: 16,
    marginBottom: 24,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
  },
  label: {
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617', // navy-950 background for fields
    borderWidth: 1,
    borderColor: '#1e293b', // navy-800
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
  },
  focusedInput: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  pickerText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  /* Submit Button */
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.emerald[500],
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.emerald[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
  },
  /* Password strength checker */
  strengthContainer: {
    marginTop: 2,
    gap: 8,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthBarOuter: {
    height: 6,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
  },
  strengthBarInner: {
    height: '100%',
    borderRadius: 3,
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  checkIcon: {
    marginRight: 4,
  },
  bulletPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#64748b',
    marginHorizontal: 4,
  },
  checkText: {
    color: '#64748b',
    fontSize: 11,
  },
  checkTextActive: {
    color: 'rgba(16, 185, 129, 0.8)',
  },
  /* Modals */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 10,
  },
  modalOptionText: {
    color: '#cbd5e1',
  },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: '#1e293b',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
