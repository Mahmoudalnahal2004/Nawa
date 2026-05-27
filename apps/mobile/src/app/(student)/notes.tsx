import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, TextInput } from 'react-native';
import { StickyNote, Trash2, Clock, BookOpen, ExternalLink } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import api from '../../lib/api';
import { ThemedText } from '@/components/themed-text';

interface NoteItem {
  id: number;
  question_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  question_text: string;
}

export default function NotesScreen() {
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data.items || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDeleteNote = (noteId: number) => {
    Alert.alert(
      'Delete Study Note',
      'Are you sure you want to permanently delete this study note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/notes/${noteId}`);
              setNotes(prev => prev.filter(n => n.id !== noteId));
              Alert.alert('Note Deleted', 'Your personal note has been deleted.');
            } catch (err) {
              console.error('Failed to delete note:', err);
              Alert.alert('Error', 'Unable to delete note at this time.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.emerald[500]} />
          <ThemedText style={{ color: '#94a3b8', marginTop: 12 }} type="small">Loading your study notepad...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Quick Header */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ gap: 2 }}>
            <ThemedText style={{ color: '#ffffff' }} type="subtitle">My Clinical Notes</ThemedText>
            <ThemedText style={{ color: '#94a3b8' }} type="small">Review key clinical hooks and facts you've saved</ThemedText>
          </View>
        </View>

        {notes.length === 0 ? (
          <View style={styles.emptyCard}>
            <StickyNote color={Colors.slate[400]} size={36} style={{ marginBottom: 12 }} />
            <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
              No Saved Notes Found
            </ThemedText>
            <ThemedText style={{ color: '#94a3b8', textAlign: 'center', fontSize: 11, marginTop: 4 }} type="small">
              During any practice quiz, toggle the Notes section to save personal high-yield insights!
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {notes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              return (
                <View key={note.id} style={styles.noteCard}>
                  {/* Attached Question Prompt Snippet */}
                  <View style={styles.questionSection}>
                    <View style={styles.questionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <BookOpen color={Colors.emerald[400]} size={12} />
                        <ThemedText style={{ color: Colors.emerald[400], fontSize: 10, fontWeight: '700' }} type="small">
                          QUESTION ID: #{note.question_id}
                        </ThemedText>
                      </View>
                      
                      <TouchableOpacity
                        onPress={() => handleDeleteNote(note.id)}
                        activeOpacity={0.8}
                        style={styles.deleteActionBtn}
                      >
                        <Trash2 color={Colors.rose[500]} size={14} />
                      </TouchableOpacity>
                    </View>
                    
                    <ThemedText style={styles.questionText} type="small" numberOfLines={isExpanded ? undefined : 2}>
                      {note.question_text}
                    </ThemedText>
                  </View>

                  {/* Saved Note Text Area */}
                  <View style={styles.noteBody}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <StickyNote color="#cbd5e1" size={14} />
                      <ThemedText style={{ color: '#ffffff', fontSize: 13 }} type="smallBold">My Insight</ThemedText>
                    </View>
                    
                    <ThemedText style={styles.noteText} type="default">
                      {note.content}
                    </ThemedText>
                  </View>

                  {/* Card Footer details */}
                  <View style={styles.cardFooter}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock color="#64748b" size={10} />
                      <ThemedText style={{ color: '#64748b', fontSize: 10 }} type="small">
                        Saved: {new Date(note.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </ThemedText>
                    </View>

                    <TouchableOpacity
                      onPress={() => setExpandedNoteId(isExpanded ? null : note.id)}
                      activeOpacity={0.8}
                    >
                      <ThemedText style={styles.expandActionText} type="small">
                        {isExpanded ? 'Collapse Vignette' : 'View Full Vignette'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
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
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    padding: 40,
    alignItems: 'center',
  },
  noteCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 18,
    overflow: 'hidden',
  },
  questionSection: {
    backgroundColor: '#020617',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    gap: 6,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteActionBtn: {
    padding: 4,
  },
  questionText: {
    color: '#94a3b8',
    lineHeight: 18,
  },
  noteBody: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  noteText: {
    color: '#cbd5e1',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.2)',
  },
  expandActionText: {
    color: Colors.emerald[400],
    fontWeight: '600',
  },
});
