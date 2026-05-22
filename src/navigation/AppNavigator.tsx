// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, BookOpen, History, User, Users } from 'lucide-react-native';
import { useUIStore } from '../store/useUIStore';
import { themes } from '../theme/colors';
import { translations } from '../theme/translations';

// Import Screens
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { DhikrScreen } from '../screens/DhikrScreen';
import { QazaCalculatorScreen } from '../screens/QazaCalculatorScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { SocialHubScreen } from '../screens/SocialHubScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme, language } = useUIStore();
  const activeTheme = themes[theme];
  const activeLang = language === 'UR' ? 'UR' : 'EN';
  const t = translations[activeLang];

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        tabBarActiveTintColor: '#006c44', // exact secondary/emerald color from UI
        tabBarInactiveTintColor: '#707974', // exact outline variant from UI
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginTop: 2,
        },
        tabBarStyle: {
          backgroundColor: '#fbf9f4', // exact ivory surface color from UI
          borderTopColor: 'rgba(0, 54, 41, 0.06)', // exact borders
          borderTopWidth: 1.5,
          height: 68,
          paddingBottom: 12,
          paddingTop: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 24,
          shadowColor: 'rgba(27, 77, 62, 0.12)',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        headerStyle: {
          backgroundColor: '#fbf9f4',
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#003629', // exact primary deep green
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarLabel: activeLang === 'UR' ? 'ہوم' : 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Dhikr"
        component={DhikrScreen}
        options={{
          headerShown: false,
          tabBarLabel: activeLang === 'UR' ? 'ذکر' : 'Dhikr',
          tabBarIcon: ({ color, size }) => <BookOpen size={size - 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialHubScreen}
        options={{
          headerShown: false,
          tabBarLabel: activeLang === 'UR' ? 'سماجی' : 'Social',
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Qaza"
        component={QazaCalculatorScreen}
        options={{
          headerShown: false,
          tabBarLabel: activeLang === 'UR' ? 'قضاء' : 'Qaza',
          tabBarIcon: ({ color, size }) => <History size={size - 2} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: activeLang === 'UR' ? 'پروفائل' : 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { theme } = useUIStore();
  const activeTheme = themes[theme];

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: activeTheme.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default AppNavigator;

