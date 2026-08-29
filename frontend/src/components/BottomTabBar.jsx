import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COLORS = {
  primary: '#407BFF',
  primaryLight: '#EAF1FF',
  inactive: '#9AA5B1',
  white: '#FFFFFF',
};

const ICONS = {
  Home: 'home-sharp',
  nutrition: 'nutrition',
  chatbot: 'chatbubble-ellipses',
  profile: 'person-circle',
};

const LABELS = {
  Home: 'Accueil',
  nutrition: 'Nutrition',
  chatbot: 'Chatbot',
  profile: 'Profil',
};

export default function BottomTabBar({ state, descriptors, navigation }) {
  useEffect(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')
    );
  }, [state.index]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const iconName = ICONS[route.name] || 'ellipse';
          const label = LABELS[route.name] || route.name;

          const onPress = () => {
            LayoutAnimation.configureNext(
              LayoutAnimation.create(220, 'easeInEaseOut', 'opacity')
            );
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.tabActive]}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? COLORS.white : COLORS.inactive}
              />
              {isFocused && <Text style={styles.label}>{label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: COLORS.white },
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    flex: 1,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    flex: 1.6,
  },
  label: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});