// Public API of the design-system module — see 02_Specification/module-contracts/design-system.md.

// Hooks
export { useScaleOnPress, useReduceMotion } from './hooks';
export type { UseScaleOnPressResult } from './hooks';

// Anchored popover primitive (shared math between NumericKeypadHost
// and RunwayConditionPicker — see ADR-0018 § UI Layout).
export { AnchoredPopoverHost, computeAnchoredPosition } from './anchored-popover';
export type {
  AnchoredPopoverHostProps,
  AnchorRect,
  PopoverPosition,
  PopoverSize,
} from './anchored-popover';

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
  KeyboardDismissView,
  // Feedback
  Disclaimer,
  ResultPanel,
  EmptyState,
  ErrorState,
  // Navigation
  BackButton,
  NavPills,
  ScreenHeader,
  // Overlays
  BottomSheet,
  BottomSheetOption,
  NumericKeypad,
  NumericKeypadProvider,
  NumericKeypadHost,
  useNumericKeypad,
  useNumericKeypadDockOffset,
  // Settings/About list rows
  NavigableSettingsRow,
  ToggleSettingsRow,
  InfoSettingsRow,
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
  NumericInputSize,
  SegmentedControlOption,
  SegmentedControlProps,
  SegmentedControlSize,
  ToggleProps,
  ButtonProps,
  ButtonVariant,
  KeyboardDismissViewProps,
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
  NavPillsSizing,
  ScreenHeaderProps,
  // Overlays
  BottomSheetProps,
  BottomSheetOptionProps,
  NumericKeypadProps,
  NumericKeypadKey,
  NumericKeypadDigit,
  UseNumericKeypadArgs,
  UseNumericKeypadResult,
  // Settings/About list rows
  NavigableSettingsRowProps,
  NavigableSettingsRowValueColor,
  ToggleSettingsRowProps,
  InfoSettingsRowProps,
} from './components';
