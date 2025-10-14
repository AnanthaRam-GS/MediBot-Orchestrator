// ============================================================================
// MEDI ASSIST BOT - THEME & STYLES (LANDSCAPE OPTIMIZED)
// ============================================================================

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Enhanced Medical Theme with Gradients
  primary: '#1565C0',        // Deep Blue
  primaryDark: '#0D47A1',
  primaryLight: '#42A5F5',
  primaryGradient: ['#1565C0', '#1976D2', '#1E88E5'],
  
  // Secondary - Medical Green
  secondary: '#2E7D32',      // Medical Green
  secondaryDark: '#1B5E20',
  secondaryLight: '#66BB6A',
  secondaryGradient: ['#2E7D32', '#388E3C', '#4CAF50'],
  
  // Emergency - Red with gradient
  emergency: '#C62828',      // Deep Red
  emergencyDark: '#B71C1C',
  emergencyLight: '#EF5350',
  emergencyGradient: ['#C62828', '#D32F2F', '#F44336'],
  
  // Warning/Info
  warning: '#F57C00',        // Orange
  warningGradient: ['#F57C00', '#FF9800', '#FFB74D'],
  info: '#0277BD',          // Info Blue
  infoGradient: ['#0277BD', '#0288D1', '#03DAC6'],
  
  // Background - Modern gradient backgrounds
  background: '#FAFAFA',
  backgroundGradient: ['#FAFAFA', '#F5F5F5'],
  cardBackground: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
  
  // Text - Enhanced readability
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#FFFFFF',
  textAccent: '#1565C0',
  
  // Status with better contrast
  success: '#2E7D32',
  successLight: '#C8E6C9',
  error: '#C62828',
  errorLight: '#FFCDD2',
  warning: '#F57C00',
  warningLight: '#FFE0B2',
  disabled: '#BDBDBD',
  
  // Border - Subtle and modern
  border: '#E8E8E8',
  borderLight: '#F0F0F0',
  borderDark: '#CCCCCC',
  borderAccent: '#1565C0',
  
  // Glass morphism effects
  glassBackground: 'rgba(255, 255, 255, 0.25)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  
  // Component specific spacing
  containerPadding: 20,
  cardPadding: 16,
  sectionSpacing: 24,
  buttonSpacing: 12,
};

export const TYPOGRAPHY = {
  // Font sizes optimized for kiosk/tablet viewing
  heading1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  heading2: { fontSize: 28, fontWeight: '600', lineHeight: 36 },
  heading3: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  heading4: { fontSize: 20, fontWeight: '500', lineHeight: 28 },
  
  body1: { fontSize: 18, fontWeight: '400', lineHeight: 26 },
  body2: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  
  button: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  overline: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 1 },
  
  // Responsive font sizes
  heroTitle: { fontSize: width > 768 ? 36 : 28, fontWeight: '700' },
  cardTitle: { fontSize: width > 768 ? 20 : 18, fontWeight: '600' },
  cardBody: { fontSize: width > 768 ? 16 : 14, fontWeight: '400' },
};

export const LAYOUT = {
  // Screen dimensions
  screenWidth: width,
  screenHeight: height,
  isLandscape: width > height,
  isTablet: width >= 768,
  
  // Responsive breakpoints
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
  },
  
  // Touch targets (optimized for kiosk/tablet)
  touchTarget: {
    minimum: 48,
    comfortable: 56,
    large: 64,
  },
  
  button: {
    height: width > 768 ? 56 : 48,
    heightLarge: width > 768 ? 64 : 56,
    heightSmall: 40,
    borderRadius: 12,
    borderRadiusLarge: 16,
  },
  
  // Cards and containers
  card: {
    borderRadius: 16,
    padding: width > 768 ? 24 : 16,
    margin: 8,
    elevation: 3,
    shadowRadius: 8,
  },
  
  // Container dimensions
  container: {
    maxWidth: 1200,
    padding: width > 768 ? 24 : 16,
    marginHorizontal: 'auto',
  },
  
  // Camera/Face Recognition
  cameraSize: height * 0.6, // 60% of screen height
  
  // Split screen layout (for landscape)
  leftPanelWidth: width * 0.4,
  rightPanelWidth: width * 0.6,
};

