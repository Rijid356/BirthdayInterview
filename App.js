import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from './src/utils/theme';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import AddChildScreen from './src/screens/AddChildScreen';
import ChildProfileScreen from './src/screens/ChildProfileScreen';
import InterviewScreen from './src/screens/InterviewScreen';
import InterviewReviewScreen from './src/screens/InterviewReviewScreen';
import YearCompareScreen from './src/screens/YearCompareScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerTitleStyle: { fontWeight: '600', color: COLORS.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🎂 Birthday Interviews' }}
        />
        <Stack.Screen
          name="AddChild"
          component={AddChildScreen}
          options={{ title: 'Add Child' }}
        />
        <Stack.Screen
          name="ChildProfile"
          component={ChildProfileScreen}
          options={{ title: 'Profile' }}
        />
        <Stack.Screen
          name="Interview"
          component={InterviewScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="InterviewReview"
          component={InterviewReviewScreen}
          options={{ title: 'Interview Review' }}
        />
        <Stack.Screen
          name="YearCompare"
          component={YearCompareScreen}
          options={{ title: 'Compare Years' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
