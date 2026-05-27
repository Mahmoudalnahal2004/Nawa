import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Switch,
  Image,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  Animated
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  User as UserIcon,
  Building2,
  GraduationCap,
  Save,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  Check,
  ChevronDown,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';
import { useAuthStore } from '../../store/auth-store';

interface UniversityItem {
  id: number;
  name: string;
}

export default function StudentProfile() {
  const { user, updateUser } = useAuthStore();
  
  // Loader states
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Data states
  const [universities, setUniversities] = useState<UniversityItem[]>([]);
  const [filteredUnis, setFilteredUnis] = useState<UniversityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [form, setForm] = useState({
    full_name: '',
    university: '',
    study_year: '' as string,
    is_anonymous: false,
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
  });

  // UI toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [uniModalVisible, setUniModalVisible] = useState(false);

  // Premium Animated Toast System
  const [toast, setToast] = useState<{ text: string; subtext?: string; type: 'success' | 'error' } | null>(null);
  const toastAnim = useState(new Animated.Value(-120))[0]; // Start offscreen above the notch

  const showToast = (text: string, subtext?: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, subtext, type });
    
    // Animate slide down
    Animated.spring(toastAnim, {
      toValue: Platform.OS === 'ios' ? 10 : 20, // Slide down under the status bar
      useNativeDriver: true,
      tension: 65,
      friction: 9,
    }).start();

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -150, // Slide back offscreen
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToast(null);
      });
    }, 3000);
  };

  // Sync with Zustand and fetch latest profile + universities
  const fetchProfileAndUnis = async () => {
    try {
      // 1. Fetch latest profile from backend to ensure state parity
      const profileRes = await api.get('/users/me');
      const p = profileRes.data;
      
      const dbForm = {
        full_name: p.full_name || '',
        university: p.university || '',
        study_year: p.study_year != null ? String(p.study_year) : '',
        is_anonymous: p.is_anonymous || false,
      };
      
      setForm(dbForm);
      
      // Update local store with the latest backend state
      await updateUser({
        full_name: p.full_name,
        university: p.university,
        study_year: p.study_year,
        is_anonymous: p.is_anonymous,
      });

      // 2. Fetch universities list
      const unisRes = await api.get('/universities');
      const uniList = unisRes.data || [];
      setUniversities(uniList);
      setFilteredUnis(uniList);
    } catch (err) {
      console.error('Failed to sync profile settings:', err);
      // Fallback to local store user details if offline
      if (user) {
        setForm({
          full_name: user.full_name || '',
          university: user.university || '',
          study_year: user.study_year != null ? String(user.study_year) : '',
          is_anonymous: user.is_anonymous || false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndUnis();
  }, []);

  // Filter universities based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUnis(universities);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUnis(
        universities.filter(uni => uni.name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, universities]);

  // Image picking handler
  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast(
          'Permissions Required',
          'Please allow Nawa Q-Bank to access your photos to select an avatar.',
          'error'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        const selectedUri = result.assets[0].uri;
        // Save the avatar URI locally to Zustand store
        await updateUser({ avatar_uri: selectedUri });
        showToast('Avatar Updated', 'Your native profile avatar has been saved locally.', 'success');
      }
    } catch (err) {
      console.error('Failed to select photo:', err);
      showToast('Selection Failed', 'Unable to access your camera roll at this time.', 'error');
    }
  };

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) {
      showToast('Validation Error', 'Full Name is required.', 'error');
      return;
    }

    setSavingProfile(true);
    try {
      const patchData = {
        full_name: form.full_name.trim(),
        university: form.university || null,
        study_year: form.study_year ? parseInt(form.study_year) : null,
        is_anonymous: form.is_anonymous,
      };

      const res = await api.patch('/users/me/profile', patchData);
      
      // Update local Zustand store
      await updateUser({
        full_name: res.data.full_name,
        university: res.data.university,
        study_year: res.data.study_year,
        is_anonymous: res.data.is_anonymous,
      });

      showToast('Profile Saved', 'Your medical profile has been updated.', 'success');
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      const detail = err.response?.data?.detail || 'Failed to update profile details.';
      showToast('Save Failed', detail, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      showToast('Validation Error', 'Please fill in both current and new password fields.', 'error');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showToast('Validation Error', 'New password must be at least 6 characters long.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      await api.post('/users/me/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      showToast('Password Updated', 'Your account security credentials have been updated.', 'success');
      setPasswordForm({ current_password: '', new_password: '' });
    } catch (err: any) {
      console.error('Failed to change password:', err);
      const detail = err.response?.data?.detail || 'Failed to change password. Verify your credentials.';
      showToast('Update Failed', detail, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: '#94a3b8', marginTop: 12 }} type="small">Loading your profile settings...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Get initials for avatar fallback
  const initials = form.full_name
    ? form.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'DR';

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Premium Sliding Toast Overlay Banner */}
      {toast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
          <View style={[
            styles.toastCard,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError
          ]}>
            {toast.type === 'success' ? (
              <CheckCircle color={Colors.emerald[400]} size={20} />
            ) : (
              <AlertTriangle color={Colors.rose[500]} size={20} />
            )}
            <View style={{ flex: 1, gap: 1 }}>
              <ThemedText style={{ color: '#ffffff', fontSize: 13 }} type="smallBold">
                {toast.text}
              </ThemedText>
              {toast.subtext ? (
                <ThemedText style={{ color: '#94a3b8', fontSize: 11 }} type="small">
                  {toast.subtext}
                </ThemedText>
              ) : null}
            </View>
          </View>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} keyboardShouldPersistTaps="handled">
          
          {/* 1. The Avatar Native Feature */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={handlePickAvatar}
              activeOpacity={0.9}
              style={styles.avatarWrapper}
            >
              {user?.avatar_uri ? (
                <Image source={{ uri: user.avatar_uri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <ThemedText style={styles.avatarFallbackText} type="title">
                    {initials}
                  </ThemedText>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Camera color="#ffffff" size={14} />
              </View>
            </TouchableOpacity>
            <ThemedText style={{ color: '#ffffff', marginTop: 12 }} type="smallBold">
              {form.full_name || 'Dr. Medical Student'}
            </ThemedText>
            <ThemedText style={{ color: '#64748b', fontSize: 11 }} type="small">
              {user?.email}
            </ThemedText>
          </View>

          {/* 2. Profile Details Card (Replicating the Web) */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeader}>
              <UserIcon color={Colors.emerald[400]} size={18} />
              <ThemedText style={styles.cardTitle} type="smallBold">Medical Profile</ThemedText>
            </View>

            {/* Input: Full Name */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} type="small">Full Name</ThemedText>
              <TextInput
                value={form.full_name}
                onChangeText={(val) => setForm(prev => ({ ...prev, full_name: val }))}
                placeholder="Enter your full name"
                placeholderTextColor="#475569"
                style={styles.inputField}
              />
            </View>

            {/* Input: University (Custom Modal Select) */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} type="small">University</ThemedText>
              <TouchableOpacity
                onPress={() => setUniModalVisible(true)}
                activeOpacity={0.8}
                style={styles.selectorField}
              >
                <ThemedText
                  style={[
                    styles.selectorText,
                    !form.university && { color: '#475569' }
                  ]}
                  type="small"
                >
                  {form.university || 'Select your medical university'}
                </ThemedText>
                <ChevronDown color="#94a3b8" size={16} />
              </TouchableOpacity>
            </View>

            {/* Input: Study Year (Horizontal Grid) */}
            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <ThemedText style={styles.inputLabel} type="small">Study Year</ThemedText>
                {form.study_year ? (
                  <TouchableOpacity
                    onPress={() => setForm(prev => ({ ...prev, study_year: '' }))}
                  >
                    <ThemedText style={styles.clearSelectionText} type="small">Clear</ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ThemedText style={styles.inputHelper} type="small">
                Your dashboard will filter modules relevant to this clinical year.
              </ThemedText>
              <View style={styles.yearGrid}>
                {['1', '2', '3', '4', '5'].map((y) => {
                  const isSelected = form.study_year === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      onPress={() => setForm(prev => ({ ...prev, study_year: y }))}
                      activeOpacity={0.8}
                      style={[
                        styles.yearBtn,
                        isSelected && styles.yearBtnActive
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.yearBtnText,
                          isSelected && styles.yearBtnTextActive
                        ]}
                        type="smallBold"
                      >
                        Y{y}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Switch: Anonymous Mode */}
            <View style={styles.anonymousRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <ThemedText style={styles.anonTitle} type="smallBold">Anonymous Mode</ThemedText>
                <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">
                  Hide your name from public leaderboards
                </ThemedText>
              </View>
              <Switch
                value={form.is_anonymous}
                onValueChange={(val) => setForm(prev => ({ ...prev, is_anonymous: val }))}
                trackColor={{ false: '#1e293b', true: 'rgba(16, 185, 129, 0.4)' }}
                thumbColor={form.is_anonymous ? Colors.emerald[500] : '#64748b'}
              />
            </View>

            {/* Save Profile Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              activeOpacity={0.85}
              disabled={savingProfile}
              style={[styles.actionBtn, { backgroundColor: Colors.emerald[500] }]}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save color="#ffffff" size={16} />
                  <ThemedText style={styles.actionBtnText} type="smallBold">Save Profile</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 3. Security Card (Replicating the Web) */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeader}>
              <Lock color={Colors.orange[400]} size={18} />
              <ThemedText style={styles.cardTitle} type="smallBold">Change Password</ThemedText>
            </View>

            {/* Input: Current Password */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} type="small">Current Password</ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={passwordForm.current_password}
                  onChangeText={(val) => setPasswordForm(prev => ({ ...prev, current_password: val }))}
                  placeholder="Enter your current password"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showCurrentPass}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  activeOpacity={0.8}
                  style={styles.eyeBtn}
                >
                  {showCurrentPass ? (
                    <EyeOff color="#94a3b8" size={16} />
                  ) : (
                    <Eye color="#94a3b8" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Input: New Password */}
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} type="small">New Password</ThemedText>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={passwordForm.new_password}
                  onChangeText={(val) => setPasswordForm(prev => ({ ...prev, new_password: val }))}
                  placeholder="Enter your new password"
                  placeholderTextColor="#475569"
                  secureTextEntry={!showNewPass}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPass(!showNewPass)}
                  activeOpacity={0.8}
                  style={styles.eyeBtn}
                >
                  {showNewPass ? (
                    <EyeOff color="#94a3b8" size={16} />
                  ) : (
                    <Eye color="#94a3b8" size={16} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Update Password Button */}
            <TouchableOpacity
              onPress={handleSavePassword}
              activeOpacity={0.85}
              disabled={changingPassword}
              style={[styles.actionBtn, styles.securityBtn]}
            >
              {changingPassword ? (
                <ActivityIndicator size="small" color="#60a5fa" />
              ) : (
                <>
                  <KeyRound color="#60a5fa" size={16} />
                  <ThemedText style={[styles.actionBtnText, { color: '#60a5fa' }]} type="smallBold">
                    Update Password
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* University Searchable Bottom Sheet Modal */}
      <Modal
        visible={uniModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUniModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={{ color: '#ffffff' }} type="smallBold">Select University</ThemedText>
              <TouchableOpacity onPress={() => setUniModalVisible(false)}>
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>

            {/* Search Input Bar */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search medical schools..."
              placeholderTextColor="#475569"
              style={styles.searchBar}
            />

            {universities.length === 0 ? (
              <ActivityIndicator size="small" color={Colors.emerald[500]} style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={filteredUnis}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const isSelected = form.university === item.name;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalOption,
                        isSelected && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        setForm(prev => ({ ...prev, university: item.name }));
                        setSearchQuery('');
                        setUniModalVisible(false);
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.modalOptionText,
                          isSelected && { color: Colors.emerald[400] }
                        ]}
                        type="small"
                      >
                        {item.name}
                      </ThemedText>
                      {isSelected && <Check color={Colors.emerald[500]} size={16} />}
                    </TouchableOpacity>
                  );
                }}
                style={{ maxHeight: 280 }}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <ThemedText style={{ color: '#64748b' }} type="small">No universities found.</ThemedText>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // navy-955
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  /* Floating Toast styling */
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 24,
    left: 16,
    right: 16,
    zIndex: 99999,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a', // navy-900
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  toastSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toastError: {
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  /* Avatar styling */
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.emerald[500],
  },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.emerald[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#020617',
  },
  /* Glass Cards */
  glassCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    paddingBottom: 10,
    marginBottom: 4,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 14,
  },
  /* Input Fields */
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 12,
  },
  inputHelper: {
    color: '#64748b',
    fontSize: 10.5,
    marginTop: -2,
    marginBottom: 4,
    lineHeight: 14,
  },
  clearSelectionText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
  },
  inputField: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    height: 48,
    color: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 13,
  },
  selectorField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  selectorText: {
    color: '#ffffff',
    fontSize: 13,
  },
  /* Study Year Grid */
  yearGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  yearBtn: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearBtnActive: {
    backgroundColor: Colors.emerald[500],
    borderColor: Colors.emerald[500],
  },
  yearBtnText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  yearBtnTextActive: {
    color: '#ffffff',
  },
  /* Switch row */
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
  },
  anonTitle: {
    color: '#ffffff',
    fontSize: 12.5,
  },
  /* Actions buttons */
  actionBtn: {
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
  },
  securityBtn: {
    backgroundColor: 'rgba(96, 165, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  /* Passwords inputs */
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    height: 48,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  /* Bottom sheet dropdown */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    height: 42,
    color: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 8,
  },
  modalOptionText: {
    color: '#cbd5e1',
  },
});
