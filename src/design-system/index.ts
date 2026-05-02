// Public API of the design-system module — see 02_Specification/module-contracts/design-system.md.

// Tokens
export { tokens } from './tokens';
export type {
  BreakpointToken,
  ColorPalette,
  ColorToken,
  ColorTokens,
  RadiusToken,
  ShadowToken,
  SpacingToken,
  TypographyToken,
  TypographyVariant,
} from './tokens';

// Components (re-exported through ./components for organisation)
export {
  // Layout
  Screen,
  Stack,
  Row,
  Card,
  // Text
  Text,
  MonoText,
  // Inputs
  NumericInput,
  SegmentedControl,
  Toggle,
  Button,
  // Feedback
  Disclaimer,
  ResultPanel,
  EmptyState,
  ErrorState,
  // Navigation
  BackButton,
  NavPills,
} from './components';

export type {
  // Layout
  ScreenProps,
  StackProps,
  RowProps,
  CardProps,
  // Text
  TextProps,
  TextVariant,
  MonoTextProps,
  // Inputs
  NumericInputProps,
  SegmentedControlOption,
  SegmentedControlProps,
  ToggleProps,
  ButtonProps,
  ButtonVariant,
  // Feedback
  DisclaimerProps,
  ResultPanelMetaItem,
  ResultPanelProps,
  ResultPanelState,
  EmptyStateProps,
  ErrorStateProps,
  // Navigation
  BackButtonProps,
  NavPillsItem,
  NavPillsProps,
} from './components';
