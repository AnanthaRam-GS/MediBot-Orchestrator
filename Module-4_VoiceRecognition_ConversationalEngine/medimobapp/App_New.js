// ============================================================================
// MEDI ASSIST BOT - MAIN APP WITH NAVIGATION (PHASE 2)
// Landscape-optimized kiosk app with face recognition and appointment booking
// ============================================================================

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { requestAudioPermissions, setupAudioMode } from './utils/audioUtils';

// Import Screens
import FaceRecognitionScreen from './screens/FaceRecognitionScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import ModeSelectionScreen from './screens/ModeSelectionScreen';
import AppointmentBookingScreen from './screens/AppointmentBookingScreen';
import QueryScreen from './screens/QueryScreen';
import ManualAppointmentScreen from './screens/ManualAppointmentScreen';
import QueueStatusScreen from './screens/QueueStatusScreen';
import RegistrationScreen from './screens/RegistrationScreen';

// Import Theme
import { COLORS } from './styles/theme';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialize audio permissions and mode on app start
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await requestAudioPermissions();
      await setupAudioMode();
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <PaperProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="FaceRecognition"
            screenOptions={{
              headerStyle: {
                backgroundColor: COLORS.primary,
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 20,
              },
              headerShown: true,
              gestureEnabled: false, // Disable swipe back for kiosk mode
            }}
          >
            {/* Face Recognition - Entry Point */}
            <Stack.Screen
              name="FaceRecognition"
              component={FaceRecognitionScreen}
              options={{
                title: '🏥 Medi Assist - Check In',
                headerLeft: () => null, // No back button on home screen
              }}
            />

            {/* Welcome Screen */}
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{
                title: 'Welcome',
                headerLeft: () => null,
              }}
            />

            {/* Registration Screen */}
            <Stack.Screen
              name="Registration"
              component={RegistrationScreen}
              options={{
                title: '📝 New Patient Registration',
              }}
            />

            {/* Mode Selection */}
            <Stack.Screen
              name="ModeSelection"
              component={ModeSelectionScreen}
              options={{
                title: 'Select Service',
              }}
            />

            {/* Appointment Booking (Voice) */}
            <Stack.Screen
              name="AppointmentBooking"
              component={AppointmentBookingScreen}
              options={{
                title: '📅 Book Appointment',
              }}
            />

            {/* Query Screen (Voice Assistant) */}
            <Stack.Screen
              name="Query"
              component={QueryScreen}
              options={{
                title: '💬 Ask a Question',
              }}
            />

            {/* Manual Appointment Form */}
            <Stack.Screen
              name="ManualAppointment"
              component={ManualAppointmentScreen}
              options={{
                title: '📝 Appointment Form',
              }}
            />

            {/* Queue Status */}
            <Stack.Screen
              name="QueueStatus"
              component={QueueStatusScreen}
              options={{
                title: '📋 Queue Status',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