export const SHADOWS = {
  // Modern elevated shadows
  none: { elevation: 0, shadowOpacity: 0 },
  
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  
  // Colored shadows for interactive elements
  primary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  
  emergency: {
    shadowColor: COLORS.emergency,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Animation configurations
export const ANIMATIONS = {
  // Timing
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  // Easing
  easing: {
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    easeInOut: 'ease-in-out',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // Scale transforms
  scale: {
    press: 0.96,
    hover: 1.02,
    tap: 0.98,
  },
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 999,
};

// Enhanced Component Styles
export const COMPONENT_STYLES = {
  // Modern button styles
  button: {
    primary: {
      backgroundColor: COLORS.primary,
      borderRadius: LAYOUT.button.borderRadius,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: LAYOUT.button.height,
      ...SHADOWS.medium,
    },
    
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: COLORS.primary,
      borderRadius: LAYOUT.button.borderRadius,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: LAYOUT.button.height,
    },
    
    emergency: {
      backgroundColor: COLORS.emergency,
      borderRadius: LAYOUT.button.borderRadius,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: LAYOUT.button.height,
      ...SHADOWS.emergency,
    },
    
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: LAYOUT.button.borderRadius,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      minHeight: LAYOUT.button.height,
    },
  },
  
  // Modern card styles
  card: {
    primary: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: LAYOUT.card.borderRadius,
      padding: LAYOUT.card.padding,
      margin: LAYOUT.card.margin,
      ...SHADOWS.medium,
    },
    
    elevated: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: LAYOUT.card.borderRadius,
      padding: LAYOUT.card.padding,
      margin: LAYOUT.card.margin,
      ...SHADOWS.large,
    },
    
    glass: {
      backgroundColor: COLORS.glassBackground,
      borderRadius: LAYOUT.card.borderRadius,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      padding: LAYOUT.card.padding,
      margin: LAYOUT.card.margin,
      ...SHADOWS.subtle,
    },
  },
  
  // Input styles
  input: {
    container: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: LAYOUT.button.borderRadius,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      minHeight: LAYOUT.button.height,
      ...SHADOWS.subtle,
    },
    
    focused: {
      borderColor: COLORS.primary,
      borderWidth: 2,
      ...SHADOWS.small,
    },
  },
};

// Common Layout Styles
export const commonStyles = {
  // Screen containers
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  safeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: LAYOUT.container.padding,
    paddingTop: SPACING.lg,
  },
  
  // Responsive layouts
  landscapeRow: {
    flexDirection: width > height ? 'row' : 'column',
    flex: 1,
    gap: SPACING.lg,
  },
  
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.container.padding,
  },
  
  // Sections
  section: {
    marginBottom: SPACING.sectionSpacing,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  
  // Lists and grids
  listContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  
  leftPanel: {
    width: LAYOUT.leftPanelWidth,
    padding: SPACING.xl,
    backgroundColor: COLORS.cardBackground,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  
  rightPanel: {
    width: LAYOUT.rightPanelWidth,
    padding: SPACING.xl,
  },
  
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    ...SHADOWS.medium,
  },
  
  button: {
    height: LAYOUT.button.height,
    borderRadius: LAYOUT.button.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.small,
  },
  
  buttonLarge: {
    height: LAYOUT.button.heightLarge,
    borderRadius: LAYOUT.button.borderRadiusLarge,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    ...SHADOWS.medium,
  },
  
  buttonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textLight,
  },
  
  buttonTextLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textLight,
  },
  
  title: {
    ...TYPOGRAPHY.heading2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  
  subtitle: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  
  text: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textPrimary,
  },
  
  textLarge: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
  },
  
  emergencyButton: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.emergency,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    zIndex: 1000,
  },
};

// Create FONT_SIZES for backward compatibility
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export default {
  COLORS,
  SPACING,
  FONT_SIZES,
  TYPOGRAPHY,
  LAYOUT,
  SHADOWS,
  BORDER_RADIUS,
  COMPONENT_STYLES,
  ANIMATIONS,
  commonStyles,
};
