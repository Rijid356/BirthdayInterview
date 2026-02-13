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
import BalloonRunCaptureScreen from './src/screens/BalloonRunCaptureScreen';
import BalloonRunViewScreen from './src/screens/BalloonRunViewScreen';
import BirthdayGalleryScreen from './src/screens/BirthdayGalleryScreen';
import YearDetailScreen from './src/screens/YearDetailScreen';

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
          options={{ title: '🎂 git-bigger' }}
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
          name="BalloonRunCapture"
          component={BalloonRunCaptureScreen}
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="BalloonRunView"
          component={BalloonRunViewScreen}
          options={{ title: 'Balloon Run' }}
        />
        <Stack.Screen
          name="YearDetail"
          component={YearDetailScreen}
          options={({ route }) => ({ title: String(route.params.year) })}
        />
        <Stack.Screen
          name="BirthdayGallery"
          component={BirthdayGalleryScreen}
          options={{ title: 'Birthday Media' }}
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
